"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { Logo } from "@/components/logo";
import { PlusIcon } from "@/components/icons";
import { useT, type MessageKey } from "@/lib/i18n";
import { activeSection, type Section } from "@/lib/nav";

const NAV_LINKS: { href: string; section: Section; label: MessageKey }[] = [
  { href: "/library", section: "library", label: "shell.nav.library" },
  { href: "/wishlist", section: "wishlist", label: "shell.nav.wishlist" },
];

export function AppNav() {
  const active = activeSection(usePathname());
  const t = useT();

  return (
    <header className="hidden bg-navy text-page md:block">
      <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between gap-4 px-8">
        <Logo href="/dashboard" />

        <nav aria-label={t("shell.nav.main")}>
          <ul className="flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active === link.section ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-control px-2.5 focus-visible:outline-page text-sm font-medium lg:px-3.5 lg:text-[15px] ${
                    active === link.section
                      ? "bg-mist/[0.18] text-page"
                      : "text-mist hover:text-page"
                  }`}
                >
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/add"
            className="btn-beige min-h-10 whitespace-nowrap focus-visible:outline-page"
          >
            <PlusIcon />
            {t("shell.nav.addBook")}
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
