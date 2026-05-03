import { createContext, useContext, useState, type ReactNode } from 'react';

interface CartItem {
  _id: string;
  name: string;
  brand: string;
  price_per_day: number;
  images: string[];
  category: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (camera: any) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => { },
  removeFromCart: () => { },
  clearCart: () => { },
  totalItems: 0,
  totalPrice: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (camera: any) => {
    setItems(prev => {
      const existing = prev.find(i => i._id === camera._id);
      if (existing) return prev;
      return [...prev, { ...camera, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, i) => sum + i.price_per_day, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
