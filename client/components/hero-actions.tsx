"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";

export function HeroActions() {
  const { status } = useAuth();

  if (status === "authenticated") {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/library" className="btn-beige min-h-12 px-5">
          Open my library
          <ArrowRightIcon size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link href="/register" className="btn-beige min-h-12 px-5">
        Start your shelf
        <ArrowRightIcon size={18} />
      </Link>
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center px-3 font-medium underline underline-offset-4"
      >
        I already have an account
      </Link>
    </div>
  );
}
