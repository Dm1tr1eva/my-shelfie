"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function HeroActions() {
  const { status } = useAuth();

  if (status === "authenticated") {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="btn-primary px-5 py-3">
          Go to my shelf
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/register" className="btn-primary px-5 py-3">
        Get started
      </Link>
      <Link href="/login" className="btn-outline px-5 py-3">
        Log in
      </Link>
    </div>
  );
}
