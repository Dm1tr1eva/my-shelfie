import Link from "next/link";
import type { Book } from "@/lib/books";

export function GapTile({
  number,
  seriesId,
  wantedBook,
}: {
  number: number;
  seriesId: string;
  wantedBook?: Book;
}) {
  const href = wantedBook ? `/books/${wantedBook.id}` : `/add?series=${seriesId}&number=${number}`;

  return (
    <li>
      <Link href={href} className="flex flex-col gap-2">
        <span className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-cover border-2 border-dashed border-burgundy bg-burgundy/[0.06] px-2 text-center">
          <span className="text-lg font-bold text-burgundy">#{number}</span>
          <span className="text-xs font-semibold text-burgundy">Missing from the series</span>
          {wantedBook && <span className="text-xs text-ink-soft">On wishlist</span>}
        </span>
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug">
          {wantedBook ? wantedBook.title : "Not in library"}
        </span>
      </Link>
    </li>
  );
}
