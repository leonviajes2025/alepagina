import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, of, switchMap, throwError } from 'rxjs';
import { contenidoSeccionContacto } from './content/contact.content';
import { contenidoHero } from './content/hero.content';
import { contenidoIntroduccion } from './content/intro.content';
import { contenidoNavegacion } from './content/navigation.content';
import { contenidoSeccionProductos } from './content/products.content';
import { contenidoSeccionCotizacion } from './content/quote.content';
import { contenidoSeccionServicios } from './content/services.content';
import { contenidoSeccionConfianza } from './content/trust.content';
import { SiteApiService, type ApiProductDto, type ContactLeadRequest, type QuoteDetailRequest } from './site-api.service';
import { siteConfig, type ProductCategory, type ProductConfig } from './site.config';

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
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly api = inject(SiteApiService);
  private readonly blockedQuoteKeys = new Set(['-', '+', 'e', 'E', '.', ',']);
  private readonly quoteDateFormatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  readonly config = siteConfig;
  readonly navegacion = contenidoNavegacion;
  readonly seccionHero = contenidoHero;
  readonly seccionIntroduccion = contenidoIntroduccion;
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

  ngOnInit(): void {
    this.loadProducts();
  }

  get featuredProduct(): Product {
    return this.products[6] ?? this.products[0];
  }

  get saltyPrice(): number {
    return this.config.productPrices.salty;
  }

  get sweetPrice(): number {
    return this.config.productPrices.sweet;
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

  get subtotal(): number {
    return this.saltySubtotal + this.sweetSubtotal;
  }

  get deliveryFee(): number {
    return this.quoteDelivery ? 180 : 0;
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
    return `${this.apiBaseUrl}/productos/activos`;
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
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaSubtotalSaladas}: $${this.saltySubtotal}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaSubtotalDulces}: $${this.sweetSubtotal}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaEntrega}: ${this.quoteDelivery ? this.seccionCotizacion.mensajeSolicitud.etiquetaEntregaSi : this.seccionCotizacion.mensajeSolicitud.etiquetaEntregaNo}`,
      `${this.seccionCotizacion.mensajeSolicitud.etiquetaTotalEstimado}: $${this.total}`
    ].join('\n');

    return quoteDetails;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  getCatalogPrice(category: ProductCategory): number {
    return category === 'dulce' ? this.sweetPrice : this.saltyPrice;
  }

  getCategoryLabel(category: ProductCategory): string {
    return category === 'dulce' ? 'Dulce' : 'Salada';
  }

  getQuoteLineTotal(product: QuoteProduct): number {
    return (product.quantity ?? 0) * product.price;
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
            return throwError(() => new Error('La API no devolvió un id de cotización válido.'));
          }

          const detailPayloads = this.buildQuoteDetailPayloads(pedidoId);

          if (detailPayloads.length !== this.selectedQuoteProducts.length) {
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
    const appLink = this.buildWhatsappAppLink(message);
    const webLink = this.buildWhatsappLink(message);
    const popup = window.open(appLink, '_blank');

    if (!popup) {
      window.open(webLink, '_blank', 'noopener');
      return;
    }

    window.setTimeout(() => {
      if (document.hidden) {
        return;
      }

      popup.close();
      window.open(webLink, '_blank', 'noopener');
    }, 900);
  }

  private buildWhatsappAppLink(message: string): string {
    return `whatsapp://send?phone=${this.contact.whatsappNumber}&text=${encodeURIComponent(message)}`;
  }

  private buildWhatsappLink(message: string): string {
    return `https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
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

          if (mappedProducts.length === 0) {
            this.productsError = this.seccionProductos.mensajeProductosInvalidos;
            this.apiConnectionDiagnostic = {
              status: 'error',
              title: 'La API respondió, pero con datos no válidos',
              summary: 'Se recibió una respuesta del backend, pero no se pudieron mapear productos activos.',
              details: [
                `Base URL configurada: ${this.apiBaseUrl}`,
                `Endpoint probado: ${this.productsEndpoint}`,
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
            details: [
              `Base URL configurada: ${this.apiBaseUrl}`,
              `Endpoint probado: ${this.productsEndpoint}`
            ]
          };
        },
        error: (error: unknown) => {
          this.productsError = this.seccionProductos.mensajeProductosNoDisponibles;
          this.apiConnectionDiagnostic = this.buildApiConnectionDiagnostic(error);
        }
      });
  }

  private buildApiConnectionDiagnostic(error: unknown): ApiConnectionDiagnostic {
    const baseDetails = [
      `Base URL configurada: ${this.apiBaseUrl}`,
      `Endpoint probado: ${this.productsEndpoint}`
    ];

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
        summary: 'El backend respondió, pero la ruta probada no existe.',
        details: [
          ...baseDetails,
          'HTTP status: 404',
          'Verifica que la base URL termine en /api y que exista la ruta /productos/activos.'
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

  private buildCatalogProducts(products: readonly ProductConfig[]): Product[] {
    return products.map((product) => ({
      ...product,
      price: this.getCatalogPrice(product.category)
    }));
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
          price: this.resolvePrice(this.resolveRawPrice(product), category)
        };
      });
  }

  private isApiProductActive(product: ApiProductDto): boolean {
    return product.activo !== false && product.active !== false && product.disponible !== false;
  }

  private resolveFlavor(product: ApiProductDto): string {
    return this.readFirstString(product.nombre, product.name, product.flavor, product.titulo);
  }

  private resolveRawCategory(product: ApiProductDto): string {
    return this.readFirstString(product.categoria, product.category, product.tipo);
  }

  private resolveDescription(product: ApiProductDto): string {
    return this.readFirstString(product.descripcion, product.description, product.detalle);
  }

  private resolveRawImage(product: ApiProductDto): string {
    return this.readFirstString(product.imagenUrl, product.imageUrl, product.image, product.imagen);
  }

  private resolveRawPrice(product: ApiProductDto): number | string | undefined {
    return product.precio ?? product.price;
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

    if (normalizedCategory.includes('dul') || normalizedCategory.includes('sweet')) {
      return 'dulce';
    }

    if (normalizedCategory.includes('sal') || normalizedCategory.includes('sav')) {
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

  private resolvePrice(rawPrice: number | string | undefined, category: ProductCategory): number {
    if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) {
      return rawPrice;
    }

    if (typeof rawPrice === 'string') {
      const parsedPrice = Number.parseFloat(rawPrice);

      if (Number.isFinite(parsedPrice)) {
        return parsedPrice;
      }
    }

    return this.getCatalogPrice(category);
  }
}
