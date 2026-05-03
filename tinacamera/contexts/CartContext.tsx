import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  _id: string;
  name: string;
  brand: string;
  category: string;
  price_per_day: number;
  price_per_week?: number;
  deposit_amount: number;
  image?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (camera: any) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  itemCount: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => false,
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotal: () => 0,
  itemCount: 0,
});

export function useCart() {
  return useContext(CartContext);
}

const CART_STORAGE_KEY = 'cart_items';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const saved = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          setItems(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Lỗi khi đọc giỏ hàng:', error);
      }
    };
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Lỗi khi lưu giỏ hàng:', error);
      }
    };
    saveCart();
  }, [items]);

  const addToCart = useCallback((camera: any): boolean => {
    const existing = items.find((item) => item._id === camera._id);
    if (existing) {
      // Already in cart, increase quantity
      setItems((prev) =>
        prev.map((item) =>
          item._id === camera._id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      const newItem: CartItem = {
        _id: camera._id,
        name: camera.name,
        brand: camera.brand,
        category: camera.category,
        price_per_day: camera.price_per_day,
        price_per_week: camera.price_per_week,
        deposit_amount: camera.deposit_amount,
        image: camera.images?.[0] || null,
        quantity: 1,
      };
      setItems((prev) => [...prev, newItem]);
    }
    return true;
  }, [items]);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item._id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item._id !== id));
    } else {
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, quantity } : item))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price_per_day * item.quantity, 0);
  }, [items]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
