"use client";

import { useEffect } from "react";

/**
 * A minimal self-dismissing toast — no toast library needed for a single
 * "Photos added!" / "Product deleted." style message at a time. Render it
 * once per page with `message` in state; it clears itself via `onDone`
 * after `duration` ms, or the caller can dismiss it early.
 */
export default function Toast({ message, onDone, duration = 3000 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[60] max-w-sm bg-stone-900 text-white text-sm px-5 py-3 rounded-sm shadow-xl"
    >
      {message}
    </div>
  );
}
