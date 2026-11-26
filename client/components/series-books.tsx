"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { StatusDot, WishlistLabel } from "@/components/chips";
import { ChevronRightIcon, PlusIcon } from "@/components/icons";
import { ProgressBar } from "@/components/progress-bar";
import type { Book } from "@/lib/books";
import { isOwned } from "@/lib/catalogue";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { useBookProgress } from "@/lib/progress";
import type { Series } from "@/lib/series";
import type { GapSlot, SeriesSlot } from "@/lib/shelves";

const ROW =
  "grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-4 md:grid-cols-[54px_76px_minmax(0,1fr)_auto] md:px-6 lg:grid-cols-[62px_76px_minmax(0,1fr)_auto]";

function rangeText(from: number, to: number) {
  return from === to ? `#${from}` : `#${from}–${to}`;
}

function ReadingProgress({ book }: { book: Book }) {
  const t = useT();
  const percent = useBookProgress(book.id);

  return (
    <ProgressBar
      percent={percent}
      label={t("book.panel.progress")}
      valueText={t("book.panel.progressLabel", { percent })}
    />
  );
}

function BookRow({ book }: { book: Book }) {
  const domain = useDomain();
  const owned = isOwned(book);
  const number = book.seriesNumber;

  return (
    <li className="border-t border-mist">
      <Link href={`/books/${book.id}`} className={`${ROW} hover:bg-row-hover`}>
        <span aria-hidden="true" className="num hidden text-xl text-muted md:block">
          {number === undefined ? "" : `#${number}`}
        </span>
        <span className={`md:[&_.num]:hidden ${owned ? "" : "opacity-50 saturate-[.6]"}`}>
          <BookCover url={book.coverUrl} title={book.title} number={number} format={book.format} />
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="text-base font-semibold leading-snug md:font-serif md:text-xl lg:text-[21px]">
            {book.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            {owned ? (
              <>
                <StatusDot status={book.status} format={book.format} />
                <span aria-hidden="true" className="text-mist">
                  ·
                </span>
                <span className="text-muted">{domain.format(book.format)}</span>
              </>
            ) : (
              <WishlistLabel />
            )}
          </span>
          {owned && book.status === "reading" && <ReadingProgress book={book} />}
        </span>
        <span aria-hidden="true" className="btn-round h-9 w-9 md:h-11 md:w-11">
          <ChevronRightIcon size={18} />
        </span>
      </Link>
    </li>
  );
}

function GapRow({ series, gap }: { series: Series; gap: GapSlot }) {
  const t = useT();
  const range = rangeText(gap.from, gap.to);
  const source = series.expected.find(
    (entry) =>
      entry.number >= gap.from && entry.number <= gap.to && entry.expectedYear === gap.expectedYear,
  )?.source;

  return (
    <li className={`${ROW} border-t border-mist`}>
      <span aria-hidden="true" className="num hidden text-xl text-burgundy md:block">
        {range}
      </span>
      <span
        aria-hidden="true"
        className="flex aspect-[2/3] items-start rounded-cover border-[1.5px] border-dashed border-burgundy bg-burgundy/5 p-1.5"
      >
        <span className="num text-[11px] text-burgundy md:hidden">{range}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-semibold text-burgundy md:font-serif md:text-xl">
          {t("series.page.gap.title")}
        </span>
        {gap.expectedYear !== undefined && source && (
          <span className="text-[13px] text-muted">
            {t("series.page.gap.expected", {
              source: t(`series.page.gap.source.${source}`),
              year: gap.expectedYear,
            })}
          </span>
        )}
      </span>
      <Link
        href={`/add?series=${series.id}&number=${gap.from}`}
        aria-label={t("series.page.gap.add", { range })}
        className="btn-round h-9 w-9 border-burgundy text-burgundy md:h-11 md:w-11"
      >
        <PlusIcon size={18} />
      </Link>
    </li>
  );
}

export function SeriesBooks({ series, slots }: { series: Series; slots: SeriesSlot[] }) {
  const t = useT();

  return (
    <section aria-labelledby="series-books-heading" className="card overflow-hidden">
      <h2
        id="series-books-heading"
        className="px-4 pb-4 pt-5 text-[21px] font-semibold md:px-6 md:text-2xl lg:text-[26px]"
      >
        {t("series.page.books")}
      </h2>
      {slots.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-mist px-4 py-6 md:px-6">
          <p className="text-muted">{t("series.page.empty")}</p>
          <Link href={`/add?series=${series.id}&number=1`} className="btn-outline">
            <PlusIcon size={18} />
            {t("series.page.addFirst")}
          </Link>
        </div>
      ) : (
        <ul>
          {slots.map((slot) =>
            slot.kind === "book" ? (
              <BookRow key={slot.book.id} book={slot.book} />
            ) : (
              <GapRow key={`gap-${slot.from}`} series={series} gap={slot} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
