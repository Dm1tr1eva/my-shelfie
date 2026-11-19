"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { BagIcon, HeartIcon, LibraryIcon, PlusIcon } from "@/components/icons";
import { useT, type MessageKey } from "@/lib/i18n";

type Item = { href: string; label: MessageKey; icon: React.ReactNode };

const ITEMS: Item[] = [
  { href: "/library", label: "shell.nav.library", icon: <LibraryIcon /> },
  { href: "/wishlist", label: "shell.nav.wishlist", icon: <HeartIcon /> },
];

const ITEMS_AFTER_ADD: Item[] = [
  { href: "/next", label: "shell.nav.nextToBuy", icon: <BagIcon /> },
];

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: MessageKey;
  icon: React.ReactNode;
  active: boolean;
}) {
  const t = useT();

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-col items-center gap-1 rounded-control px-2 py-1 text-xs ${
        active ? "bg-mist/20 font-bold text-page" : "text-mist"
      }`}
    >
      {icon}
      <span>{t(label)}</span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const t = useT();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label={t("shell.nav.main")}
      className="fixed inset-x-0 bottom-0 z-20 grid h-[calc(78px+env(safe-area-inset-bottom))] grid-cols-5 items-center bg-navy px-2 pb-[env(safe-area-inset-bottom)] text-page md:hidden"
    >
      {ITEMS.map((item) => (
        <TabLink key={item.href} {...item} active={isActive(item.href)} />
      ))}

      <Link
        href="/add"
        aria-label={t("shell.nav.addBook")}
        aria-current={pathname === "/add" ? "page" : undefined}
        className="mx-auto -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-burgundy text-card ring-4 ring-page"
      >
        <PlusIcon size={26} />
      </Link>

      {ITEMS_AFTER_ADD.map((item) => (
        <TabLink key={item.href} {...item} active={isActive(item.href)} />
      ))}

      <AccountMenu variant="tab" />
    </nav>
  );
}
