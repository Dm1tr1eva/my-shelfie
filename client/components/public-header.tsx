"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";

export function PublicHeader({ showSignIn }: { showSignIn: boolean }) {
  const t = useT();

  return (
    <header className="bg-navy text-page">
      <nav
        aria-label={t("shell.nav.main")}
        className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 pl-4 pr-2 sm:px-8 md:h-[68px]"
      >
        <Logo narrowMarkOnly />

        <div className="flex items-center gap-3">
          <LanguageSwitch />
          {showSignIn && (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-pill border border-mist px-5 font-semibold hover:bg-mist/20 focus-visible:outline-page md:min-h-10"
            >
              {t("shell.nav.signIn")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
