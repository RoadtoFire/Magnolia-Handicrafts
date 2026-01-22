import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext'; // 1. Import Hook
import API_BASE_URL from '../config';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart(); // 2. Get the function
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/products/${id}/`)
      .then(response => {
        setProduct(response.data);
        setLoading(false);
      })
      .catch(error => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center mt-20 text-stone-400">LOADING...</div>;
  if (!product) return <div className="text-center mt-20">Item not found</div>;

  const imageUrl = product.image ? `${API_BASE_URL}${product.image}` : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-widest text-stone-500 mb-8 inline-block">← Back</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-stone-100 aspect-square relative rounded-sm overflow-hidden">
          {imageUrl && <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />}
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-serif text-stone-900 mb-2">{product.name}</h1>
          <p className="text-2xl font-medium text-stone-800 mb-8">PKR {Number(product.price).toLocaleString()}</p>
          
          {/* 3. Attach the Click Handler */}
          <button 
            onClick={() => addToCart(product)}
            className="w-full md:w-auto bg-stone-900 text-white px-12 py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}