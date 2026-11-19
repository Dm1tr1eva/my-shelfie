"use client";

import Link from "next/link";
import { WishlistLabel } from "@/components/chips";
import type { Book } from "@/lib/books";
import { useT } from "@/lib/i18n";

export function GapTile({
  number,
  seriesId,
  wantedBook,
}: {
  number: number;
  seriesId: string;
  wantedBook?: Book;
}) {
  const t = useT();
  const href = wantedBook ? `/books/${wantedBook.id}` : `/add?series=${seriesId}&number=${number}`;

  return (
    <li>
      <Link href={href} className="flex flex-col gap-2">
        <span className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-cover border-2 border-dashed border-burgundy bg-burgundy/[0.06] px-2 text-center">
          <span className="num text-lg text-burgundy">#{number}</span>
          <span className="text-xs font-semibold text-burgundy">{t("library.gap.missing")}</span>
          {wantedBook && <WishlistLabel />}
        </span>
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug">
          {wantedBook ? wantedBook.title : t("library.gap.notInLibrary")}
        </span>
      </Link>
    </li>
  );
}
