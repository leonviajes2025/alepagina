import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, of, switchMap, throwError } from 'rxjs';
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
  quantity: number;
};

type RequestState = 'idle' | 'loading' | 'success' | 'error';

type ContactFormModel = {
  nombre: string;
  email: string;
  telefono: string;
  aceptaPromociones: boolean;
  pregunta: string;
};

type Service = {
  title: string;
  description: string;
  badge: string;
  details: string[];
};

type TrustPillar = {
  title: string;
  description: string;
  accent: string;
};

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly api = inject(SiteApiService);

  readonly config = siteConfig;

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

  productsLoadedFromApi = false;

  quoteRequestState: RequestState = 'idle';

  quoteRequestMessage = '';

  quoteCustomerName = '';

  contactRequestState: RequestState = 'idle';

  contactRequestMessage = '';

  contactForm: ContactFormModel = {
    nombre: '',
    email: '',
    telefono: '',
    aceptaPromociones: false,
    pregunta: ''
  };

  readonly trustPillars: TrustPillar[] = [
    {
      title: 'Calidad artesanal',
      description: 'Ingredientes seleccionados, mezclas consistentes y presentacion cuidada en cada bolsa.',
      accent: 'Miel dorada'
    },
    {
      title: 'Confianza para eventos',
      description: 'Pedidos claros, calculo rapido y comunicacion directa para evitar sorpresas el dia de tu entrega.',
      accent: 'Ruta segura'
    },
    {
      title: 'Frescura visible',
      description: 'Palomitas crujientes con acabado limpio, pensadas para lucir bien en vitrina, regalo o mesa dulce.',
      accent: 'Recien hechas'
    }
  ];

  readonly services: Service[] = [
    {
      title: 'Venta por pieza',
      badge: 'Entrega rapida',
      description: 'Bolsas individuales listas para regalar, vender o acompañar una mesa de postres.',
      details: [
        'Sabores de temporada y clasicos',
        'Presentacion individual premium',
        'Pedidos desde 6 piezas'
      ]
    },
    {
      title: 'Eventos y mayoreo',
      badge: 'Cotizacion flexible',
      description: 'Armamos pedidos para bodas, corporativos, lanzamientos y celebraciones familiares.',
      details: [
        'Descuento por volumen',
        'Etiquetado personalizado',
        'Opcion con entrega a domicilio'
      ]
    }
  ];

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
    return this.quoteProducts.filter((product) => product.quantity > 0);
  }

  get saltyQuoteProducts(): QuoteProduct[] {
    return this.quoteProducts.filter((product) => product.category === 'salada');
  }

  get sweetQuoteProducts(): QuoteProduct[] {
    return this.quoteProducts.filter((product) => product.category === 'dulce');
  }

  get totalQuoteQuantity(): number {
    return this.selectedQuoteProducts.reduce((total, product) => total + product.quantity, 0);
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
      && this.productsLoadedFromApi;
  }

  get isContactFormValid(): boolean {
    return this.contactForm.nombre.trim().length > 0
      && this.contactForm.email.trim().length > 0
      && this.contactForm.telefono.trim().length > 0;
  }

  get contactWhatsappLink(): string {
    return this.buildWhatsappLink('Hola necesito mas informacion sobre la venta de palomitas');
  }

  get quoteRequestText(): string {
    const selectedFlavors = this.selectedQuoteProducts.length > 0
      ? this.selectedQuoteProducts.map((product) => `- ${product.flavor}: ${product.quantity} piezas`).join('\n')
      : 'Sin sabores seleccionados todavia.';

    const customerName = this.quoteCustomerName.trim();
    const quoteDetails = [
      'Hola, me interesa una cotizacion de palomitas gourmet para mi evento.',
      ...(customerName ? [`Nombre: ${customerName}`] : []),
      'Sabores solicitados:',
      selectedFlavors,
      `Total de piezas: ${this.totalQuoteQuantity}`,
      `Subtotal saladas: $${this.saltySubtotal}`,
      `Subtotal dulces: $${this.sweetSubtotal}`,
      `Entrega: ${this.quoteDelivery ? 'Si' : 'No'}`,
      `Total estimado: $${this.total}`
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
    return product.quantity * product.price;
  }

  normalizeQuantity(product: QuoteProduct): void {
    product.quantity = this.normalizeQuoteValue(product.quantity);
  }

  clearQuote(): void {
    for (const product of this.quoteProducts) {
      product.quantity = 0;
    }

    this.quoteDelivery = false;
    this.quoteCustomerName = '';
  }

  submitQuoteRequest(): void {
    if (!this.canSubmitQuoteRequest) {
      return;
    }

    this.quoteRequestState = 'loading';
    this.quoteRequestMessage = '';

    this.api.submitWhatsappQuote({
      nombre: this.resolveOptionalQuoteName(),
      cotizacion: this.quoteRequestText
    })
      .pipe(
        switchMap((response) => {
          const pedidoId = this.resolveNumericId(response.id);

          if (pedidoId == null) {
            return throwError(() => new Error('La API no devolvio un id de cotizacion valido.'));
          }

          const detailPayloads = this.buildQuoteDetailPayloads(pedidoId);

          if (detailPayloads.length !== this.selectedQuoteProducts.length) {
            return throwError(() => new Error('No todos los productos tienen un id valido para guardar el detalle.'));
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
          this.quoteRequestMessage = 'Cotizacion registrada. Abrimos WhatsApp para continuar la conversacion.';
          window.open(this.buildWhatsappLink(this.quoteRequestText), '_blank', 'noopener');
        },
        error: () => {
          this.quoteRequestState = 'error';
          this.quoteRequestMessage = 'No fue posible registrar la cotizacion por ahora. Intenta nuevamente.';
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
          this.contactRequestMessage = 'Gracias. Tus datos fueron registrados correctamente.';
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
          this.contactRequestMessage = 'No se pudo registrar tu contacto. Intenta nuevamente.';
        }
      });
  }

  private normalizeQuoteValue(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.round(value);
  }

  private resolveOptionalQuoteName(): string | null {
    const normalizedName = this.quoteCustomerName.trim();

    return normalizedName.length > 0 ? normalizedName : null;
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

  private buildWhatsappLink(message: string): string {
    return `https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  private loadProducts(): void {
    this.productsLoading = true;
    this.productsError = '';
    this.productsLoadedFromApi = false;

    this.api.getProducts()
      .pipe(finalize(() => {
        this.productsLoading = false;
      }))
      .subscribe({
        next: (products) => {
          const mappedProducts = this.mapApiProducts(products);

          if (mappedProducts.length === 0) {
            this.productsError = 'La API no devolvio productos validos. Se muestra el catalogo base.';
            return;
          }

          this.products = mappedProducts;
          this.quoteProducts = this.createQuoteProducts(mappedProducts);
          this.productsLoadedFromApi = true;
        },
        error: () => {
          this.productsError = 'No fue posible cargar los productos desde la API. Se muestra el catalogo base.';
        }
      });
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
      quantity: 0
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
          description: this.resolveDescription(product) || fallback?.description || 'Producto disponible para cotizacion inmediata.',
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
