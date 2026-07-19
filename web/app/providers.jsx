"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CART_STORAGE_KEY = "magnolia_cart";

const CartContext = createContext(undefined);

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

export function CartProvider({ children }) {
  // Start empty on both server and client so SSR markup matches the first
  // client render (localStorage doesn't exist on the server). The saved
  // cart is hydrated in the effect below, right after mount.
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage once, on the client only. This intentionally
  // starts both server and client renders from `[]` and updates state after
  // mount, rather than reading localStorage in a lazy useState initializer,
  // to avoid a hydration mismatch (the server has no localStorage at all, so
  // the very first client render must match its empty-cart markup exactly).
  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      // See the comment above this effect for why this one-time,
      // client-only localStorage hydration can't be a lazy initializer.
      if (savedCart) setCart(JSON.parse(savedCart)); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      // Corrupt or inaccessible storage — just start with an empty cart.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage whenever the cart changes (skip the initial
  // pre-hydration render so we don't clobber saved data with `[]`).
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage may be unavailable (private browsing, quota, etc).
    }
  }, [cart, isHydrated]);

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
