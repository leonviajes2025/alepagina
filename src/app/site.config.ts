import { environment } from '../environments/environment';

export type ProductCategory = 'dulce' | 'salada';

export type ProductConfig = {
  flavor: string;
  category: ProductCategory;
  description: string;
  image: string;
};

export const siteConfig = {
  companyName: 'Bee',
  contactName: 'Alejandrina Castro',
  contactEmail: 'hola@nubemaizgourmet.mx',
  whatsappNumber: '5569852630',
  apiBaseUrl: environment.apiBaseUrl,
  productPrices: {
    salty: 30,
    sweet: 35
  },
  products: [
    {
      flavor: 'Esquite',
      category: 'salada',
      description: 'Mezcla cremosa inspirada en elote callejero con toque cítrico y chile suave.',
      image: 'products/queso-chipotle.svg'
    },
    {
      flavor: 'Takis',
      category: 'salada',
      description: 'Perfil intenso, crujiente y ligeramente picante para quienes buscan algo atrevido.',
      image: 'products/queso-chipotle.svg'
    },
    {
      flavor: 'Queso chipotle',
      category: 'salada',
      description: 'Sabor balanceado entre queso maduro y un picor ahumado de chipotle.',
      image: 'products/queso-chipotle.svg'
    },
    {
      flavor: 'Jalapeno cheddar',
      category: 'salada',
      description: 'Combinación cremosa y picante pensada para reuniones y botana premium.',
      image: 'products/queso-chipotle.svg'
    },
    {
      flavor: 'Crema y cebolla',
      category: 'salada',
      description: 'Sabor redondo, aromático y fácil de servir en eventos corporativos o familiares.',
      image: 'products/queso-chipotle.svg'
    },
    {
      flavor: 'BBQ ahumado',
      category: 'salada',
      description: 'Palomitas con notas dulces, ahumadas y especiadas para mesas de snacks.',
      image: 'products/queso-chipotle.svg'
    },
    {
      flavor: 'Caramelo',
      category: 'dulce',
      description: 'Clásico dorado con acabado crujiente y un sabor amable que gusta a todos.',
      image: 'products/caramelo-clasico.svg'
    },
    {
      flavor: 'Chocolate oscuro',
      category: 'dulce',
      description: 'Cobertura semiamarga con personalidad intensa para regalo o mesa dulce.',
      image: 'products/chocolate-oscuro.svg'
    },
    {
      flavor: 'Churro canela',
      category: 'dulce',
      description: 'Inspirado en churro recién hecho con azúcar, canela y aroma tostado.',
      image: 'products/caramelo-clasico.svg'
    },
    {
      flavor: 'Cajeta con nuez',
      category: 'dulce',
      description: 'Perfil suave y goloso con notas lácteas y un final de nuez tostada.',
      image: 'products/caramelo-clasico.svg'
    },
    {
      flavor: 'Cookies and cream',
      category: 'dulce',
      description: 'Contraste cremoso y crujiente para mesas juveniles, regalos o celebraciones.',
      image: 'products/chocolate-oscuro.svg'
    },
    {
      flavor: 'Fresa vainilla',
      category: 'dulce',
      description: 'Sabor suave y vistoso con perfil dulce pensado para eventos sociales.',
      image: 'products/caramelo-clasico.svg'
    }
  ] satisfies ProductConfig[]
} as const;