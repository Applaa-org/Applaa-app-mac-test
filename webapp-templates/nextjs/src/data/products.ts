// Product data types and mock data for development
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

// Mock products data for development/testing
export const products: Product[] = [
  {
    id: '1',
    name: 'Sample Product 1',
    description: 'This is a sample product description',
    price: 29.99,
    category: 'electronics',
    image: 'https://via.placeholder.com/300x200',
    in_stock: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Sample Product 2',
    description: 'Another sample product description',
    price: 49.99,
    category: 'clothing',
    image: 'https://via.placeholder.com/300x200',
    in_stock: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper functions for product management
export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(product => product.category === category);
};

export const getInStockProducts = (): Product[] => {
  return products.filter(product => product.in_stock);
};

// Export default for easier importing
export default products;
