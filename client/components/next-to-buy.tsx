"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GapChip, LangBadge, SeriesStatusChip } from "@/components/chips";
import { EmptyState } from "@/components/empty-state";
import { ExternalLinkIcon } from "@/components/icons";
import { Select, type SelectOption } from "@/components/select";
import { ApiError } from "@/lib/api";
import {
  GENRES,
  LINK_LANGUAGES,
  useBookActions,
  useBooks,
  type Genre,
  type LinkLanguage,
} from "@/lib/books";
import { ownedNumbersOf } from "@/lib/catalogue";
import { hostOf } from "@/lib/links";
import {
  useNextToBuy,
  type BookItem,
  type MissingItem,
  type NextToBuyFilters,
  type NextToBuyItem,
} from "@/lib/next-to-buy";
import { SERIES_STATUS_OPTIONS, type SeriesStatus } from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";

const ANY: SelectOption = { value: "", label: "Any" };
const LANGUAGE_FILTER_OPTIONS = [
  ANY,
  ...LINK_LANGUAGES.map((language) => ({ value: language.value, label: language.name })),
];
const GENRE_FILTER_OPTIONS = [ANY, ...GENRES.map((genre) => ({ value: genre, label: genre }))];

function gapText(numbers: number[]) {
  if (numbers.length === 0) return "Gap";
  return `Gap: you own ${numbers.map((number) => `#${number}`).join(" and ")}`;
}

