/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { contenidoHero } from './content/hero.content';
import { siteConfig } from './site.config';

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(baseDate: Date, days: number): Date {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

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
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  function flushProductsRequest(): void {
    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/visibles`);

    expect(request.request.method).toBe('GET');

    request.flush([
      {
        id: 11,
        nombre: 'Esquite',
        categoria: 'salada',
        descripcion: 'Producto remoto',
        precio: 32,
        imagenUrl: 'products/queso-chipotle.svg',
        activo: true
      },
      {
        id: 12,
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

  it('should apply the configured default theme', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.currentTheme).toBe(siteConfig.theme.defaultTheme);
    expect(document.documentElement.getAttribute('data-theme')).toBe(siteConfig.theme.defaultTheme);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('should render the hero headline', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    flushProductsRequest();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(contenidoHero.titulo);
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

  it('should toggle the active theme from the header control', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.currentTheme).toBe('oscuro');

    app.toggleTheme();
    expect(app.currentTheme).toBe('clasico');
    expect(document.documentElement.getAttribute('data-theme')).toBe('clasico');
    expect(document.documentElement.style.colorScheme).toBe('light');

    app.toggleTheme();
    expect(app.currentTheme).toBe('oscuro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('oscuro');
  });

  it('should render the theme toggle with the current theme label', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    flushProductsRequest();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.theme-toggle-copy strong')?.textContent).toContain('Oscuro');
  });

  it('should preserve the configured price of each catalog product', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.products[0].price).toBe(siteConfig.products[0].price);
    expect(app.products[6].price).toBe(siteConfig.products[6].price);
  });

  it('should initialize quote quantities as empty', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.quoteProducts.every((product) => product.quantity === null)).toBeTrue();
    expect(app.totalQuoteQuantity).toBe(0);
  });

  it('should calculate the quote subtotal using the price of each selected product', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const esquite = app.quoteProducts.find((product) => product.flavor === 'Esquite');
    const caramelo = app.quoteProducts.find((product) => product.flavor === 'Caramelo');

    expect(esquite).toBeTruthy();
    expect(caramelo).toBeTruthy();

    esquite!.price = 42;
    esquite!.quantity = 10;
    caramelo!.price = 50;
    caramelo!.quantity = 5;
    app.quoteDelivery = false;

    expect(app.saltySubtotal).toBe(10 * 42);
    expect(app.sweetSubtotal).toBe(5 * 50);
    expect(app.subtotal).toBe((10 * 42) + (5 * 50));
    expect(app.total).toBe(app.subtotal);
  });

  it('should support dual-category products in the quote summary without duplicating totals', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const mixedProduct = app.quoteProducts[0];

    mixedProduct.category = 'dulce/salada';
    mixedProduct.price = 48;
    mixedProduct.quantity = 3;
    app.quoteDelivery = false;

    expect(app.mixedQuoteProducts).toContain(mixedProduct);
    expect(app.mixedSubtotal).toBe(144);
    expect(app.saltySubtotal).toBe(0);
    expect(app.sweetSubtotal).toBe(0);
    expect(app.subtotal).toBe(144);
    expect(app.quoteRequestText).toContain('Subtotal dulce/salada: $144 MXN');
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
    expect(decodedMessage).toContain('Entrega: Sí');
    expect(decodedMessage).toContain(`Total estimado: ${app.formatPrice(app.total)}`);
  });

  it('should use singular and plural piece labels correctly in the WhatsApp text', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteProducts[0].quantity = 1;
    app.quoteProducts[1].quantity = 2;

    expect(app.quoteRequestText).toContain('Sabores solicitados:');
    expect(app.quoteRequestText).toContain(`- ${app.quoteProducts[0].flavor}: 1 pieza`);
    expect(app.quoteRequestText).toContain(`- ${app.quoteProducts[1].flavor}: 2 piezas`);
  });

  it('should include the optional name in the quote message when provided', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteCustomerName = 'Ana Perez';
    app.quoteDeliveryDate = '2026-04-20';
    app.quoteProducts[0].quantity = 2;

    expect(app.quoteRequestText).toContain('Nombre: Ana Perez');
    expect(app.quoteRequestText).toContain('Fecha de entrega: 20 de abril de 2026');
  });

  it('should group quote products by salty and sweet categories', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.saltyQuoteProducts.every((product) => product.category === 'salada')).toBeTrue();
    expect(app.sweetQuoteProducts.every((product) => product.category === 'dulce')).toBeTrue();
    expect(app.mixedQuoteProducts.every((product) => product.category === 'dulce/salada')).toBeTrue();
    expect(app.saltyQuoteProducts.length + app.sweetQuoteProducts.length + app.mixedQuoteProducts.length).toBe(app.quoteProducts.length);
  });

  it('should clear all selected quote items and delivery', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteProducts[0].quantity = 4;
    app.quoteProducts[6].quantity = 7;
    app.quoteDelivery = true;
    app.quoteDeliveryDate = '2026-04-20';

    app.clearQuote();

    expect(app.quoteProducts.every((product) => product.quantity === null)).toBeTrue();
    expect(app.quoteDelivery).toBeFalse();
    expect(app.quoteDeliveryDate).toBe('');
    expect(app.totalQuoteQuantity).toBe(0);
    expect(app.total).toBe(0);
  });

  it('should normalize negative quote quantities to empty', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteProducts[0].quantity = -3;

    app.normalizeQuantity(app.quoteProducts[0]);

    expect(app.quoteProducts[0].quantity).toBeNull();
    expect(app.totalQuoteQuantity).toBe(0);
  });

  it('should block invalid keys in quote inputs', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const preventDefault = jasmine.createSpy('preventDefault');

    app.blockInvalidQuoteKey({ key: '-', preventDefault } as unknown as KeyboardEvent);
    app.blockInvalidQuoteKey({ key: 'e', preventDefault } as unknown as KeyboardEvent);
    app.blockInvalidQuoteKey({ key: '5', preventDefault } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it('should replace the fallback catalog with products from the API', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    flushProductsRequest();

    expect(app.products.length).toBe(2);
    expect(app.products[0].flavor).toBe('Esquite');
    expect(app.products[0].price).toBe(32);
    expect(app.apiConnectionDiagnostic.status).toBe('success');
    expect(app.apiConnectionDiagnostic.summary).toContain('2 productos');
  });

  it('should expose a useful diagnostic when the API is unreachable', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();

    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/visibles`);
    expect(request.request.method).toBe('GET');

    request.error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error'
    });

    expect(app.productsError).toBeTruthy();
    expect(app.apiConnectionDiagnostic.status).toBe('error');
    expect(app.apiConnectionDiagnostic.title).toContain('API no respondió');
    expect(app.apiConnectionDiagnostic.details.some((detail) => detail.includes(siteConfig.apiBaseUrl))).toBeTrue();
  });

  it('should expose a useful diagnostic when the API returns 404', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();

    const visibleRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/visibles`);
    visibleRequest.flush({}, {
      status: 404,
      statusText: 'Not Found'
    });

    const fallbackRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos`);
    fallbackRequest.flush({}, {
      status: 404,
      statusText: 'Not Found'
    });

    expect(app.apiConnectionDiagnostic.status).toBe('error');
    expect(app.apiConnectionDiagnostic.title).toContain('Endpoint no encontrado');
    expect(app.apiConnectionDiagnostic.details.some((detail) => detail.includes('/productos/visibles'))).toBeTrue();
    expect(app.apiConnectionDiagnostic.details.some((detail) => detail.includes('/productos'))).toBeTrue();
  });

  it('should fallback to the generic products endpoint when visibles returns 404', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();

    const visibleRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/visibles`);
    visibleRequest.flush({}, {
      status: 404,
      statusText: 'Not Found'
    });

    const fallbackRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos`);
    expect(fallbackRequest.request.method).toBe('GET');
    fallbackRequest.flush([
      {
        id: 11,
        nombre: 'Esquite',
        categoria: 'salada',
        descripcion: 'Producto remoto',
        precio: 32,
        imagenUrl: 'products/queso-chipotle.svg',
        activo: true
      }
    ]);

    expect(app.productsLoadedFromApi).toBeTrue();
    expect(app.products.length).toBe(1);
    expect(app.apiConnectionDiagnostic.status).toBe('success');
    expect(app.apiConnectionDiagnostic.details.some((detail) => detail.includes('Endpoint resuelto'))).toBeTrue();
    expect(app.apiConnectionDiagnostic.details.some((detail) => detail.includes('/productos'))).toBeTrue();
  });

  it('should support wrapped product responses and alternate field names', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();

      const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/visibles`);
    expect(request.request.method).toBe('GET');

    request.flush({
      data: {
        rows: [
          {
            id: '25',
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
    expect(app.products[0].id).toBe(25);
    expect(app.products[0].category).toBe('dulce');
    expect(app.products[0].price).toBe(41.5);
    expect(app.products[0].description).toBe('Producto remoto alterno');
  });

  it('should map dulce/salada as a valid product category from the API', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();

    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/productos/visibles`);
    expect(request.request.method).toBe('GET');

    request.flush([
      {
        id: 31,
        nombre: 'Mix especial',
        categoria: 'dulce/salada',
        descripcion: 'Combinación de temporada',
        precio: 47,
        imagenUrl: 'products/caramelo-clasico.svg',
        activo: true
      }
    ]);

    expect(app.products.length).toBe(1);
    expect(app.products[0].category).toBe('dulce/salada');
    expect(app.getCategoryLabel(app.products[0].category)).toBe('Dulce/salada');
    expect(app.products[0].price).toBe(47);
  });

  it('should register the WhatsApp quote detail before opening the chat', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const openSpy = spyOn(window, 'open');

    fixture.detectChanges();
    flushProductsRequest();

    app.quoteCustomerName = 'Ana Perez';
    app.quoteDeliveryDate = '2026-04-20';
    app.quoteProducts[0].quantity = 3;
    app.submitQuoteRequest();

    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos-whats`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.nombre).toBe('Ana Perez');
    expect(request.request.body.fechaEntregaEstimada).toBe('2026-04-20');
    expect(request.request.body.cotizacion).toContain('Sabores solicitados:');
    expect(request.request.body.cotizacion).toContain('- Esquite: 3 piezas');
    expect(request.request.body.cotizacion).toContain('Total de piezas: 3');
    expect(request.request.body.cotizacion).toContain('Fecha de entrega: 20 de abril de 2026');

    request.flush({ id: 77 });

    const detailRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/cotizacion-detalle`);
    expect(detailRequest.request.method).toBe('POST');
    expect(detailRequest.request.body).toEqual({
      idPedido: 77,
      idProducto: 11,
      numeroPiezas: 3
    });

    detailRequest.flush({ ok: true });

    expect(app.quoteRequestState).toBe('success');
    expect(openSpy).toHaveBeenCalled();
  });

  it('should not submit the quote when products are only available from the fallback catalog', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteProducts[0].quantity = 2;

    expect(app.productsLoadedFromApi).toBeFalse();
    expect(app.canSubmitQuoteRequest).toBeFalse();

    app.submitQuoteRequest();

    httpTestingController.expectNone(`${siteConfig.apiBaseUrl}/contactos-whats`);
    httpTestingController.expectNone(`${siteConfig.apiBaseUrl}/cotizacion-detalle`);
  });

  it('should send null as the optional quote name when it is empty', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    flushProductsRequest();

    app.quoteCustomerName = '   ';
    app.quoteDeliveryDate = '2026-04-20';
    app.quoteProducts[0].quantity = 1;
    app.submitQuoteRequest();

    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos-whats`);
    expect(request.request.body.nombre).toBeNull();

    request.flush({ id: 91 });

    const detailRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/cotizacion-detalle`);
    detailRequest.flush({ ok: true });
  });

  it('should submit the quote when the delivery date is missing', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    flushProductsRequest();

    app.quoteProducts[0].quantity = 2;
    app.quoteDeliveryDate = '';

    expect(app.isQuoteDeliveryDateValid).toBeTrue();
    expect(app.canSubmitQuoteRequest).toBeTrue();

    app.submitQuoteRequest();

    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos-whats`);
    expect(request.request.body.fechaEntregaEstimada).toBeUndefined();
    expect(request.request.body.cotizacion).not.toContain('Fecha de entrega:');

    request.flush({ id: 92 });

    const detailRequest = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/cotizacion-detalle`);
    detailRequest.flush({ ok: true });
  });

  it('should treat invalid quote delivery dates as invalid', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.quoteDeliveryDate = 'fecha-invalida';

    expect(app.isQuoteDeliveryDateValid).toBeFalse();
  });

  it('should treat past quote delivery dates as invalid and show a warning', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const yesterday = toIsoDate(addDays(new Date(), -1));

    app.quoteDeliveryDate = yesterday;

    expect(app.isQuoteDeliveryDateInPast).toBeTrue();
    expect(app.isQuoteDeliveryDateValid).toBeFalse();
    expect(app.quoteDeliveryDateWarningMessage).toBe('La fecha de entrega no puede ser anterior a hoy.');
  });

  it('should send the contact form to the contactos endpoint', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.contactForm = {
      nombre: 'Marta Soto',
      email: 'marta.postman@example.com',
      telefono: '+5215555555510',
      aceptaPromociones: true,
      pregunta: 'Tienen disponibilidad inmediata?'
    };

    app.submitContactRequest();

      const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Marta Soto',
      email: 'marta.postman@example.com',
      telefono: '+5215555555510',
      aceptaPromociones: true,
      pregunta: 'Tienen disponibilidad inmediata?'
    });

    request.flush({ ok: true });

    expect(app.contactRequestState).toBe('success');
    expect(app.contactForm.nombre).toBe('');
    expect(app.contactForm.pregunta).toBe('');
  });

  it('should omit the optional contact question when it is empty', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.contactForm = {
      nombre: 'Marta Soto',
      email: 'marta.postman@example.com',
      telefono: '+5215555555510',
      aceptaPromociones: false,
      pregunta: '   '
    };

    app.submitContactRequest();

    const request = httpTestingController.expectOne(`${siteConfig.apiBaseUrl}/contactos`);
    expect(request.request.body).toEqual({
      nombre: 'Marta Soto',
      email: 'marta.postman@example.com',
      telefono: '+5215555555510',
      aceptaPromociones: false
    });

    request.flush({ ok: true });
  });

  it('should render the optional question field in the contact form', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    flushProductsRequest();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const questionField = compiled.querySelector('textarea[name="contactQuestion"]');

    expect(questionField).not.toBeNull();
    expect(questionField?.hasAttribute('required')).toBeFalse();
  });

  it('should render the quote delivery date field next to the quote name field', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    flushProductsRequest();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const quoteFieldGroup = compiled.querySelector('.quote-contact-fields');
    const nameField = compiled.querySelector('input[name="quoteCustomerName"]');
    const dateField = compiled.querySelector('input[name="quoteDeliveryDate"]');

    expect(quoteFieldGroup).not.toBeNull();
    expect(nameField).not.toBeNull();
    expect(dateField).not.toBeNull();
    expect(dateField?.getAttribute('type')).toBe('date');
    expect(dateField?.hasAttribute('required')).toBeFalse();
    expect(nameField?.getAttribute('placeholder')).toBe('Tu nombre');
    expect(dateField?.getAttribute('min')).toBe(app.minQuoteDeliveryDate);
    expect(compiled.textContent).toContain('Nombre (opcional)');
    expect(compiled.textContent).toContain('Fecha de entrega (opcional)');
  });

  it('should render a warning when the quote delivery date is earlier than today', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const yesterday = toIsoDate(addDays(new Date(), -1));

    fixture.detectChanges();
    flushProductsRequest();

    app.quoteDeliveryDate = yesterday;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const warning = compiled.querySelector('#quote-delivery-date-warning');
    const dateField = compiled.querySelector('input[name="quoteDeliveryDate"]');

    expect(warning?.textContent).toContain('La fecha de entrega no puede ser anterior a hoy.');
    expect(dateField?.getAttribute('aria-invalid')).toBe('true');
  });
});
