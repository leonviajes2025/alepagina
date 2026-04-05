import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { siteConfig } from './site.config';

export type ApiProductDto = {
  id?: number | string;
  nombre?: string;
  name?: string;
  flavor?: string;
  titulo?: string;
  categoria?: string;
  category?: string;
  tipo?: string;
  descripcion?: string;
  description?: string;
  detalle?: string;
  precio?: number | string;
  price?: number | string;
  imagenUrl?: string;
  image?: string;
  imageUrl?: string;
  imagen?: string;
  activo?: boolean;
  active?: boolean;
  disponible?: boolean;
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
};

export type WhatsappQuoteResponse = {
  id?: number | string;
};

export type QuoteDetailRequest = {
  idPedido: number;
  idProducto: number;
  numeroPiezas: number;
};

type ProductsResponse = unknown;

@Injectable({ providedIn: 'root' })
export class SiteApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = siteConfig.apiBaseUrl;

  getProducts(): Observable<ApiProductDto[]> {
    return this.http
      .get<ProductsResponse>(`${this.baseUrl}/productos/activos`)
      .pipe(map((response) => this.extractProducts(response)));
  }

  submitWhatsappQuote(payload: WhatsappQuoteRequest): Observable<WhatsappQuoteResponse> {
    return this.http.post<WhatsappQuoteResponse>(`${this.baseUrl}/contactos-whats`, payload);
  }

  createQuoteDetail(payload: QuoteDetailRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/cotizacion-detalle`, payload);
  }

  createContact(payload: ContactLeadRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/contactos`, payload);
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
      record['name'],
      record['flavor'],
      record['titulo'],
      record['categoria'],
      record['category'],
      record['descripcion'],
      record['description'],
      record['precio'],
      record['price']
    ].some((candidate) => candidate !== undefined);
  }
}