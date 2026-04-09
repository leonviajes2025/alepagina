import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of, switchMap, throwError, tap, shareReplay, finalize, type Observable } from 'rxjs';
import { siteConfig } from './site.config';

export type ApiProductDto = {
  id?: number | string;
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  precio?: number | string;
  imagenUrl?: string;
  activo?: boolean;
  visible?: boolean;
};

export type ContactLeadRequest = {
  nombre: string;
  email: string;
  telefono: string;
  aceptaPromociones: boolean;
  pregunta?: string;
};

export type WhatsappQuoteRequest = {
  nombre: string | null;
  cotizacion: string;
  fechaEntregaEstimada?: string;
};

export type WhatsappQuoteResponse = {
  id?: number | string;
};

export type QuoteDetailRequest = {
  idPedido: number;
  idProducto: number;
  numeroPiezas: number;
};

export type ApiErrorLogRequest = {
  dominio: 'frontend-web';
  origen: string;
  metodo: string;
  codigo: string;
  mensaje: string;
  detalle: string;
  contexto: string;
  fechaOcurrencia: string;
};

export type BotonWhatsRequest = {
  ip?: string | null;
  userAgent?: string;
  deviceType?: string;
  path?: string;
  referrer?: string;
};

type ProductsResponse = unknown;

type ApiRequestLogContext = {
  origen: string;
  metodo: string;
  endpoint: string;
  contexto?: Record<string, unknown>;
};

type ApiIssueLogOptions = {
  origen: string;
  metodo: string;
  codigo: string;
  mensaje: string;
  detalle: string;
  contexto?: unknown;
};

