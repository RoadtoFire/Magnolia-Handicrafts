import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import API_BASE_URL from '../config';

export default function ProductGallery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/products/`)
      .then(response => {
        setProducts(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="w-full flex justify-center py-20">
      <p className="text-xs uppercase tracking-widest text-stone-400 animate-pulse">
        Loading Collection...
      </p>
    </div>
  );

  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-stone-200 pb-4">
        <h2 className="text-xl font-serif text-stone-800">Latest Collection</h2>
        <span className="text-xs text-stone-500 uppercase tracking-widest">{products.length} Items</span>
      </div>

      {/* THE GRID: 4 Columns on Desktop for small, neat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}