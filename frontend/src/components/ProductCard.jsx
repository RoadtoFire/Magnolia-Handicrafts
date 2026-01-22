import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import API_BASE_URL from '../config';

export default function ProductCard({ product }) {
  const imageUrl = product.image ? `${API_BASE_URL}${product.image}` : null;

  return (
    // CHANGE 1: Use Link instead of div and point to /product/ID
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white border border-stone-200 rounded-sm overflow-hidden hover:shadow-xl transition-all duration-300">
      
      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <span className="text-[10px] uppercase tracking-widest">No Image</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 text-center">
        <h3 className="text-sm font-serif text-stone-900 line-clamp-1">
          {product.name}
        </h3>
        
        <p className="mt-1 text-xs text-stone-500 line-clamp-2 min-h-[2.5em]">
          {product.description || "Luxury lawn collection."}
        </p>
        
        <div className="mt-4 pt-3 border-t border-stone-100 w-full">
          <span className="text-sm font-bold text-stone-800">
            PKR {Number(product.price).toLocaleString()}
          </span>
        </div>

        {/* Change button to span/div since it's inside a Link anchor tag now */}
        <div className="mt-3 w-full bg-stone-800 text-white text-[10px] uppercase tracking-widest py-2 group-hover:bg-stone-600 transition-colors">
          View Details
        </div>
      </div>

    </Link>
  );
}