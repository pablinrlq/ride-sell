import { Product } from '@/types/product';

export const products: Product[] = [
  {
    id: '1',
    name: 'Mountain Bike Pro X1',
    description: 'Bicicleta de montanha profissional com suspensão full, quadro em alumínio e câmbio Shimano 21 velocidades.',
    price: 3499.00,
    originalPrice: 4299.00,
    category: 'bicicletas',
    image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800',
    stock: 5,
    featured: true
  },
  {
    id: '2',
    name: 'Speed Road Elite',
    description: 'Bicicleta speed para estrada com quadro em carbono ultra leve e rodas aerodinâmicas.',
    price: 5899.00,
    category: 'bicicletas',
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
    stock: 3,
    featured: true
  },
  {
    id: '3',
    name: 'Urban Cruiser City',
    description: 'Bicicleta urbana perfeita para o dia a dia, com design moderno e confortável.',
    price: 1899.00,
    category: 'bicicletas',
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800',
    stock: 8
  },
  {
    id: '4',
    name: 'BMX Freestyle Extreme',
    description: 'BMX profissional para manobras radicais, estrutura reforçada.',
    price: 1299.00,
    category: 'bicicletas',
    image: 'https://images.unsplash.com/photo-1583467875263-d50dec37a88c?w=800',
    stock: 6
  },
  {
    id: '5',
    name: 'Pneu Continental 29"',
    description: 'Pneu de alta performance para mountain bike, excelente aderência.',
    price: 189.00,
    category: 'pecas',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    stock: 25,
    featured: true
  },
  {
    id: '6',
    name: 'Câmbio Shimano Deore XT',
    description: 'Câmbio traseiro profissional 12 velocidades para máxima precisão.',
    price: 899.00,
    originalPrice: 1099.00,
    category: 'pecas',
    image: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=800',
    stock: 12
  },
  {
    id: '7',
    name: 'Corrente KMC X11',
    description: 'Corrente de alta durabilidade para 11 velocidades.',
    price: 149.00,
    category: 'pecas',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    stock: 30
  },
  {
    id: '8',
    name: 'Freio a Disco Hidráulico',
    description: 'Kit de freio hidráulico dianteiro e traseiro, alta performance.',
    price: 459.00,
    category: 'pecas',
    image: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=800',
    stock: 15
  },
  {
    id: '9',
    name: 'Capacete Aerodinâmico Pro',
    description: 'Capacete profissional com ventilação avançada e ajuste perfeito.',
    price: 349.00,
    category: 'acessorios',
    image: 'https://images.unsplash.com/photo-1557803175-2f8c4f56c34c?w=800',
    stock: 20
  },
  {
    id: '10',
    name: 'Luvas Gel Premium',
    description: 'Luvas com proteção em gel para maior conforto em longas pedaladas.',
    price: 89.00,
    category: 'acessorios',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    stock: 40
  }
];

export const getProductsByCategory = (category: string): Product[] => {
  if (category === 'todos') return products;
  return products.filter(p => p.category === category);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter(p => p.featured);
};

export const getProductById = (id: string): Product | undefined => {
  return products.find(p => p.id === id);
};
