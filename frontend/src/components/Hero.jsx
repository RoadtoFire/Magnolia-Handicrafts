import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="relative w-full h-[85vh] overflow-hidden bg-stone-200">
      
      {/* VIDEO BACKGROUND 
         1. Put your video file (e.g., 'banner.mp4') in the 'public' folder.
         2. Change src="/banner.mp4" below.
      */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-90"
      >
        <source src="/Vid2.mp4" type="video/mp4" />
        {/* If video fails, it falls back to background color */}
      </video>

      {/* OVERLAY CONTENT */}
      <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-center text-white px-4">
        
        <p className="text-xs md:text-sm uppercase tracking-[0.3em] mb-4 drop-shadow-md animate-fade-in-up">
          Handcrafted Custom Designs
        </p>
        
        <h2 className="text-5xl md:text-7xl font-serif mb-8 drop-shadow-lg tracking-wide">
          Magnolia by Rahat Jamal
        </h2>

        <Link 
          to="/" 
          onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}
          className="bg-white text-stone-900 px-10 py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-900 hover:text-white transition-all duration-300"
        >
          Shop Now
        </Link>

      </div>
    </div>
  );
}