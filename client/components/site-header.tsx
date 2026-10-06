"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const { user, status, logout } = useAuth();

  return (
    <header className="border-b">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 p-4"
      >
        <Link href="/" className="text-lg font-semibold">
          my-shelfie
        </Link>

        {status === "anonymous" && (
          <ul className="flex items-center gap-2">
            <li>
              <Link href="/login" className="rounded px-3 py-2 hover:underline">
                Log in
              </Link>
            </li>
            <li>
              <Link href="/register" className="rounded bg-foreground px-3 py-2 text-background">
                Register
              </Link>
            </li>
          </ul>
        )}

        {status === "authenticated" && user && (
          <ul className="flex flex-wrap items-center gap-3">
            <li>
              <Link href="/dashboard" className="hover:underline">
                My shelf
              </Link>
            </li>
            <li className="text-sm opacity-70">{user.name}</li>
            <li>
              <button onClick={() => logout()} className="rounded border px-3 py-1.5">
                Log out
              </button>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
