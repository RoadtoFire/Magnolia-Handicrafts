import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart(); // Get cart data
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Format data for Django
    const orderPayload = {
      ...formData,
      total_amount: cartTotal,
      items: cart.map(item => ({
        product: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    };

    try {
      // 2. Send to Backend
      await axios.post('${API_BASE_URL}/api/orders/', orderPayload);
      
      // 3. Success!
      const response = await axios.post('${API_BASE_URL}/api/orders/', orderPayload);

      localStorage.removeItem('magnolia_cart'); // Clear Cart
      // Navigate to success page and PASS the Order ID
      navigate('/order-success', { state: { orderId: response.data.id } });
      clearCart();
      localStorage.removeItem('magnolia_cart'); // Clear cart
      navigate('/order-success', { state: { orderId: response.data.id } });
    } catch (error) {
      console.error("Order failed:", error);
      alert("Something went wrong. Check console.");
    }
  };

  if (cart.length === 0) return <div className="text-center mt-20">Your cart is empty.</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-serif text-stone-900 mb-8 text-center">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* LEFT: FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Full Name</label>
            <input required name="full_name" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="text" placeholder="e.g. Rahat Jamal" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Email</label>
            <input required name="email" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="email" placeholder="e.g. rahat@example.com" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Phone</label>
            <input required name="phone" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="tel" placeholder="e.g. 0300-1234567" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">City</label>
            <input required name="city" onChange={handleChange} className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" type="text" placeholder="e.g. Islamabad" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Address</label>
            <textarea required name="address" onChange={handleChange} rows="3" className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900" placeholder="e.g. House 12, Street 4, F-7/2"></textarea>
          </div>
          
          <button type="submit" className="w-full bg-stone-900 text-white py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors">
            Place Order
          </button>
        </form>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="bg-stone-50 p-8 h-fit">
          <h2 className="text-lg font-serif mb-6">Order Summary</h2>
          <div className="space-y-4 mb-6 border-b border-stone-200 pb-6">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantity} x {item.name}</span>
                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>PKR {cartTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}