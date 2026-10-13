"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { BagIcon, HeartIcon, LibraryIcon, PlusIcon } from "@/components/icons";

const ITEMS = [
  { href: "/library", label: "Library", icon: <LibraryIcon /> },
  { href: "/wishlist", label: "Wishlist", icon: <HeartIcon /> },
];

const ITEMS_AFTER_ADD = [{ href: "/next", label: "Next to buy", icon: <BagIcon /> }];

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-col items-center gap-1 rounded-control px-2 py-1 text-xs ${
        active ? "bg-mist/20 font-bold text-page" : "text-mist"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid h-[78px] grid-cols-5 items-center bg-navy px-2 text-page md:hidden"
    >
      {ITEMS.map((item) => (
        <TabLink key={item.href} {...item} active={isActive(item.href)} />
      ))}

      <Link
        href="/add"
        aria-label="Add a book"
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
