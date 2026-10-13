"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { PlusIcon } from "@/components/icons";

export const NAV_LINKS = [
  { href: "/library", label: "Library" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/next", label: "Next to buy" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="hidden bg-navy text-page md:block">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-8"
      >
        <Link href="/library" className="font-serif text-2xl font-bold">
          my-shelfie
        </Link>

        <ul className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-control px-3 font-medium ${
                    active ? "bg-mist/20 text-page" : "text-mist hover:text-page"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <Link href="/add" className="btn-beige">
            <PlusIcon />
            Add a book
          </Link>
          <AccountMenu variant="avatar" />
        </div>
      </nav>
    </header>
  );
}
