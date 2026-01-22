import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  // Load cart from LocalStorage (so items persist if they refresh)
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('magnolia_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Save to LocalStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('magnolia_cart', JSON.stringify(cart));
  }, [cart]);

  // Function to Add Item
  const addToCart = (product) => {
    setCart(currentCart => {
      // Check if item already exists
      const existingItem = currentCart.find(item => item.id === product.id);
      
      if (existingItem) {
        // If yes, just increase quantity
        return currentCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      // If no, add new item with quantity 1
      return [...currentCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true); // Auto-open cart when user adds item
  };

  // Function to Remove Item
  const removeFromCart = (id) => {
    setCart(currentCart => currentCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]); // Reset state to empty array
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart,
      clearCart, 
      isCartOpen, 
      setIsCartOpen,
      cartTotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
}