"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { Muted, Section } from "@/components/dashboard/section";
import { ChevronRightIcon } from "@/components/icons";
import { SeriesSegments } from "@/components/series-segments";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import type { SegmentState } from "@/lib/shelves";
import type { HomeStats, VeryMuchItem } from "@/lib/stats";

const GENRES_SHOWN = 6;

export function Genres({ genres }: { genres: HomeStats["genres"] }) {
  const t = useT();
  const domain = useDomain();
  const shown = genres.slice(0, GENRES_SHOWN);
  const highest = Math.max(1, ...shown.map((genre) => genre.count));

  return (
    <Section id="home-genres" title={t("dashboard.genres.title")}>
      {shown.length === 0 ? (
        <Muted>{t("dashboard.genres.empty")}</Muted>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((genre) => (
            <li key={genre.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">{domain.genre(genre.name)}</span>
                <span className="num">{genre.count}</span>
              </div>
              <div aria-hidden="true" className="h-1.5 rounded-full bg-beige">
                <div
                  className="h-full rounded-full bg-slate"
                  style={{ width: `${(genre.count / highest) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function WaitingForContinuation({ items }: { items: HomeStats["waitingForContinuation"] }) {
  const t = useT();

  return (
    <Section id="home-waiting" title={t("dashboard.waiting.title")}>
      {items.length === 0 ? (
        <Muted>{t("dashboard.waiting.empty")}</Muted>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.series.id}
              className="flex items-center gap-3 border-t border-mist py-3 first:border-t-0 first:pt-0"
            >
              <span
                aria-hidden="true"
                className="aspect-[2/3] w-9 shrink-0 rounded-cover border-[1.5px] border-dashed border-burgundy bg-burgundy/5"
              />
              <div className="min-w-0 flex-1">
                <Link href={`/series/${item.series.id}`} className="font-semibold hover:underline">
                  {item.series.title} <span className="num text-muted">#{item.number}</span>
                </Link>
                <p className="text-xs text-muted">
                  {item.source
                    ? t(`dashboard.waiting.source.${item.source}`)
                    : t("dashboard.waiting.noInfo")}
                </p>
              </div>
              {item.expectedYear !== undefined && (
                <span className="num shrink-0 text-sm text-burgundy">
                  {t("dashboard.waiting.expected", { year: item.expectedYear })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function segmentsOf(owned: number, total: number): SegmentState[] {
  return Array.from({ length: Math.max(total, owned) }, (_, index) =>
    index < owned ? "owned" : "missing",
  );
}

function VeryMuchRow({ item }: { item: VeryMuchItem }) {
  const t = useT();
  const href = item.type === "series" ? `/series/${item.id}` : `/books/${item.id}`;

  return (
    <li className="border-t border-mist first:border-t-0">
      <Link href={href} className="flex items-center gap-3 py-3 hover:bg-row-hover">
        <BookCover url={item.coverUrl} title={item.title} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-semibold">{item.title}</span>
          {item.type === "book" ? (
            <span className="text-xs text-muted">{t("dashboard.veryMuch.standalone")}</span>
          ) : item.group === "new" ? (
            <span className="text-xs text-muted">
              {t("dashboard.veryMuch.newSeries", { count: item.total })}
            </span>
          ) : (
            <SeriesSegments states={segmentsOf(item.owned, item.total)} />
          )}
        </span>
        <span className="text-muted">
          <ChevronRightIcon size={18} />
        </span>
      </Link>
    </li>
  );
}

export function VeryMuch({ items }: { items: VeryMuchItem[] }) {
  const t = useT();

  return (
    <Section
      id="home-very-much"
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-burgundy" />
          {t("dashboard.veryMuch.title")}
        </span>
      }
      more={{ href: "/wishlist", label: t("dashboard.veryMuch.whole") }}
    >
      {items.length === 0 ? (
        <Muted>{t("dashboard.veryMuch.empty")}</Muted>
      ) : (
        <ul className="-my-3 flex flex-col">
          {items.map((item) => (
            <VeryMuchRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
    </Section>
  );
}

export function QuoteOfTheDay({ quote }: { quote: HomeStats["quoteOfTheDay"] }) {
  const t = useT();

  return (
    <Section id="home-quote" title={t("dashboard.quote.title")}>
      {quote ? (
        <figure className="flex flex-col gap-2">
          <span aria-hidden="true" className="font-serif text-3xl leading-none text-burgundy">
            “
          </span>
          <blockquote className="font-serif text-lg italic leading-relaxed">
            {quote.text}
          </blockquote>
          <figcaption className="text-sm text-muted">
            <Link href={`/books/${quote.book.id}`} className="hover:underline">
              {quote.book.title}
            </Link>
            {quote.page !== undefined && ` · ${t("dashboard.quote.page", { page: quote.page })}`}
          </figcaption>
        </figure>
      ) : (
        <Muted>{t("dashboard.quote.empty")}</Muted>
      )}
    </Section>
  );
}

export function NewOnShelf({ books }: { books: HomeStats["newOnShelf"] }) {
  const t = useT();

  return (
    <Section
      id="home-new"
      title={t("dashboard.newOnShelf.title")}
      more={
        books.length > 0 ? { href: "/library", label: t("dashboard.newOnShelf.whole") } : undefined
      }
    >
      {books.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <Muted>{t("dashboard.newOnShelf.empty")}</Muted>
          <Link href="/add" className="btn-primary">
            {t("dashboard.newOnShelf.add")}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-4 gap-3 md:grid-cols-6 md:gap-4">
          {books.map((book, index) => (
            <li key={book.id} className={index >= 4 ? "hidden md:block" : undefined}>
              <Link href={`/books/${book.id}`} aria-label={book.title} className="block">
                <BookCover
                  url={book.coverUrl}
                  title={book.title}
                  format={book.format}
                  number={book.series?.number}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
