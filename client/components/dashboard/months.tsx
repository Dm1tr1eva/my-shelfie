"use client";

import Link from "next/link";
import { useId, useState } from "react";
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

function cardAlign(month: number) {
  if (month <= 2) return "left-0";
  if (month >= 11) return "right-0";
  return "left-1/2 -translate-x-1/2";
}

export function MonthsChart({ stats }: { stats: HomeStats }) {
  const t = useT();
  const monthName = useMonthNames();
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  const highest = Math.max(1, ...stats.readPerMonth.map((entry) => entry.books.length));

  return (
    <Section id="home-months" title={t("dashboard.months.title")}>
      {stats.readCount === 0 && <Muted>{t("dashboard.months.empty", { year: stats.year })}</Muted>}
      <ul className="grid grid-cols-12 gap-1 sm:gap-2">
        {stats.readPerMonth.map(({ month, books }) => {
          const name = monthName(month);
          const count = books.length;
          const cardId = `${baseId}-${month}`;
          const isOpen = open === month;

          return (
            <li
              key={month}
              className="relative flex min-w-0 flex-col items-center gap-1"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && count > 0) setOpen(month);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse")
                  setOpen((value) => (value === month ? null : value));
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(null);
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
                    aria-controls={isOpen ? cardId : undefined}
                    onClick={() => setOpen(isOpen ? null : month)}
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

              {isOpen && (
                <div
                  id={cardId}
                  role="region"
                  aria-label={t("dashboard.months.card", { month: name, count })}
                  className={`absolute bottom-full z-20 mb-1 flex w-60 flex-col gap-2 rounded-popover bg-card p-3 shadow-popover ${cardAlign(month)}`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    {t("dashboard.months.card", { month: name, count })}
                  </p>
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
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
