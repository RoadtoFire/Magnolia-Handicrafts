import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function OrderSuccess() {
  const location = useLocation();
  // We will pass the order ID via the router state
  const orderId = location.state?.orderId || "Confirmed"; 

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      
      {/* Animated Checkmark */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>

      <h1 className="text-3xl font-serif text-stone-900 mb-2">Thank You!</h1>
      <p className="text-stone-500 mb-8">Your order <span className="font-bold text-stone-800">#{orderId}</span> has been placed successfully.</p>
      
      <div className="bg-stone-50 p-6 rounded-sm mb-8 max-w-md w-full border border-stone-200">
        <p className="text-sm text-stone-600 mb-2">We will verify your order via phone call shortly.</p>
        <p className="text-xs text-stone-400">Please check your email for the invoice.</p>
      </div>

      <Link 
        to="/" 
        className="bg-stone-900 text-white px-8 py-3 text-xs uppercase tracking-widest hover:bg-stone-700 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}