import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

export function Section({
  id,
  title,
  more,
  className = "",
  children,
}: {
  id: string;
  title: React.ReactNode;
  more?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`card flex min-w-0 flex-col gap-4 p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={id}
          tabIndex={-1}
          className="font-serif text-xl font-semibold outline-none lg:text-[22px]"
        >
          {title}
        </h2>
        {more && (
          <Link
            href={more.href}
            className="inline-flex min-h-10 items-center gap-0.5 whitespace-nowrap rounded-pill border border-slate pl-2.5 pr-1.5 text-xs font-semibold text-navy hover:bg-beige"
          >
            {more.label}
            <ChevronRightIcon size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-muted">{children}</p>;
}
