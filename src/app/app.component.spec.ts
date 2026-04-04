import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { siteConfig } from './site.config';

describe('AppComponent', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  function flushProductsRequest(): void {
      const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/activos`);

    expect(request.request.method).toBe('GET');

    request.flush([
      {
        nombre: 'Esquite',
        categoria: 'salada',
        descripcion: 'Producto remoto',
        precio: 32,
        imagenUrl: 'products/queso-chipotle.svg',
        activo: true
      },
      {
        nombre: 'Caramelo',
        categoria: 'dulce',
        descripcion: 'Producto remoto dulce',
        precio: 38,
        imagenUrl: 'products/caramelo-clasico.svg',
        activo: true
      }
    ]);
  }

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
    flushProductsRequest();
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

    const decodedMessage = app.quoteRequestText;

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

  it('should replace the fallback catalog with products from the API', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    flushProductsRequest();

    expect(app.products.length).toBe(2);
    expect(app.products[0].flavor).toBe('Esquite');
    expect(app.products[0].price).toBe(32);
  });

  it('should support wrapped product responses and alternate field names', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();

      const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/activos`);
    expect(request.request.method).toBe('GET');

    request.flush({
      data: {
        rows: [
          {
            name: 'Chocolate oscuro',
            category: 'sweet',
            description: 'Producto remoto alterno',
            price: '41.5',
            image: 'products/chocolate-oscuro.svg',
            active: true
          },
          {
            titulo: 'Producto oculto',
            tipo: 'salada',
            detalle: 'No deberia mostrarse',
            precio: 99,
            imagen: 'products/queso-chipotle.svg',
            disponible: false
          }
        ]
      }
    });

    expect(app.products.length).toBe(1);
    expect(app.products[0].flavor).toBe('Chocolate oscuro');
    expect(app.products[0].category).toBe('dulce');
    expect(app.products[0].price).toBe(41.5);
    expect(app.products[0].description).toBe('Producto remoto alterno');
  });

  it('should register the WhatsApp quote before opening the chat', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const openSpy = spyOn(window, 'open');

    app.quoteProducts[0].quantity = 3;
    app.submitQuoteRequest();

      const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos-whats`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.cotizacion).toContain('Total de piezas: 3');

    request.flush({ ok: true });

    expect(app.quoteRequestState).toBe('success');
    expect(openSpy).toHaveBeenCalled();
  });

  it('should send the contact form to the contactos endpoint', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.contactForm = {
      nombre: 'Marta Soto',
      email: 'marta.postman@example.com',
      telefono: '+5215555555510',
      aceptaPromociones: true
    };

    app.submitContactRequest();

      const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Marta Soto',
      email: 'marta.postman@example.com',
      telefono: '+5215555555510',
      aceptaPromociones: true
    });

    request.flush({ ok: true });

    expect(app.contactRequestState).toBe('success');
    expect(app.contactForm.nombre).toBe('');
  });
});
