"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { useT } from "@/lib/i18n";

export function PublicHeader({ showSignIn }: { showSignIn: boolean }) {
  const t = useT();

  return (
    <header className="bg-navy text-page">
      <nav
        aria-label={t("shell.nav.main")}
        className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8"
      >
        <Link href="/" className="font-serif text-2xl font-bold">
          my-shelfie
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitch />
          {showSignIn && (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-control border border-mist px-4 font-semibold hover:bg-mist/20"
            >
              {t("shell.nav.signIn")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
