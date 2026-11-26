"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { Muted, Section } from "@/components/dashboard/section";
import { StarIcon } from "@/components/icons";
import { useLocale, useT } from "@/lib/i18n";
import type { HomeStats } from "@/lib/stats";

function capitalized(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function useMonthNames() {
  const format = new Intl.DateTimeFormat(useLocale(), { month: "long", timeZone: "UTC" });
  return (month: number) => capitalized(format.format(new Date(Date.UTC(2026, month - 1, 1))));
}

const CARD_WIDTH = "15rem";
const HOVER_CLOSE_DELAY_MS = 200;

function cardLeft(month: number) {
  const centre = ((month - 0.5) / 12) * 100;
  return `clamp(0px, calc(${centre}% - ${CARD_WIDTH} / 2), calc(100% - ${CARD_WIDTH}))`;
}

function MonthCard({
  id,
  label,
  month,
  books,
}: {
  id: string;
  label: string;
  month: number;
  books: HomeStats["readPerMonth"][number]["books"];
}) {
  const t = useT();

  return (
    <div
      id={id}
      role="region"
      aria-label={label}
      style={{ left: cardLeft(month), width: CARD_WIDTH }}
      className="absolute bottom-full z-20 flex max-w-full flex-col gap-2 rounded-popover bg-card p-3 shadow-popover"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <ul className="flex flex-col gap-2">
        {books.map((book) => (
          <li key={book.id} className="flex items-center gap-2">
            <BookCover url={book.coverUrl} title={book.title} size="sm" />
            <div className="min-w-0">
              <Link
                href={`/books/${book.id}`}
                className="block truncate text-sm font-semibold hover:underline"
              >
                {book.title}
              </Link>
              <p className="flex items-center gap-1 text-xs text-muted">
                {book.series &&
                  `${book.series.title}${book.series.number !== undefined ? ` #${book.series.number}` : ""}`}
                {book.series && book.rating !== undefined && " · "}
                {book.rating !== undefined && (
                  <span
                    role="img"
                    aria-label={t("dashboard.months.rating", { rating: book.rating })}
                    className="inline-flex items-center gap-0.5 text-burgundy"
                  >
                    <StarIcon size={11} filled />
                    {book.rating}
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthsChart({ stats }: { stats: HomeStats }) {
  const t = useT();
  const monthName = useMonthNames();
  const [open, setOpen] = useState<{ month: number; pinned: boolean } | null>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chart = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const highest = Math.max(1, ...stats.readPerMonth.map((entry) => entry.books.length));
  const opened = stats.readPerMonth.find((entry) => entry.month === open?.month);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!chart.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      clearTimeout(closing.current);
    };
  }, []);

  function toggle(month: number) {
    clearTimeout(closing.current);
    setOpen((current) =>
      current?.month === month && current.pinned ? null : { month, pinned: true },
    );
  }

  return (
    <Section id="home-months" title={t("dashboard.months.title")}>
      {stats.readCount === 0 && <Muted>{t("dashboard.months.empty", { year: stats.year })}</Muted>}
      <div
        ref={chart}
        className="relative"
        onPointerEnter={() => clearTimeout(closing.current)}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          closing.current = setTimeout(
            () => setOpen((current) => (current?.pinned ? current : null)),
            HOVER_CLOSE_DELAY_MS,
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(null);
        }}
      >
        <ul className="grid grid-cols-12 gap-1 sm:gap-2">
          {stats.readPerMonth.map(({ month, books }) => {
            const name = monthName(month);
            const count = books.length;
            const isOpen = open?.month === month;

            return (
              <li
                key={month}
                className="flex min-w-0 flex-col items-center gap-1"
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse" || count === 0) return;
                  setOpen((current) =>
                    current?.month === month ? current : { month, pinned: false },
                  );
                }}
              >
                <span aria-hidden="true" className="num h-4 text-xs">
                  {count > 0 && count === highest ? count : ""}
                </span>
                <div className="flex h-28 w-full items-end sm:h-32">
                  {count > 0 ? (
                    <button
                      type="button"
                      aria-label={t("dashboard.months.month", { month: name, count })}
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? `${baseId}-card` : undefined}
                      onClick={() => toggle(month)}
                      style={{ height: `${(count / highest) * 100}%` }}
                      className={`w-full min-h-2 rounded-t-[4px] ${isOpen ? "bg-burgundy" : "bg-navy hover:bg-burgundy"}`}
                    />
                  ) : (
                    <span aria-hidden="true" className="h-[3px] w-full rounded-full bg-beige" />
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className={`text-[11px] ${isOpen ? "font-bold text-burgundy" : "text-muted"}`}
                >
                  {name.charAt(0)}
                </span>
              </li>
            );
          })}
        </ul>

        {opened && opened.books.length > 0 && (
          <MonthCard
            id={`${baseId}-card`}
            label={t("dashboard.months.card", {
              month: monthName(opened.month),
              count: opened.books.length,
            })}
            month={opened.month}
            books={opened.books}
          />
        )}
      </div>
    </Section>
  );
}
