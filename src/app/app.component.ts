import { CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { siteConfig, type ProductCategory } from './site.config';

type Product = {
  image: string;
  flavor: string;
  description: string;
  price: number;
  category: ProductCategory;
};

type QuoteProduct = Product & {
  quantity: number;
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
export class AppComponent {
  readonly config = siteConfig;

  readonly brand = this.config.companyName;

  readonly contact = {
    person: this.config.contactName,
    email: this.config.contactEmail,
    whatsappNumber: this.config.whatsappNumber
  };

  readonly products: Product[] = this.config.products.map((product) => ({
    ...product,
    price: this.getCatalogPrice(product.category)
  }));

  readonly quoteProducts: QuoteProduct[] = this.products.map((product) => ({
    ...product,
    quantity: 0
  }));

  readonly featuredProduct = this.products[6] ?? this.products[0];

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

  get contactWhatsappLink(): string {
    return this.buildWhatsappLink('Hola necesito mas informacion sobre la venta de palomitas');
  }

  get quoteWhatsappLink(): string {
    const selectedFlavors = this.selectedQuoteProducts.length > 0
      ? this.selectedQuoteProducts.map((product) => `- ${product.flavor}: ${product.quantity} piezas`).join('\n')
      : 'Sin sabores seleccionados todavia.';

    const quoteDetails = [
      'Hola, me interesa una cotizacion de palomitas gourmet para mi evento.',
      'Sabores solicitados:',
      selectedFlavors,
      `Total de piezas: ${this.totalQuoteQuantity}`,
      `Subtotal saladas: $${this.saltySubtotal}`,
      `Subtotal dulces: $${this.sweetSubtotal}`,
      `Entrega: ${this.quoteDelivery ? 'Si' : 'No'}`,
      `Total estimado: $${this.total}`
    ].join('\n');

    return this.buildWhatsappLink(quoteDetails);
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
  }

  private normalizeQuoteValue(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.round(value);
  }

  private buildWhatsappLink(message: string): string {
    return `https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }
}
