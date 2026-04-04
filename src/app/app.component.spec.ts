import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { siteConfig } from './site.config';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expose the brand name', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.brand).toEqual(siteConfig.companyName);
  });

  it('should render the hero headline', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Palomitas gourmet');
  });

  it('should toggle the mobile menu state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.mobileMenuOpen).toBeFalse();

    app.toggleMobileMenu();
    expect(app.mobileMenuOpen).toBeTrue();

    app.closeMobileMenu();
    expect(app.mobileMenuOpen).toBeFalse();
  });

  it('should compute config-based prices for product categories', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.getCatalogPrice('salada')).toBe(siteConfig.productPrices.salty);
    expect(app.getCatalogPrice('dulce')).toBe(siteConfig.productPrices.sweet);
  });

  it('should calculate the quote subtotal using selected flavors', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const esquite = app.quoteProducts.find((product) => product.flavor === 'Esquite');
    const caramelo = app.quoteProducts.find((product) => product.flavor === 'Caramelo');

    expect(esquite).toBeTruthy();
    expect(caramelo).toBeTruthy();

    esquite!.quantity = 10;
    caramelo!.quantity = 5;
    app.quoteDelivery = false;

    expect(app.saltySubtotal).toBe(10 * siteConfig.productPrices.salty);
    expect(app.sweetSubtotal).toBe(5 * siteConfig.productPrices.sweet);
    expect(app.subtotal).toBe((10 * siteConfig.productPrices.salty) + (5 * siteConfig.productPrices.sweet));
    expect(app.total).toBe(app.subtotal);
  });

  it('should include the quote breakdown in the WhatsApp link', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const esquite = app.quoteProducts.find((product) => product.flavor === 'Esquite');
    const caramelo = app.quoteProducts.find((product) => product.flavor === 'Caramelo');

    expect(esquite).toBeTruthy();
    expect(caramelo).toBeTruthy();

    esquite!.quantity = 12;
    caramelo!.quantity = 8;
    app.quoteDelivery = true;

    const decodedMessage = decodeURIComponent(app.whatsappLink.split('?text=')[1]);

    expect(decodedMessage).toContain('Sabores solicitados:');
    expect(decodedMessage).toContain('- Esquite: 12 piezas');
    expect(decodedMessage).toContain('- Caramelo: 8 piezas');
    expect(decodedMessage).toContain('Total de piezas: 20');
    expect(decodedMessage).toContain('Entrega: Si');
    expect(decodedMessage).toContain(`Total estimado: $${app.total}`);
  });

  it('should group quote products by salty and sweet categories', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.saltyQuoteProducts.every((product) => product.category === 'salada')).toBeTrue();
    expect(app.sweetQuoteProducts.every((product) => product.category === 'dulce')).toBeTrue();
    expect(app.saltyQuoteProducts.length + app.sweetQuoteProducts.length).toBe(app.quoteProducts.length);
  });

  it('should clear all selected quote items and delivery', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteProducts[0].quantity = 4;
    app.quoteProducts[6].quantity = 7;
    app.quoteDelivery = true;

    app.clearQuote();

    expect(app.quoteProducts.every((product) => product.quantity === 0)).toBeTrue();
    expect(app.quoteDelivery).toBeFalse();
    expect(app.totalQuoteQuantity).toBe(0);
    expect(app.total).toBe(0);
  });
});
