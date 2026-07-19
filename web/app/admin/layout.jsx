"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, logout } from "@/lib/api";

const NAV_LINKS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

/**
 * Soft UX gate for the whole /admin/* section. The real security boundary
 * is the backend's IsAdminUser permission checks (already enforced on every
 * admin endpoint) — this is purely so the store owner never sees a flash of
 * protected content or gets stuck on a blank page: check session on mount,
 * show a loading state while checking, bounce to /admin/login on failure.
 *
 * The login page itself renders through this same layout (Next.js nests
 * app/admin/login/page.jsx under here), so we special-case it to skip the
 * auth check entirely and render chrome-free — otherwise we'd redirect-loop
 * (check fails -> redirect to login -> layout mounts again -> check fails...).
 */
export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  const [status, setStatus] = useState(isLoginPage ? "n/a" : "checking");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (isLoginPage) return;

    let cancelled = false;
    (async () => {
      const me = await getMe();
      if (cancelled) return;
      if (me) {
        setUsername(me.username || "");
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
        router.replace("/admin/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  if (isLoginPage) {
    return <div className="flex-1 flex flex-col">{children}</div>;
  }

  if (status !== "authenticated") {
    // Covers both "checking" and "unauthenticated" (the latter is only
    // visible for an instant before the redirect above kicks in).
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-stone-50">
        <p className="text-xs uppercase tracking-widest text-stone-400">
          Checking sign-in&hellip;
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-stone-100">
      <header className="sticky top-0 z-40 bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/admin/products" className="font-serif text-lg tracking-wide">
              Magnolia Admin
            </Link>
            <nav className="flex items-center gap-6 text-xs uppercase tracking-widest text-stone-300">
              {NAV_LINKS.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={active ? "text-white" : "hover:text-white transition-colors"}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {username && (
              <span className="text-xs text-stone-400 hidden sm:inline">
                Signed in as {username}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs uppercase tracking-widest bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-sm transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
