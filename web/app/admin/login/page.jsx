"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
      router.replace("/admin/products");
    } catch (err) {
      setError(err.message || "Incorrect username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-6 bg-stone-50">
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-sm p-8 shadow-sm">
        <h1 className="text-2xl font-serif text-stone-900 text-center mb-1">
          Magnolia Admin
        </h1>
        <p className="text-xs uppercase tracking-widest text-stone-400 text-center mb-8">
          Store Management
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs uppercase tracking-widest text-stone-500 mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs uppercase tracking-widest text-stone-500 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-stone-200 p-3 text-sm focus:outline-stone-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-stone-900 text-white py-4 text-xs uppercase tracking-[0.2em] hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing In…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
