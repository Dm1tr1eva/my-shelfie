"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="mt-auto border-t border-mist">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm text-muted sm:px-8">
        <span>{t("shell.footer.tagline")}</span>
        <Link href="/" className="link inline-flex min-h-11 items-center">
          {t("shell.footer.home")}
        </Link>
        <a
          href="https://github.com/Dm1tr1eva/my-shelfie"
          className="link inline-flex min-h-11 items-center"
        >
          {t("shell.footer.source")}
        </a>
        <Link href="/privacy" className="link inline-flex min-h-11 items-center">
          {t("shell.footer.privacy")}
        </Link>
      </div>
    </footer>
  );
}
