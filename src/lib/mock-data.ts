import type { CartItem, OrderStatus } from './domain/order';

export type Category = {
  id: string;
  name: string;
  description: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured?: boolean;
};

export type DemoOrder = {
  id: string;
  orderNumber: string;
  table: string;
  status: OrderStatus;
  createdAt: string;
  items: CartItem[];
};

export const restaurant = {
  name: 'MesaFácil Restaurante',
  slug: 'mesafacil-demo',
  table: '12',
  slogan: 'Pedido por QR Code, cozinha organizada e atendimento mais rápido.',
};

export const categories: Category[] = [
  { id: 'burgers', name: 'Hambúrgueres', description: 'Artesanais, prensados e combos.' },
  { id: 'drinks', name: 'Bebidas', description: 'Sucos, refrigerantes e água.' },
  { id: 'desserts', name: 'Sobremesas', description: 'Doces para finalizar o pedido.' },
];

export const products: Product[] = [
  {
    id: 'classic-burger',
    categoryId: 'burgers',
    name: 'Burger Clássico',
    description: 'Pão brioche, blend 160g, queijo, alface, tomate e molho da casa.',
    priceCents: 2990,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'double-burger',
    categoryId: 'burgers',
    name: 'Double Smash',
    description: 'Dois discos smash, cheddar, cebola caramelizada e maionese especial.',
    priceCents: 3690,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80',
    isAvailable: true,
  },
  {
    id: 'orange-juice',
    categoryId: 'drinks',
    name: 'Suco de Laranja',
    description: 'Natural, servido gelado.',
    priceCents: 900,
    imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
    isAvailable: true,
  },
  {
    id: 'brownie',
    categoryId: 'desserts',
    name: 'Brownie com Sorvete',
    description: 'Brownie quente com sorvete de creme.',
    priceCents: 1890,
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80',
    isAvailable: false,
  },
];

export const demoOrders: DemoOrder[] = [
  {
    id: 'order-001',
    orderNumber: '0001',
    table: '12',
    status: 'received',
    createdAt: 'agora',
    items: [
      { productId: 'classic-burger', productName: 'Burger Clássico', unitPriceCents: 2990, quantity: 2, notes: 'Um sem tomate' },
      { productId: 'orange-juice', productName: 'Suco de Laranja', unitPriceCents: 900, quantity: 2 },
    ],
  },
  {
    id: 'order-002',
    orderNumber: '0002',
    table: '08',
    status: 'preparing',
    createdAt: 'há 8 min',
    items: [
      { productId: 'double-burger', productName: 'Double Smash', unitPriceCents: 3690, quantity: 1, notes: 'Carne ao ponto' },
    ],
  },
];
