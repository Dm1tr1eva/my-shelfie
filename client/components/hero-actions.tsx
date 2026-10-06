"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function HeroActions() {
  const { status } = useAuth();

  if (status === "authenticated") {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded bg-foreground px-5 py-3 text-background">
          Go to my shelf
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/register" className="rounded bg-foreground px-5 py-3 text-background">
        Get started
      </Link>
      <Link href="/login" className="rounded border px-5 py-3">
        Log in
      </Link>
    </div>
  );
}
