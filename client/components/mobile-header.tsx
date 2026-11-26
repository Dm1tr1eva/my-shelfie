"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { ArrowLeftIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";
import { isInnerPage } from "@/lib/nav";

export function MobileHeader() {
  const inner = isInnerPage(usePathname());
  const t = useT();

  return (
    <header className="flex h-14 items-center justify-between bg-navy pl-4 pr-2 text-page md:hidden">
      {inner ? (
        <Link
          href="/library"
          className="-ml-2.5 inline-flex min-h-11 items-center gap-1 rounded-control px-2.5 font-semibold hover:bg-page/10 focus-visible:outline-page"
        >
          <ArrowLeftIcon />
          <span className="sr-only">{t("shell.nav.backTo")}</span> {t("shell.nav.library")}
        </Link>
      ) : (
        <>
          <Logo href="/dashboard" />
          <AccountMenu />
        </>
      )}
    </header>
  );
}
