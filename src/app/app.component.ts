import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, of, switchMap, throwError } from 'rxjs';
import { contenidoSeccionContacto } from './content/contact.content';
import { contenidoHero } from './content/hero.content';
import { contenidoNavegacion } from './content/navigation.content';
import { contenidoSeccionProductos } from './content/products.content';
import { contenidoSeccionCotizacion } from './content/quote.content';
import { contenidoSeccionServicios } from './content/services.content';
import { contenidoSeccionConfianza } from './content/trust.content';
import { SiteApiService, type ApiProductDto, type ContactLeadRequest, type QuoteDetailRequest } from './site-api.service';
import { siteConfig, type ProductCategory, type ProductConfig, type SiteThemeName } from './site.config';

type Product = {
  id?: number;
  image: string;
  flavor: string;
  description: string;
  price: number;
  category: ProductCategory;
};

type QuoteProduct = Product & {
  quantity: number | null;
};

type RequestState = 'idle' | 'loading' | 'success' | 'error';

type ApiConnectionStatus = 'idle' | 'checking' | 'success' | 'error';

type ApiConnectionDiagnostic = {
  status: ApiConnectionStatus;
  title: string;
  summary: string;
  details: string[];
};

type ContactFormModel = {
  nombre: string;
  email: string;
  telefono: string;
  aceptaPromociones: boolean;
  pregunta: string;
};

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly api = inject(SiteApiService);
  private readonly document = inject(DOCUMENT);
  private readonly blockedQuoteKeys = new Set(['-', '+', 'e', 'E', '.', ',']);
  private readonly quoteDateFormatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  private readonly priceFormatter = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  readonly config = siteConfig;
  readonly themes = this.config.theme.themes;
  readonly navegacion = contenidoNavegacion;
  readonly seccionHero = contenidoHero;
  readonly seccionConfianza = contenidoSeccionConfianza;
  readonly seccionProductos = contenidoSeccionProductos;
  readonly seccionServicios = contenidoSeccionServicios;
  readonly seccionContacto = contenidoSeccionContacto;
  readonly seccionCotizacion = contenidoSeccionCotizacion;

  readonly brand = this.config.companyName;

  readonly contact = {
    person: this.config.contactName,
    email: this.config.contactEmail,
    whatsappNumber: this.config.whatsappNumber
  };

  products: Product[] = this.buildCatalogProducts(this.config.products);

  quoteProducts: QuoteProduct[] = this.createQuoteProducts(this.products);

  productsLoading = false;

  productsError = '';

  apiConnectionDiagnostic: ApiConnectionDiagnostic = {
    status: 'idle',
    title: 'Diagnóstico de API',
    summary: '',
    details: []
  };

  productsLoadedFromApi = false;

  quoteRequestState: RequestState = 'idle';

  quoteRequestMessage = '';

  quoteCustomerName = '';

  quoteDeliveryDate = '';

  contactRequestState: RequestState = 'idle';

  contactRequestMessage = '';

  contactForm: ContactFormModel = {
    nombre: '',
    email: '',
    telefono: '',
    aceptaPromociones: false,
    pregunta: ''
  };

  readonly pilaresConfianza = this.seccionConfianza.pilares;

  readonly servicios = this.seccionServicios.servicios;

  quoteDelivery = true;

  mobileMenuOpen = false;

  currentTheme: SiteThemeName = this.config.theme.defaultTheme;

  constructor() {
    this.applyTheme(this.currentTheme);
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  get currentThemeLabel(): string {
    return this.themes[this.currentTheme].label;
  }

  get nextTheme(): SiteThemeName {
    return this.currentTheme === 'oscuro' ? 'clasico' : 'oscuro';
  }

  get themeToggleAriaLabel(): string {
    return `Cambiar al tema ${this.themes[this.nextTheme].label.toLowerCase()}`;
  }

  get featuredProduct(): Product {
    return this.products[6] ?? this.products[0];
  }

  get selectedQuoteProducts(): QuoteProduct[] {
    return this.quoteProducts.filter((product) => (product.quantity ?? 0) > 0);
  }

  get saltyQuoteProducts(): QuoteProduct[] {
    return this.quoteProducts.filter((product) => product.category === 'salada');
  }

  get sweetQuoteProducts(): QuoteProduct[] {
    return this.quoteProducts.filter((product) => product.category === 'dulce');
  }

  get mixedQuoteProducts(): QuoteProduct[] {
    return this.quoteProducts.filter((product) => product.category === 'dulce/salada');
  }

  get totalQuoteQuantity(): number {
    return this.selectedQuoteProducts.reduce((total, product) => total + (product.quantity ?? 0), 0);
  }

  get saltySubtotal(): number {
    return this.selectedQuoteProducts
      .filter((product) => product.category === 'salada')
      .reduce((total, product) => total + this.getQuoteLineTotal(product), 0);
  }

  get sweetSubtotal(): number {
    return this.selectedQuoteProducts
      .filter((product) => product.category === 'dulce')
      .reduce((total, product) => total + this.getQuoteLineTotal(product), 0);
  }

  get mixedSubtotal(): number {
    return this.selectedQuoteProducts
      .filter((product) => product.category === 'dulce/salada')
      .reduce((total, product) => total + this.getQuoteLineTotal(product), 0);
  }

  get subtotal(): number {
    return this.saltySubtotal + this.sweetSubtotal + this.mixedSubtotal;
  }

  get deliveryFee(): number {
    return this.quoteDelivery ? 0 : 0;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  get canSubmitQuoteRequest(): boolean {
    return this.selectedQuoteProducts.length > 0
      && this.quoteRequestState !== 'loading'
      && this.isQuoteDeliveryDateValid
      && this.productsLoadedFromApi;
  }

  get isQuoteDeliveryDateValid(): boolean {
    return this.quoteDeliveryDate.trim().length === 0 || this.resolveQuoteDeliveryDate() !== null;
  }

  get isQuoteDeliveryDateInPast(): boolean {
    const normalizedDate = this.quoteDeliveryDate.trim();

    return /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) && normalizedDate < this.minQuoteDeliveryDate;
  }

  get minQuoteDeliveryDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  get quoteDeliveryDateWarningMessage(): string {
    return this.isQuoteDeliveryDateInPast
      ? this.seccionCotizacion.etiquetasResumen.advertenciaFechaCotizacion
      : '';
  }

  get isContactFormValid(): boolean {
    return this.contactForm.nombre.trim().length > 0
      && this.contactForm.email.trim().length > 0
      && this.contactForm.telefono.trim().length > 0;
  }

  get contactWhatsappLink(): string {
    return this.buildWhatsappLink(this.seccionContacto.mensajeWhatsapp);
  }

  get apiBaseUrl(): string {
    return this.api.apiBaseUrl;
  }

  get apiDiagnosticsEnabled(): boolean {
    return this.config.apiDiagnosticsEnabled;
  }

  get productsEndpoint(): string {
    return this.api.productsEndpoint;
  }

  openContactWhatsapp(event: Event): void {
    event.preventDefault();
    this.openWhatsappMessage(this.seccionContacto.mensajeWhatsapp);
  }

  retryApiConnection(): void {
    this.loadProducts();
  }

  get quoteRequestText(): string {
    const selectedFlavors = this.selectedQuoteProducts.length > 0
      ? this.selectedQuoteProducts.map((product) => this.buildQuoteProductLine(product)).join('\n')
      : this.seccionCotizacion.mensajeSolicitud.mensajeSinSabores;

    const customerName = this.quoteCustomerName.trim();
    const quoteDeliveryDate = this.resolveQuoteDeliveryDate();
    const quoteDetails = [
      this.seccionCotizacion.mensajeSolicitud.introduccion,
      ...(customerName ? [`${this.seccionCotizacion.mensajeSolicitud.etiquetaNombre}: ${customerName}`] : []),
      ...(quoteDeliveryDate ? [`${this.seccionCotizacion.mensajeSolicitud.etiquetaFechaEntregaEstimada}: ${this.formatQuoteDeliveryDate(quoteDeliveryDate)}`] : []),
      this.seccionCotizacion.mensajeSolicitud.etiquetaSabores,
      selectedFlavors,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaTotalPiezas}: ${this.totalQuoteQuantity}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaSubtotalSaladas}: ${this.formatPrice(this.saltySubtotal)}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaSubtotalDulces}: ${this.formatPrice(this.sweetSubtotal)}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaSubtotalMixtas}: ${this.formatPrice(this.mixedSubtotal)}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaEntrega}: ${this.quoteDelivery ? this.seccionCotizacion.mensajeSolicitud.etiquetaEntregaSi : this.seccionCotizacion.mensajeSolicitud.etiquetaEntregaNo}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaTotalEstimado}: ${this.formatPrice(this.total)}`
    ].join('\n');

    return quoteDetails;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleTheme(): void {
    this.setTheme(this.nextTheme);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  setTheme(theme: SiteThemeName): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
  }

  getCategoryLabel(category: ProductCategory): string {
    if (category === 'dulce') {
      return 'Dulce';
    }

    if (category === 'salada') {
      return 'Salada';
    }

    return 'Dulce/salada';
  }

  getQuoteLineTotal(product: QuoteProduct): number {
    return (product.quantity ?? 0) * product.price;
  }

  formatPrice(value: number): string {
    return `$${this.priceFormatter.format(value)} MXN`;
  }

  normalizeQuantity(product: QuoteProduct): void {
    product.quantity = this.normalizeQuoteValue(product.quantity);
  }

  blockInvalidQuoteKey(event: KeyboardEvent): void {
    if (this.blockedQuoteKeys.has(event.key)) {
      event.preventDefault();
    }
  }

  clearQuote(): void {
    for (const product of this.quoteProducts) {
      product.quantity = null;
    }

    this.quoteDelivery = false;
    this.quoteCustomerName = '';
    this.quoteDeliveryDate = '';
  }

  submitQuoteRequest(): void {
    if (!this.canSubmitQuoteRequest) {
      return;
    }

    this.quoteRequestState = 'loading';
    this.quoteRequestMessage = '';

    this.api.submitWhatsappQuote({
      nombre: this.resolveOptionalQuoteName(),
      cotizacion: this.quoteRequestText,
      ...(this.resolveQuoteDeliveryDate() ? { fechaEntregaEstimada: this.resolveQuoteDeliveryDate()! } : {})
    })
      .pipe(
        switchMap((response) => {
          const pedidoId = this.resolveNumericId(response.id);

          if (pedidoId == null) {
            this.api.registerApiIssue({
              origen: 'checkout',
              metodo: 'POST',
              codigo: 'INVALID_WHATSAPP_QUOTE_ID',
              mensaje: 'La API devolvio una cotizacion sin id valido.',
              detalle: 'La respuesta de /contactos-whats no contiene un id numerico utilizable para registrar el detalle.',
              contexto: {
                endpoint: `${this.apiBaseUrl}/contactos-whats`,
                response
              }
            });

            return throwError(() => new Error('La API no devolvió un id de cotización válido.'));
          }

          const detailPayloads = this.buildQuoteDetailPayloads(pedidoId);

          if (detailPayloads.length !== this.selectedQuoteProducts.length) {
            this.api.registerApiIssue({
              origen: 'checkout',
              metodo: 'POST',
              codigo: 'INVALID_QUOTE_DETAIL_PAYLOAD',
              mensaje: 'No fue posible construir todos los detalles de la cotizacion.',
              detalle: 'La API devolvio ids incompletos o la configuracion local no pudo asociar todos los productos seleccionados.',
              contexto: {
                endpoint: `${this.apiBaseUrl}/cotizacion-detalle`,
                pedidoId,
                productosSeleccionados: this.selectedQuoteProducts.map((product) => ({
                  flavor: product.flavor,
                  id: product.id,
                  quantity: product.quantity
                })),
                payloadsGenerados: detailPayloads
              }
            });

            return throwError(() => new Error('No todos los productos tienen un id válido para guardar el detalle.'));
          }

          if (detailPayloads.length === 0) {
            return of([]);
          }

          return forkJoin(detailPayloads.map((payload) => this.api.createQuoteDetail(payload)));
        }),
        finalize(() => {
          if (this.quoteRequestState === 'loading') {
            this.quoteRequestState = 'idle';
          }
        })
      )
      .subscribe({
        next: () => {
          this.quoteRequestState = 'success';
          this.quoteRequestMessage = this.seccionCotizacion.mensajeExito;
          this.openWhatsappMessage(this.quoteRequestText);
        },
        error: () => {
          this.quoteRequestState = 'error';
          this.quoteRequestMessage = this.seccionCotizacion.mensajeError;
        }
      });
  }

  submitContactRequest(): void {
    if (!this.isContactFormValid || this.contactRequestState === 'loading') {
      return;
    }

    this.contactRequestState = 'loading';
    this.contactRequestMessage = '';

    this.api.createContact(this.buildContactPayload())
      .pipe(finalize(() => {
        if (this.contactRequestState === 'loading') {
          this.contactRequestState = 'idle';
        }
      }))
      .subscribe({
        next: () => {
          this.contactRequestState = 'success';
          this.contactRequestMessage = this.seccionContacto.formularioContacto.mensajeExito;
          this.contactForm = {
            nombre: '',
            email: '',
            telefono: '',
            aceptaPromociones: false,
            pregunta: ''
          };
        },
        error: () => {
          this.contactRequestState = 'error';
          this.contactRequestMessage = this.seccionContacto.formularioContacto.mensajeError;
        }
      });
  }

  private normalizeQuoteValue(value: number | null): number | null {
    if (value == null) {
      return null;
    }

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    return Math.round(value);
  }

  private resolveOptionalQuoteName(): string | null {
    const normalizedName = this.quoteCustomerName.trim();

    return normalizedName.length > 0 ? normalizedName : null;
  }

  private resolveQuoteDeliveryDate(): string | null {
    const normalizedDate = this.quoteDeliveryDate.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return null;
    }

    const parsedDate = new Date(`${normalizedDate}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    if (normalizedDate < this.minQuoteDeliveryDate) {
      return null;
    }

    return normalizedDate;
  }

  private formatQuoteDeliveryDate(date: string): string {
    return this.quoteDateFormatter.format(new Date(`${date}T00:00:00`));
  }

  private buildQuoteProductLine(product: QuoteProduct): string {
    const quantity = product.quantity ?? 0;

    return `- ${product.flavor}: ${quantity} ${this.getQuotePieceLabel(quantity)}`;
  }

  private getQuotePieceLabel(quantity: number): string {
    return quantity === 1 ? 'pieza' : 'piezas';
  }

  private resolveOptionalContactQuestion(): string | undefined {
    const normalizedQuestion = this.contactForm.pregunta.trim();

    return normalizedQuestion.length > 0 ? normalizedQuestion : undefined;
  }

  private buildContactPayload(): ContactLeadRequest {
    const question = this.resolveOptionalContactQuestion();

    return {
      nombre: this.contactForm.nombre.trim(),
      email: this.contactForm.email.trim(),
      telefono: this.contactForm.telefono.trim(),
      aceptaPromociones: this.contactForm.aceptaPromociones,
      ...(question ? { pregunta: question } : {})
    };
  }

  private openWhatsappMessage(message: string): void {
    const webLink = this.buildWhatsappLink(message);
    window.open(webLink, '_blank', 'noopener');
  }

  private buildWhatsappAppLink(message: string): string {
    return `whatsapp://send?phone=${this.contact.whatsappNumber}&text=${encodeURIComponent(message)}`;
  }

  private buildWhatsappLink(message: string): string {
    return `https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  private applyTheme(theme: SiteThemeName): void {
    const root = this.document.documentElement;

    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme === 'oscuro' ? 'dark' : 'light';
  }

  private loadProducts(): void {
    this.productsLoading = true;
    this.productsError = '';
    this.productsLoadedFromApi = false;
    this.apiConnectionDiagnostic = {
      status: 'checking',
      title: 'Validando conexión con la API',
      summary: 'Probando la carga de productos desde el backend configurado.',
      details: [
        `Base URL configurada: ${this.apiBaseUrl}`,
        `Endpoint probado: ${this.productsEndpoint}`
      ]
    };

    this.api.getProducts()
      .pipe(finalize(() => {
        this.productsLoading = false;
      }))
      .subscribe({
        next: (products) => {
          const mappedProducts = this.mapApiProducts(products);
          const endpointDetails = this.buildProductsEndpointDetails();

          if (mappedProducts.length === 0) {
            this.productsError = this.seccionProductos.mensajeProductosInvalidos;
            this.api.registerApiIssue({
              origen: 'catalogo-productos',
              metodo: 'GET',
              codigo: 'INVALID_PRODUCTS_PAYLOAD',
              mensaje: 'La API respondio con un payload de productos no valido.',
              detalle: 'La respuesta no contiene productos visibles que cumplan con el contrato esperado por el frontend.',
              contexto: {
                endpoint: this.productsEndpoint,
                productosRecibidos: products.length,
                muestra: products.slice(0, 3)
              }
            });
            this.apiConnectionDiagnostic = {
              status: 'error',
              title: 'La API respondió, pero con datos no válidos',
              summary: 'Se recibió una respuesta del backend, pero no se pudieron mapear productos visibles.',
              details: [
                ...endpointDetails,
                'La petición respondió sin error HTTP, así que el problema parece estar en la estructura del payload o en los campos devueltos.'
              ]
            };
            return;
          }

          this.products = mappedProducts;
          this.quoteProducts = this.createQuoteProducts(mappedProducts);
          this.productsLoadedFromApi = true;
          this.apiConnectionDiagnostic = {
            status: 'success',
            title: 'Conexión con la API correcta',
            summary: `La API respondió correctamente y se cargaron ${mappedProducts.length} productos.`,
            details: endpointDetails
          };
        },
        error: (error: unknown) => {
          this.productsError = this.seccionProductos.mensajeProductosNoDisponibles;
          this.apiConnectionDiagnostic = this.buildApiConnectionDiagnostic(error);
        }
      });
  }

  private buildApiConnectionDiagnostic(error: unknown): ApiConnectionDiagnostic {
    const baseDetails = this.buildProductsEndpointDetails();

    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: 'error',
        title: 'Error desconocido al conectar con la API',
        summary: 'La aplicación no pudo clasificar el fallo de conexión.',
        details: [
          ...baseDetails,
          `Detalle recibido: ${this.stringifyUnknownError(error)}`
        ]
      };
    }

    if (error.status === 0) {
      return {
        status: 'error',
        title: 'La API no respondió',
        summary: 'Normalmente esto indica un problema de red, CORS, certificado o una URL inaccesible.',
        details: [
          ...baseDetails,
          'HTTP status: 0',
          `Estado del navegador: ${navigator.onLine ? 'en línea' : 'sin conexión'}`,
          'Causas probables: la variable NG_APP_API_BASE_URL apunta a una URL incorrecta, el backend no admite CORS desde tu dominio de Vercel, o el servidor está caído.'
        ]
      };
    }

    if (error.status === 404) {
      return {
        status: 'error',
        title: 'Endpoint no encontrado en la API',
        summary: 'El backend respondió, pero ninguna de las rutas probadas para productos existe.',
        details: [
          ...baseDetails,
          'HTTP status: 404',
          'Verifica que la base URL termine en /api y que exista la ruta /productos/visibles o /productos.'
        ]
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        status: 'error',
        title: 'La API rechazó la solicitud',
        summary: 'El backend respondió con un error de autorización.',
        details: [
          ...baseDetails,
          `HTTP status: ${error.status}`,
          'Revisa si el backend requiere autenticación, headers específicos o una lista blanca de origen.'
        ]
      };
    }

    if (error.status >= 500) {
      return {
        status: 'error',
        title: 'El backend falló al procesar la solicitud',
        summary: 'La conexión existe, pero el servidor respondió con error interno.',
        details: [
          ...baseDetails,
          `HTTP status: ${error.status}`,
          `Status text: ${error.statusText || 'sin texto de estado'}`
        ]
      };
    }

    return {
      status: 'error',
      title: 'La API respondió con error',
      summary: 'La solicitud llegó al backend, pero fue rechazada o procesada con error.',
      details: [
        ...baseDetails,
        `HTTP status: ${error.status}`,
        `Status text: ${error.statusText || 'sin texto de estado'}`,
        `URL final reportada: ${error.url || this.productsEndpoint}`
      ]
    };
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

  private buildProductsEndpointDetails(): string[] {
    const details = [
      `Base URL configurada: ${this.apiBaseUrl}`,
      `Endpoint principal: ${this.api.primaryProductsEndpoint}`
    ];

    if (this.api.fallbackProductsEndpoint) {
      details.push(`Endpoint alterno: ${this.api.fallbackProductsEndpoint}`);
    }

    details.push(`Endpoint resuelto: ${this.productsEndpoint}`);

    return details;
  }

  private buildCatalogProducts(products: readonly ProductConfig[]): Product[] {
    return products.map((product) => ({ ...product }));
  }

  private createQuoteProducts(products: readonly Product[]): QuoteProduct[] {
    return products.map((product) => ({
      ...product,
      quantity: null
    }));
  }

  private mapApiProducts(products: readonly ApiProductDto[]): Product[] {
    return products
      .filter((product) => this.isApiProductActive(product))
      .map((product) => {
        const flavor = this.resolveFlavor(product);
        const fallback = this.findFallbackProduct(flavor);
        const category = this.resolveCategory(this.resolveRawCategory(product), fallback?.category);

        return {
          id: this.resolveNumericId(product.id),
          flavor: flavor || fallback?.flavor || 'Producto gourmet',
          category,
          description: this.resolveDescription(product) || fallback?.description || 'Producto disponible para cotización inmediata.',
          image: this.resolveImage(this.resolveRawImage(product), fallback?.image, category),
          price: this.resolvePrice(this.resolveRawPrice(product), fallback?.price)
        };
      });
  }

  private isApiProductActive(product: ApiProductDto): boolean {
    return product.activo !== false && product.visible !== false;
  }

  private resolveFlavor(product: ApiProductDto): string {
    return this.readFirstString(product.nombre);
  }

  private resolveRawCategory(product: ApiProductDto): string {
    return this.readFirstString(product.categoria);
  }

  private resolveDescription(product: ApiProductDto): string {
    return this.readFirstString(product.descripcion);
  }

  private resolveRawImage(product: ApiProductDto): string {
    return this.readFirstString(product.imagenUrl);
  }

  private resolveRawPrice(product: ApiProductDto): number | string | undefined {
    return product.precio;
  }

  private buildQuoteDetailPayloads(idPedido: number): QuoteDetailRequest[] {
    return this.selectedQuoteProducts
      .map((product) => {
        if (product.id == null) {
          return undefined;
        }

        return {
          idPedido,
          idProducto: product.id,
          numeroPiezas: product.quantity
        };
      })
      .filter((payload): payload is QuoteDetailRequest => payload !== undefined);
  }

  private resolveNumericId(value: number | string | undefined): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsedValue = Number.parseInt(value.trim(), 10);

      if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }

    return undefined;
  }

  private readFirstString(...values: Array<string | undefined>): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return '';
  }

  private findFallbackProduct(flavor?: string): ProductConfig | undefined {
    const normalizedFlavor = flavor?.trim().toLowerCase();

    if (!normalizedFlavor) {
      return undefined;
    }

    return this.config.products.find((product) => product.flavor.toLowerCase() === normalizedFlavor);
  }

  private resolveCategory(rawCategory?: string, fallback?: ProductCategory): ProductCategory {
    const normalizedCategory = rawCategory?.trim().toLowerCase() ?? '';
    const hasSweetCategory = normalizedCategory.includes('dul') || normalizedCategory.includes('sweet');
    const hasSaltyCategory = normalizedCategory.includes('sal') || normalizedCategory.includes('sav');

    if (normalizedCategory.includes('mixt') || normalizedCategory.includes('ambi') || normalizedCategory.includes('/') || (hasSweetCategory && hasSaltyCategory)) {
      return 'dulce/salada';
    }

    if (hasSweetCategory) {
      return 'dulce';
    }

    if (hasSaltyCategory) {
      return 'salada';
    }

    return fallback ?? 'salada';
  }

  private resolveImage(rawImage?: string, fallbackImage?: string, category?: ProductCategory): string {
    if (rawImage?.trim()) {
      return rawImage.trim();
    }

    if (fallbackImage) {
      return fallbackImage;
    }

    return category === 'dulce' ? 'products/caramelo-clasico.svg' : 'products/queso-chipotle.svg';
  }

  private resolvePrice(rawPrice: number | string | undefined, fallbackPrice?: number): number {
    if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) {
      return rawPrice;
    }

    if (typeof rawPrice === 'string') {
      const parsedPrice = Number.parseFloat(rawPrice);

      if (Number.isFinite(parsedPrice)) {
        return parsedPrice;
      }
    }

    if (typeof fallbackPrice === 'number' && Number.isFinite(fallbackPrice)) {
      return fallbackPrice;
    }

    return 0;
  }
}
