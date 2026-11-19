import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

function LogoMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      <rect width="48" height="48" rx="11" className="fill-navy" />
      <rect x="11" y="14" width="7" height="23" rx="1.5" className="fill-burgundy" />
      <rect x="19.5" y="10" width="7" height="27" rx="1.5" className="fill-beige" />
      <rect
        x="31.6"
        y="15"
        width="7"
        height="22"
        rx="1.5"
        transform="rotate(-14 38.6 37)"
        className="fill-mist"
      />
      <rect x="8" y="36.5" width="32" height="3.5" rx="1.75" className="fill-slate" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-serif text-[21px] font-bold tracking-[-0.01em] text-page md:text-2xl"
    >
      <LogoMark className="h-[30px] w-[30px] shrink-0 md:h-[34px] md:w-[34px]" />
      {APP_NAME}
    </Link>
  );
}
