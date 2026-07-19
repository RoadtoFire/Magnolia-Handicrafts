"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Loaded client-only and only after the hero's real content has already
// painted — see the mount-delay effect below. This keeps three.js entirely
// out of the critical path for the hero text/video (LCP) and out of the
// server-rendered HTML.
const HeroAccent = dynamic(() => import("./HeroAccent"), { ssr: false });

export default function Hero() {
  const [showAccent, setShowAccent] = useState(false);

  useEffect(() => {
    // Skip the 3D accent on small/mobile viewports — the visual payoff
    // isn't worth the extra GPU/CPU cost on constrained devices.
    if (window.innerWidth < 768) return;

    let idleId;
    let timeoutId;

    const mount = () => setShowAccent(true);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(mount, { timeout: 2000 });
    } else {
      // Safari (and any other browser without requestIdleCallback).
      timeoutId = window.setTimeout(mount, 1800);
    }

    return () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative w-full h-[85vh] overflow-hidden bg-stone-200">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-90"
      >
        <source src="/Vid2.mp4" type="video/mp4" />
      </video>

      {showAccent && <HeroAccent />}

      <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-center text-white px-4">
        <p className="text-xs md:text-sm uppercase tracking-[0.3em] mb-4 drop-shadow-md animate-fade-in-up">
          Handcrafted Custom Designs
        </p>

        <h2 className="text-5xl md:text-7xl font-serif mb-8 drop-shadow-lg tracking-wide">
          Magnolia by Rahat Jamal
        </h2>

        <a
          href="#collection"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 800, behavior: "smooth" });
          }}
          className="bg-white text-stone-900 px-10 py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-900 hover:text-white transition-all duration-300"
        >
          Shop Now
        </a>
      </div>
    </div>
  );
}
