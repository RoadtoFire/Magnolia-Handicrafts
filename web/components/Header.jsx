"use client";

import Link from "next/link";
import { useCart } from "@/app/providers";

export default function Header() {
  const { setIsCartOpen, cartCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 transition-all duration-300">
      {/* Top Bar */}
      <div className="bg-stone-900 text-white text-[10px] text-center py-2 uppercase tracking-widest">
        Free Shipping on Orders Above PKR 5,000
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* LEFT: Socials & Contact */}
          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/magnoliabyrahatjamal/"
              target="_blank"
              rel="noreferrer"
              className="text-stone-500 hover:text-stone-900 transition-colors"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>

            <a
              href="mailto:magnoliabyrahatjamal@gmail.com"
              className="text-stone-500 hover:text-stone-900 transition-colors"
              aria-label="Email"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </a>
          </div>

          {/* CENTER: Logo (Swaying Animation) */}
          <Link href="/" className="flex flex-col items-center group">
            <div className="relative w-12 h-12 flex justify-center items-end overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-sway origin-bottom">
                <path d="M50 100 Q50 50 50 40" stroke="#57534e" strokeWidth="2" fill="none" />
                <path d="M50 80 Q30 70 30 80 Q40 90 50 85" fill="#78716c" />
                <path d="M50 60 Q70 50 70 60 Q60 70 50 65" fill="#78716c" />
                <circle cx="50" cy="35" r="15" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="1" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-stone-900 tracking-[0.15em] leading-none group-hover:opacity-70 transition-opacity">
              MAGNOLIA
            </h1>
          </Link>

          {/* RIGHT: Actions (Cart) */}
          <div className="flex items-center gap-6">
            <button className="text-stone-500 hover:text-stone-900 transition-colors" aria-label="Search">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2"
              aria-label="Open cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-stone-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Second row of links */}
        <nav className="flex justify-center gap-8 mt-4 text-xs uppercase tracking-widest text-stone-500">
          <div className="hover:text-stone-900 hover:underline underline-offset-4">Custom Paint Designs</div>
          <div className="hover:text-stone-900 hover:underline underline-offset-4">Silk Painted Dresses</div>
          <div className="hover:text-stone-900 hover:underline underline-offset-4">Cushions</div>
        </nav>
      </div>
    </header>
  );
}
