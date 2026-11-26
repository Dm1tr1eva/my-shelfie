"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { DesirePill } from "@/components/desire-pill";
import { ChevronRightIcon } from "@/components/icons";
import { SeriesSegments } from "@/components/series-segments";
import { useDesire, type WishlistRow as Row } from "@/lib/wishlist";

function hrefOf(row: Row) {
  return row.type === "series" ? `/series/${row.id}` : `/books/${row.id}`;
}

export function WishlistRow({
  row,
  onChange,
  onFailure,
}: {
  row: Row;
  onChange: (row: Row, desire: Row["desire"]) => void;
  onFailure: (row: Row) => void;
}) {
  const { desire, cycle } = useDesire(row, onFailure);
  const name = [row.title, row.author].filter(Boolean).join(", ");

  return (
    <li className="relative grid grid-cols-[64px_minmax(0,1fr)_36px] grid-rows-[auto_auto] items-center gap-x-3.5 border-t border-page px-3.5 py-3 first:border-t-0 hover:bg-row-hover md:grid-cols-[64px_minmax(0,1fr)_auto_44px] md:grid-rows-1 md:gap-x-4 md:px-[18px] md:py-3.5 lg:grid-cols-[64px_minmax(0,1fr)_140px_44px] lg:gap-x-5 lg:px-5">
      <div className="row-span-2 md:row-span-1">
        <BookCover
          url={row.coverUrl}
          title={row.title}
          size="md"
          format={row.type === "book" ? row.format : undefined}
        />
      </div>

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col self-end md:self-center">
        <h3 className="truncate font-serif text-[17px] font-semibold leading-tight md:text-[19px] lg:text-xl">
          {row.title}
        </h3>
        {row.author && <p className="truncate text-[13px] text-muted md:text-sm">{row.author}</p>}
        {row.type === "series" && (
          <div className="mt-2 flex">
            <SeriesSegments states={row.segments.map((segment) => segment.state)} />
          </div>
        )}
      </div>

      <div className="relative z-10 col-start-2 row-start-2 self-start md:col-start-3 md:row-start-1 md:self-center md:justify-self-end">
        <DesirePill
          desire={desire}
          onCycle={() => {
            const next = cycle();
            onChange(row, next);
          }}
        />
      </div>

      <Link
        href={hrefOf(row)}
        aria-label={name}
        className="col-start-3 row-span-2 row-start-1 inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-full border border-mist bg-card text-ink after:absolute after:inset-0 after:content-[''] md:col-start-4 md:row-span-1 md:h-11 md:w-11"
      >
        <ChevronRightIcon size={20} />
      </Link>
    </li>
  );
}
