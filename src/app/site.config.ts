import { environment } from '../environments/environment';

export type ProductCategory = 'dulce' | 'salada' | 'dulce/salada';

export type SiteThemeName = 'clasico' | 'oscuro';

export type ProductConfig = {
  flavor: string;
  category: ProductCategory;
  description: string;
  image: string;
  price: number;
};

export type SiteThemeConfig = {
  label: string;
};

export const siteConfig = {
  companyName: 'Bee Palomitas',
  contactName: 'Alejandrina',
  contactEmail: 'beepalomitas@gmail.com',
  // Detect remote (production) API base URLs that start with http(s) or //;
  // treat relative paths (starting with '/') as local/dev.
  whatsappNumber: (/^https?:\/\//.test(environment.apiBaseUrl) || environment.apiBaseUrl.startsWith('//'))
    ? '5569852630'
    : '5551078110',
  apiBaseUrl: environment.apiBaseUrl,
  apiDiagnosticsEnabled: environment.apiDiagnosticsEnabled,
  theme: {
    defaultTheme: 'oscuro',
    themes: {
      clasico: {
        label: 'Clasico'
      },
      oscuro: {
        label: 'Oscuro'
      }
    } satisfies Record<SiteThemeName, SiteThemeConfig>
  },
  products: [
    {
      flavor: 'Esquite',
      category: 'salada',
      description: 'Mezcla cremosa inspirada en elote callejero con toque cítrico y chile suave.',
      image: 'products/queso-chipotle.svg',
      price: 30
    },
    {
      flavor: 'Takis',
      category: 'salada',
      description: 'Perfil intenso, crujiente y ligeramente picante para quienes buscan algo atrevido.',
      image: 'products/queso-chipotle.svg',
      price: 30
    },
    {
      flavor: 'Queso chipotle',
      category: 'salada',
      description: 'Sabor balanceado entre queso maduro y un picor ahumado de chipotle.',
      image: 'products/queso-chipotle.svg',
      price: 30
    },
    {
      flavor: 'Jalapeno cheddar',
      category: 'salada',
      description: 'Combinación cremosa y picante pensada para reuniones y botana premium.',
      image: 'products/queso-chipotle.svg',
      price: 30
    },
    {
      flavor: 'Crema y cebolla',
      category: 'salada',
      description: 'Sabor redondo, aromático y fácil de servir en eventos corporativos o familiares.',
      image: 'products/queso-chipotle.svg',
      price: 30
    },
    {
      flavor: 'BBQ ahumado',
      category: 'salada',
      description: 'Palomitas con notas dulces, ahumadas y especiadas para mesas de snacks.',
      image: 'products/queso-chipotle.svg',
      price: 30
    },
    {
      flavor: 'Caramelo',
      category: 'dulce',
      description: 'Clásico dorado con acabado crujiente y un sabor amable que gusta a todos.',
      image: 'products/caramelo-clasico.svg',
      price: 35
    },
    {
      flavor: 'Chocolate oscuro',
      category: 'dulce',
      description: 'Cobertura semiamarga con personalidad intensa para regalo o mesa dulce.',
      image: 'products/chocolate-oscuro.svg',
      price: 35
    },
    {
      flavor: 'Churro canela',
      category: 'dulce',
      description: 'Inspirado en churro recién hecho con azúcar, canela y aroma tostado.',
      image: 'products/caramelo-clasico.svg',
      price: 35
    },
    {
      flavor: 'Cajeta con nuez',
      category: 'dulce',
      description: 'Perfil suave y goloso con notas lácteas y un final de nuez tostada.',
      image: 'products/caramelo-clasico.svg',
      price: 35
    },
    {
      flavor: 'Cookies and cream',
      category: 'dulce',
      description: 'Contraste cremoso y crujiente para mesas juveniles, regalos o celebraciones.',
      image: 'products/chocolate-oscuro.svg',
      price: 35
    },
    {
      flavor: 'Fresa vainilla',
      category: 'dulce',
      description: 'Sabor suave y vistoso con perfil dulce pensado para eventos sociales.',
      image: 'products/caramelo-clasico.svg',
      price: 35
    }
  ] satisfies ProductConfig[]
} as const;