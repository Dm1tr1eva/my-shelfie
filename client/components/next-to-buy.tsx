"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GapChip, LangBadge, LinkKindBadge, SeriesStatusChip } from "@/components/chips";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterBar } from "@/components/filter-bar";
import { RowsSkeleton } from "@/components/skeleton";
import { ExternalLinkIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { useBookActions, useBooks } from "@/lib/books";
import { ownedNumbersOf } from "@/lib/catalogue";
import { useT, type Translate } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { translateServerError } from "@/lib/i18n/server-errors";
import { hostOf } from "@/lib/links";
import {
  NO_FILTERS,
  activeFilterCount,
  applyFilters,
  buildFilterGroups,
  type Filters,
  type Subject,
} from "@/lib/filters";
import {
  useNextToBuy,
  type BookItem,
  type MissingItem,
  type NextToBuyItem,
} from "@/lib/next-to-buy";
import { useRequireAuth } from "@/lib/use-require-auth";

function gapText(numbers: number[], t: Translate) {
  if (numbers.length === 0) return t("series.next.gap");
  return t("series.next.gapOwn", {
    list: numbers.map((number) => `#${number}`).join(t("series.joinAnd")),
  });
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
  const t = useT();
  const { book } = item;
  const series = item.type === "series" ? item.series : undefined;

  return (
    <li className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        <BookCover url={book.coverUrl} title={book.title} size="md" format={book.format} />
        <div className="flex min-w-0 flex-col gap-2">
          <Link href={`/books/${book.id}`} className="font-serif text-xl font-semibold">
            {book.title}
          </Link>
          <p className="text-sm text-muted">
            {series
              ? `${series.title}${book.seriesNumber !== undefined ? ` · #${book.seriesNumber}` : ""}`
              : t("series.next.standaloneLine", { author: book.author })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {item.gap && <GapChip text={gapText(ownedNumbers, t)} />}
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
                  className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-2 break-all rounded-control bg-page px-2 text-sm font-medium text-navy"
                >
                  <LinkKindBadge kind={link.kind} />
                  {link.languages.map((language) => (
                    <LangBadge key={language} language={language} />
                  ))}
                  {hostOf(link.url)}
                  <ExternalLinkIcon size={14} />
                </a>
              ))
            ) : (
              <Link
                href={`/books/${book.id}`}
                className="inline-flex min-h-11 items-center text-sm text-muted underline"
              >
                {t("series.next.noLinks")}
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
        {t("series.next.bought")}
      </button>
    </li>
  );
}

function MissingRow({ item, ownedNumbers }: { item: MissingItem; ownedNumbers: number[] }) {
  const t = useT();
  const { series, number } = item;

  return (
    <li className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        <span
          aria-hidden="true"
          className="flex aspect-[2/3] w-16 shrink-0 items-center justify-center rounded-cover border-2 border-dashed border-burgundy bg-burgundy/[0.06] text-lg text-burgundy num"
        >
          #{number}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-serif text-xl font-semibold">
            {t("series.next.bookNumber", { number })}
          </p>
          <p className="text-sm text-muted">
            {t("series.next.notInList", { title: series.title })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {item.gap && <GapChip text={gapText(ownedNumbers, t)} />}
            <SeriesStatusChip status={series.status} />
          </div>
        </div>
      </div>

      <Link href={`/add?series=${series.id}&number=${number}`} className="btn-outline md:shrink-0">
        {t("series.next.addThis")}
      </Link>
    </li>
  );
}

export function NextToBuy() {
  const t = useT();
  const domain = useDomain();
  const { user, status } = useRequireAuth();
  const { items, isLoading, error, reload } = useNextToBuy();
  const { books } = useBooks();
  const { updateBook } = useBookActions();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const subjectOf = (item: NextToBuyItem): Subject => {
    if (item.type === "missing") return { series: item.series };
    return { book: item.book, series: item.type === "series" ? item.series : undefined };
  };
  const groups = buildFilterGroups(items, subjectOf, filters, { t, domain });
  const visible = applyFilters(items, subjectOf, filters);
  const countWith = (draft: Filters) => applyFilters(items, subjectOf, draft).length;
  const hasFilters = activeFilterCount(filters) > 0;
  const fromSeries = visible.filter((item) => item.type !== "standalone");
  const standalone = visible.filter(
    (item): item is Extract<NextToBuyItem, { type: "standalone" }> => item.type === "standalone",
  );
  const summary = t("series.next.books", { count: visible.length });
  const loaded = !isLoading && !error;

  function ownedNumbersFor(item: NextToBuyItem) {
    if (item.type === "standalone") return [];
    return ownedNumbersOf(books.filter((book) => book.seriesId === item.series.id));
  }

  async function bought(id: string) {
    setBusy(true);
    setActionError(null);
    try {
      await updateBook(id, { ownership: "owned" });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? translateServerError(err.message, t) : t("series.somethingWrong"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">
          {t("series.next.title")}
        </h1>
        <p className="text-muted">{t("series.next.intro")}</p>
      </div>

      {loaded && (items.length > 0 || hasFilters) && (
        <div className="card p-4">
          <FilterBar
            groups={groups}
            filters={filters}
            onChange={setFilters}
            countWith={countWith}
            summary={summary}
          />
        </div>
      )}

      {isLoading && <RowsSkeleton label={t("series.next.loading")} />}
      {error && (
        <ErrorState
          title={t("series.next.loadError")}
          text={t("series.checkConnection")}
          onRetry={reload}
        />
      )}
      {actionError && (
        <p role="alert" className="font-semibold text-burgundy">
          {actionError}
        </p>
      )}

      {loaded && visible.length === 0 && (
        <EmptyState
          title={hasFilters ? t("series.next.noMatch") : t("series.next.nothing")}
          text={hasFilters ? t("series.next.noMatchText") : t("series.next.nothingText")}
        />
      )}

      {fromSeries.length > 0 && (
        <section aria-labelledby="from-series-heading" className="flex flex-col gap-3">
          <h2 id="from-series-heading" className="text-2xl font-semibold">
            {t("series.next.fromSeries")}{" "}
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
            {t("series.next.standalone")}{" "}
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