@Injectable({ providedIn: 'root' })
export class SiteApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = siteConfig.apiBaseUrl;
  private readonly logsEndpoint = `${this.baseUrl}/logs-errores`;
  private readonly productEndpoints: readonly string[] = [
    `${this.baseUrl}/productos/visibles`,
    `${this.baseUrl}/productos`
  ];
  private resolvedProductsEndpoint: string = this.productEndpoints[0];
  private productsCache: { data: ApiProductDto[]; timestamp: number } | null = null;
  private productsRequestInFlight: Observable<ApiProductDto[]> | null = null;
  private readonly productsCacheTtlMs = 5 * 60 * 1000; // 5 minutos

  get apiBaseUrl(): string {
	return this.baseUrl;
  }

  get productsEndpoint(): string {
    return this.resolvedProductsEndpoint;
  }

  get primaryProductsEndpoint(): string {
    return this.productEndpoints[0];
  }

  get fallbackProductsEndpoint(): string | null {
    return this.productEndpoints[1] ?? null;
  }

  get usingFallbackProductsEndpoint(): boolean {
    return this.resolvedProductsEndpoint === this.fallbackProductsEndpoint;
  }

  getProducts(): Observable<ApiProductDto[]> {
    // Return cached products if still valid
    if (this.productsCache && (Date.now() - this.productsCache.timestamp) < this.productsCacheTtlMs) {
      return of(this.productsCache.data);
    }

    // If a request is already in flight, return the shared observable
    if (this.productsRequestInFlight) {
      return this.productsRequestInFlight;
    }

    this.resolvedProductsEndpoint = this.primaryProductsEndpoint;

    const fetch$ = this.requestProducts(this.primaryProductsEndpoint).pipe(
      catchError((error: unknown) => {
        if (!this.shouldFallbackProductsEndpoint(error) || this.fallbackProductsEndpoint == null) {
          return this.logHttpErrorAndRethrow(error, {
            origen: 'catalogo-productos',
            metodo: 'GET',
            endpoint: this.primaryProductsEndpoint,
            contexto: {
              endpointPrincipal: this.primaryProductsEndpoint,
              endpointAlterno: this.fallbackProductsEndpoint
            }
          });
        }

        const fallbackEndpoint = this.fallbackProductsEndpoint;

        this.resolvedProductsEndpoint = fallbackEndpoint;

        return this.requestWithErrorLogging(
          {
            origen: 'catalogo-productos',
            metodo: 'GET',
            endpoint: fallbackEndpoint,
            contexto: {
              endpointPrincipal: this.primaryProductsEndpoint,
              endpointAlterno: fallbackEndpoint,
              fallbackActivadoPor404: true
            }
          },
          () => this.requestProducts(fallbackEndpoint)
        );
      }),
      map((response) => this.extractProducts(response)),
      tap((products) => {
        this.productsCache = { data: products, timestamp: Date.now() };
      }),
      finalize(() => {
        this.productsRequestInFlight = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true, windowTime: this.productsCacheTtlMs })
    );

    this.productsRequestInFlight = fetch$;

    return fetch$;
  }

  submitWhatsappQuote(payload: WhatsappQuoteRequest): Observable<WhatsappQuoteResponse> {
    const endpoint = `${this.baseUrl}/contactos-whats`;

    return this.requestWithErrorLogging(
      {
        origen: 'checkout',
        metodo: 'POST',
        endpoint,
        contexto: {
          fase: 'cotizacion-whatsapp'
        }
      },
      () => this.http.post<WhatsappQuoteResponse>(endpoint, payload)
    );
  }

  createQuoteDetail(payload: QuoteDetailRequest): Observable<unknown> {
    const endpoint = `${this.baseUrl}/cotizacion-detalle`;

    return this.requestWithErrorLogging(
      {
        origen: 'checkout',
        metodo: 'POST',
        endpoint,
        contexto: {
          fase: 'cotizacion-detalle'
        }
      },
      () => this.http.post(endpoint, payload)
    );
  }

  createContact(payload: ContactLeadRequest): Observable<unknown> {
    const endpoint = `${this.baseUrl}/contactos`;

    return this.requestWithErrorLogging(
      {
        origen: 'contacto',
        metodo: 'POST',
        endpoint
      },
      () => this.http.post(endpoint, payload)
    );
  }

  registerWhatsappButtonClick(payload: BotonWhatsRequest | undefined): Observable<unknown> {
    const endpoint = `${this.baseUrl}/boton-whats`;

    return this.requestWithErrorLogging(
      {
        origen: 'ui',
        metodo: 'POST',
        endpoint,
        contexto: {
          fase: 'boton-whatsapp'
        }
      },
      () => this.http.post(endpoint, payload ?? {})
    );
  }

  registerApiIssue(options: ApiIssueLogOptions): void {
    this.sendLogEntry(this.buildLogEntry(options)).subscribe();
  }

  private requestProducts(endpoint: string): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(endpoint);
  }

  private requestWithErrorLogging<T>(
    requestContext: ApiRequestLogContext,
    requestFactory: () => Observable<T>
  ): Observable<T> {
    return requestFactory().pipe(
      catchError((error: unknown) => this.logHttpErrorAndRethrow(error, requestContext))
    );
  }

  private logHttpErrorAndRethrow(error: unknown, requestContext: ApiRequestLogContext): Observable<never> {
    if (this.isLogsEndpoint(requestContext.endpoint)) {
      return throwError(() => error);
    }

    return this.sendLogEntry(this.buildHttpErrorLogEntry(error, requestContext)).pipe(
      switchMap(() => throwError(() => error))
    );
  }

  private buildHttpErrorLogEntry(error: unknown, requestContext: ApiRequestLogContext): ApiErrorLogRequest {
    const endpointPath = this.resolveEndpointPath(requestContext.endpoint);

    return this.buildLogEntry({
      origen: requestContext.origen,
      metodo: requestContext.metodo,
      codigo: this.resolveApiErrorCode(error),
      mensaje: `No fue posible completar ${requestContext.metodo} ${endpointPath}.`,
      detalle: this.buildHttpErrorDetail(error),
      contexto: {
        endpoint: requestContext.endpoint,
        origen: requestContext.origen,
        metodo: requestContext.metodo,
        ...requestContext.contexto,
        ...this.buildHttpErrorContext(error)
      }
    });
  }

  private buildLogEntry(options: ApiIssueLogOptions): ApiErrorLogRequest {
    return {
      dominio: 'frontend-web',
      origen: options.origen,
      metodo: options.metodo,
      codigo: options.codigo,
      mensaje: options.mensaje,
      detalle: options.detalle,
      contexto: this.stringifyContext(options.contexto),
      fechaOcurrencia: new Date().toISOString()
    };
  }

  private sendLogEntry(entry: ApiErrorLogRequest): Observable<unknown> {
    return this.http.post(this.logsEndpoint, entry).pipe(
      catchError(() => of(null))
    );
  }

  private isLogsEndpoint(endpoint: string): boolean {
    return endpoint === this.logsEndpoint;
  }

  private resolveApiErrorCode(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'UNKNOWN_API_ERROR';
    }

    const apiCode = this.readErrorCodeCandidate(error.error);

    if (apiCode) {
      return apiCode;
    }

    if (error.status === 0) {
      return 'NETWORK_ERROR';
    }

    return `HTTP_${error.status}`;
  }

  private readErrorCodeCandidate(errorBody: unknown): string | null {
    if (typeof errorBody !== 'object' || errorBody == null) {
      return null;
    }

    const record = errorBody as Record<string, unknown>;

    for (const key of ['codigo', 'code', 'error']) {
      const value = record[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private buildHttpErrorDetail(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return this.stringifyUnknownError(error);
    }

    const detailParts = [
      `status=${error.status}`,
      `statusText=${error.statusText || 'sin-texto'}`,
      `message=${error.message}`
    ];

    const errorBody = this.stringifyErrorBody(error.error);

    if (errorBody) {
      detailParts.push(`body=${errorBody}`);
    }

    return detailParts.join(' | ');
  }

  private buildHttpErrorContext(error: unknown): Record<string, unknown> {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        detalleOriginal: this.stringifyUnknownError(error)
      };
    }

    return {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      errorBody: this.parseErrorBody(error.error)
    };
  }

  private parseErrorBody(errorBody: unknown): unknown {
    if (typeof errorBody === 'string') {
      try {
        return JSON.parse(errorBody);
      } catch {
        return errorBody;
      }
    }

    return errorBody;
  }

  private stringifyErrorBody(errorBody: unknown): string {
    if (errorBody == null) {
      return '';
    }

    if (typeof errorBody === 'string') {
      return errorBody;
    }

    return this.stringifyUnknownError(errorBody);
  }

  private stringifyContext(context: unknown): string {
    if (context == null) {
      return '';
    }

    if (typeof context === 'string') {
      return context;
    }

    return this.stringifyUnknownError(context);
  }

  private resolveEndpointPath(endpoint: string): string {
    return endpoint.startsWith(this.baseUrl)
      ? endpoint.slice(this.baseUrl.length)
      : endpoint;
  }

  private shouldFallbackProductsEndpoint(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private extractProducts(response: ProductsResponse): ApiProductDto[] {
    return this.findProductArray(response);
  }

  private findProductArray(value: unknown, depth = 0): ApiProductDto[] {
    if (depth > 3 || value == null) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is ApiProductDto => this.isProductLike(item));
    }

    if (typeof value !== 'object') {
      return [];
    }

    const record = value as Record<string, unknown>;

    for (const key of ['productos', 'data', 'items', 'results', 'rows', 'content']) {
      const nestedValue = record[key];

      if (Array.isArray(nestedValue)) {
        return nestedValue.filter((item): item is ApiProductDto => this.isProductLike(item));
      }
    }

    for (const nestedValue of Object.values(record)) {
      const nestedProducts = this.findProductArray(nestedValue, depth + 1);

      if (nestedProducts.length > 0) {
        return nestedProducts;
      }
    }

    return [];
  }

  private isProductLike(value: unknown): value is ApiProductDto {
    if (typeof value !== 'object' || value == null) {
      return false;
    }

    const record = value as Record<string, unknown>;

    return [
      record['nombre'],
      record['categoria'],
      record['descripcion'],
      record['precio'],
      record['imagenUrl']
    ].some((candidate) => candidate !== undefined);
  }

  private stringifyUnknownError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'No fue posible serializar el error.';
    }
  }
}