"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, PlusIcon, ShelfIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";
import { activeSection, type Section } from "@/lib/nav";

function SectionTab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-[52px] items-center justify-center rounded-full ${
        active ? "text-page [&_svg]:fill-page/[0.22]" : "text-slate hover:text-mist"
      }`}
    >
      {children}
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const active: Section | null = activeSection(pathname);
  const t = useT();

  return (
    <nav
      aria-label={t("shell.nav.main")}
      className="fixed bottom-[calc(18px+env(safe-area-inset-bottom))] left-1/2 z-20 grid h-16 w-[236px] -translate-x-1/2 grid-cols-3 items-center rounded-pill bg-navy px-2 shadow-tabbar md:hidden"
    >
      <SectionTab href="/library" label={t("shell.nav.library")} active={active === "library"}>
        <ShelfIcon size={28} />
      </SectionTab>

      <Link
        href="/add"
        aria-label={t("shell.nav.addBook")}
        aria-current={pathname === "/add" ? "page" : undefined}
        className="flex h-[52px] items-center justify-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-burgundy text-card">
          <PlusIcon size={26} />
        </span>
      </Link>

      <SectionTab href="/wishlist" label={t("shell.nav.wishlist")} active={active === "wishlist"}>
        <BookmarkIcon size={28} />
      </SectionTab>
    </nav>
  );
}
