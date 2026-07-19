import React from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function CartDrawer() {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    cartTotal 
  } = useCart();

  const navigate = useNavigate();

  // If cart is closed, we don't render the backdrop, but we keep the drawer for transition
  if (!isCartOpen) {
    // We still return the structure but with translate-x-full to hide it
    // This allows the animation to work when it opens
  }

  return (
    <>
      {/* 1. The Dark Backdrop (Click to close) */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* 2. The Sliding Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isCartOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <h2 className="text-xl font-serif text-stone-900">Shopping Bag ({cart.length})</h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="text-stone-400 hover:text-stone-900 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 h-[calc(100vh-250px)]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400">
              <p className="text-sm uppercase tracking-widest">Your bag is empty</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="mt-4 text-xs underline hover:text-stone-900"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 bg-stone-100 rounded-sm flex-shrink-0 overflow-hidden">
                   {item.image && (
                     <img src={`${API_BASE_URL}${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                   )}
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-stone-900">{item.name}</h3>
                    <p className="text-xs text-stone-500 mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-stone-900">
                      PKR {Number(item.price * item.quantity).toLocaleString()}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-[10px] uppercase tracking-wider text-red-900/40 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Total & Checkout) */}
        {cart.length > 0 && (
          <div className="absolute bottom-0 w-full bg-white border-t border-stone-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-stone-500 uppercase tracking-widest">Subtotal</span>
              <span className="text-lg font-medium text-stone-900">PKR {cartTotal.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-stone-400 mb-6 text-center">Shipping & taxes calculated at checkout</p>
            <button className="w-full bg-stone-900 text-white py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors" onClick={() => {
    setIsCartOpen(false); // Close drawer
    navigate('/checkout'); // Go to page
  }}>
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}