function Row({
  item,
  ownedNumbers,
  onBought,
  busy,
}: {
  item: BookItem;
  ownedNumbers: number[];
  onBought: (id: string) => void;
  busy: boolean;
}) {
  const { book } = item;
  const series = item.type === "series" ? item.series : undefined;

  return (
    <li className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        <BookCover url={book.coverUrl} title={book.title} size="md" />
        <div className="flex min-w-0 flex-col gap-2">
          <Link href={`/books/${book.id}`} className="font-serif text-xl font-semibold">
            {book.title}
          </Link>
          <p className="text-sm text-muted">
            {series
              ? `${series.title}${book.seriesNumber !== undefined ? ` · #${book.seriesNumber}` : ""}`
              : `${book.author} · Standalone`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {item.gap && <GapChip text={gapText(ownedNumbers)} />}
            {series && <SeriesStatusChip status={series.status} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {book.links.length > 0 ? (
              book.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-control bg-page px-2 text-sm font-medium text-navy"
                >
                  <LangBadge language={link.language} />
                  {hostOf(link.url)}
                  <ExternalLinkIcon size={14} />
                </a>
              ))
            ) : (
              <Link
                href={`/books/${book.id}`}
                className="inline-flex min-h-11 items-center text-sm text-muted underline"
              >
                No links yet · add one
              </Link>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onBought(book.id)}
        className="btn-primary md:shrink-0"
      >
        I bought it
      </button>
    </li>
  );
}

function MissingRow({ item, ownedNumbers }: { item: MissingItem; ownedNumbers: number[] }) {
  const { series, number } = item;

  return (
    <li className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        <span
          aria-hidden="true"
          className="flex aspect-[2/3] w-16 shrink-0 items-center justify-center rounded-cover border-2 border-dashed border-burgundy bg-burgundy/[0.06] text-lg font-bold text-burgundy"
        >
          #{number}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-serif text-xl font-semibold">Book {number}</p>
          <p className="text-sm text-muted">{series.title} · not in your list yet</p>
          <div className="flex flex-wrap items-center gap-2">
            {item.gap && <GapChip text={gapText(ownedNumbers)} />}
            <SeriesStatusChip status={series.status} />
          </div>
        </div>
      </div>

      <Link href={`/add?series=${series.id}&number=${number}`} className="btn-outline md:shrink-0">
        Add this book
      </Link>
    </li>
  );
}

export function NextToBuy() {
  const { user, status } = useRequireAuth();
  const [filters, setFilters] = useState<NextToBuyFilters>({});
  const { items, isLoading, error } = useNextToBuy(filters);
  const { books } = useBooks();
  const { updateBook } = useBookActions();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const tropes = [...new Set(books.flatMap((book) => book.tropes))].sort((a, b) =>
    a.localeCompare(b),
  );
  const hasFilters = Object.values(filters).some(Boolean);
  const fromSeries = items.filter((item) => item.type !== "standalone");
  const standalone = items.filter(
    (item): item is Extract<NextToBuyItem, { type: "standalone" }> => item.type === "standalone",
  );

  function ownedNumbersFor(item: NextToBuyItem) {
    if (item.type === "standalone") return [];
    return ownedNumbersOf(books.filter((book) => book.seriesId === item.series.id));
  }

  function setFilter<K extends keyof NextToBuyFilters>(key: K, value: NextToBuyFilters[K] | "") {
    setFilters((current) => {
      const next = { ...current };
      if (value === "") delete next[key];
      else next[key] = value as NextToBuyFilters[K];
      return next;
    });
  }

  async function bought(id: string) {
    setBusy(true);
    setActionError(null);
    try {
      await updateBook(id, { ownership: "owned" });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">Next to buy</h1>
        <p className="text-muted">
          Missing books from the series you collect, plus standalone books on your wishlist.
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Select
          label="Shop language"
          className="min-w-36 flex-1"
          value={filters.language ?? ""}
          onChange={(value) => setFilter("language", value as LinkLanguage | "")}
          options={LANGUAGE_FILTER_OPTIONS}
        />

        <Select
          label="Genre"
          className="min-w-36 flex-1"
          value={filters.genre ?? ""}
          onChange={(value) => setFilter("genre", value as Genre | "")}
          options={GENRE_FILTER_OPTIONS}
        />

        <Select
          label="Trope"
          className="min-w-36 flex-1"
          value={filters.trope ?? ""}
          onChange={(value) => setFilter("trope", value)}
          options={[ANY, ...tropes.map((trope) => ({ value: trope, label: trope }))]}
        />

        <Select
          label="Series status"
          className="min-w-36 flex-1"
          value={filters.seriesStatus ?? ""}
          onChange={(value) => setFilter("seriesStatus", value as SeriesStatus | "")}
          options={[ANY, ...SERIES_STATUS_OPTIONS]}
        />

        {hasFilters && (
          <button type="button" onClick={() => setFilters({})} className="btn-outline">
            Clear all
          </button>
        )}
      </div>

      {isLoading && (
        <p role="status" aria-busy="true">
          Loading...
        </p>
      )}
      {error && (
        <p role="alert" className="text-burgundy">
          Could not load the list.
        </p>
      )}
      {actionError && (
        <p role="alert" className="font-semibold text-burgundy">
          {actionError}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title={hasFilters ? "No books match these filters" : "Nothing to buy"}
          text={
            hasFilters
              ? "Try clearing a filter."
              : "You own every book you have on record for the series you collect, and your wishlist has no standalone books."
          }
        />
      )}

      {fromSeries.length > 0 && (
        <section aria-labelledby="from-series-heading" className="flex flex-col gap-3">
          <h2 id="from-series-heading" className="text-2xl font-semibold">
            From your series{" "}
            <span className="font-sans text-base text-muted">{fromSeries.length}</span>
          </h2>
          <ul className="flex flex-col gap-3">
            {fromSeries.map((item) =>
              item.type === "missing" ? (
                <MissingRow
                  key={`missing-${item.series.id}-${item.number}`}
                  item={item}
                  ownedNumbers={ownedNumbersFor(item)}
                />
              ) : (
                <Row
                  key={item.book.id}
                  item={item}
                  ownedNumbers={ownedNumbersFor(item)}
                  onBought={bought}
                  busy={busy}
                />
              ),
            )}
          </ul>
        </section>
      )}

      {standalone.length > 0 && (
        <section aria-labelledby="standalone-heading" className="flex flex-col gap-3">
          <h2 id="standalone-heading" className="text-2xl font-semibold">
            Standalone wishlist{" "}
            <span className="font-sans text-base text-muted">{standalone.length}</span>
          </h2>
          <ul className="flex flex-col gap-3">
            {standalone.map((item) => (
              <Row key={item.book.id} item={item} ownedNumbers={[]} onBought={bought} busy={busy} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
