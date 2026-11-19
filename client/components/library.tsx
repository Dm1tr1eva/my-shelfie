"use client";

import Link from "next/link";
import { useState } from "react";
import { BookRow } from "@/components/book-row";
import { BookTile } from "@/components/book-tile";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterBar } from "@/components/filter-bar";
import { ShelfSkeleton } from "@/components/skeleton";
import { GapTile } from "@/components/gap-tile";
import { SearchIcon } from "@/components/icons";
import { SeriesHeader } from "@/components/series-header";
import { Shelf } from "@/components/shelf";
import { ViewToggle } from "@/components/view-toggle";
import {
  buildLibraryView,
  isInTab,
  matchesQuery,
  shelfStats,
  type LibraryTab,
  type SeriesGroup,
} from "@/lib/catalogue";
import {
  NO_FILTERS,
  activeFilterCount,
  applyFilters,
  buildFilterGroups,
  type Filters,
  type Subject,
} from "@/lib/filters";
import { useBooks, type Book } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { useSeriesList } from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useViewMode } from "@/lib/use-view-mode";

function GroupShelf({
  group,
  mode,
  tab,
}: {
  group: SeriesGroup;
  mode: "grid" | "list";
  tab: LibraryTab;
}) {
  const t = useT();

  if (mode === "list") {
    return (
      <ul>
        {group.slots.map((slot) =>
          slot.kind === "book" ? (
            <BookRow key={slot.book.id} book={slot.book} series={group.series} />
          ) : (
            <li key={`gap-${slot.number}`}>
              <Link
                href={
                  slot.wantedBook
                    ? `/books/${slot.wantedBook.id}`
                    : `/add?series=${group.series.id}&number=${slot.number}`
                }
                className="flex min-h-14 items-center gap-3 border-b border-mist py-3 font-semibold text-burgundy"
              >
                <span className="chip bg-burgundy text-card">{t("library.gap.badge")}</span>#
                {slot.number} · {slot.wantedBook ? slot.wantedBook.title : t("library.gap.missing")}
              </Link>
            </li>
          ),
        )}
      </ul>
    );
  }

  return (
    <Shelf>
      {group.slots.map((slot) =>
        slot.kind === "book" ? (
          <BookTile key={slot.book.id} book={slot.book} showLinks={tab === "wishlist"} />
        ) : (
          <GapTile
            key={`gap-${slot.number}`}
            number={slot.number}
            seriesId={group.series.id}
            wantedBook={slot.wantedBook}
          />
        ),
      )}
    </Shelf>
  );
}

function StandaloneShelf({
  books,
  mode,
  tab,
}: {
  books: Book[];
  mode: "grid" | "list";
  tab: LibraryTab;
}) {
  const t = useT();

  return (
    <section aria-labelledby="standalone-heading" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id="standalone-heading" className="font-serif text-2xl font-semibold">
          {t("library.standalone.title")}
        </h2>
        <p className="text-sm text-muted">
          {t("library.standalone.subtitle", { count: books.length })}
        </p>
      </header>

      {mode === "list" ? (
        <ul>
          {books.map((book) => (
            <BookRow key={book.id} book={book} />
          ))}
        </ul>
      ) : (
        <Shelf>
          {books.map((book) => (
            <BookTile key={book.id} book={book} showNumber={false} showLinks={tab === "wishlist"} />
          ))}
        </Shelf>
      )}
    </section>
  );
}

export function Library({ tab }: { tab: LibraryTab }) {
  const t = useT();
  const domain = useDomain();
  const { user, status } = useRequireAuth();
  const { books, isLoading, error, reload } = useBooks();
  const { series } = useSeriesList();
  const { mode, changeMode } = useViewMode();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const stats = shelfStats(books);
  const view = buildLibraryView(books, series, tab, query, filters);
  const shown =
    view.standalone.length + view.groups.reduce((count, group) => count + group.slots.length, 0);
  const loaded = !isLoading && !error;
  const filtering = activeFilterCount(filters) > 0;
  const searching = query.trim() !== "" || filtering;

  const seriesById = new Map(series.map((item) => [item.id, item]));
  const scope = books.filter((book) => isInTab(book, tab) && matchesQuery(book, query));
  const subjectOf = (book: (typeof books)[number]): Subject => ({
    book,
    series: book.seriesId ? seriesById.get(book.seriesId) : undefined,
  });
  const filterGroups = buildFilterGroups(scope, subjectOf, filters, { t, domain });
  const countWith = (draft: Filters) => applyFilters(scope, subjectOf, draft).length;
  const bookCount =
    view.standalone.length +
    view.groups.reduce(
      (count, group) => count + group.slots.filter((slot) => slot.kind === "book").length,
      0,
    );
  const groupCount = view.groups.length + (view.standalone.length > 0 ? 1 : 0);
  const booksText = t("library.summary.books", { count: bookCount });
  const summary =
    groupCount > 0
      ? t("library.summary.withGroups", {
          books: booksText,
          groups: t("library.summary.inGroups", { count: groupCount }),
        })
      : booksText;
  const statsText = t("library.stats", {
    owned: stats.owned,
    wishlist: stats.wishlist,
    read: stats.read,
  });
  const tabs = [
    {
      href: "/library",
      label: t("library.tabs.library"),
      count: stats.owned,
      id: "library" as const,
    },
    {
      href: "/wishlist",
      label: t("library.tabs.wishlist"),
      count: stats.wishlist,
      id: "wishlist" as const,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">
          {t("library.title")}
        </h1>

        <label className="relative w-full sm:w-72">
          <span className="sr-only">{t("library.search")}</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("library.search")}
            className="field pl-10"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist">
        <nav aria-label={t("library.sections")} className="flex gap-6">
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === tab ? "page" : undefined}
              className={`inline-flex min-h-12 items-center gap-2 border-b-[3px] font-semibold ${
                item.id === tab ? "border-burgundy text-ink" : "border-transparent text-muted"
              }`}
            >
              {item.label}
              <span className="rounded-full bg-mist px-2 text-sm text-navy">{item.count}</span>
            </Link>
          ))}
        </nav>

        <p className="hidden text-sm text-muted md:block">{statsText}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted md:hidden">{statsText}</p>
        <div className="ml-auto">
          <ViewToggle mode={mode} onChange={changeMode} />
        </div>
      </div>

      {loaded && (scope.length > 0 || filtering) && (
        <div className="card p-4">
          <FilterBar
            groups={filterGroups}
            filters={filters}
            onChange={setFilters}
            countWith={countWith}
            summary={summary}
          />
        </div>
      )}

      {isLoading && <ShelfSkeleton />}
      {error && (
        <ErrorState
          title={t("library.loadError.title")}
          text={t("library.loadError.text")}
          onRetry={reload}
        />
      )}

      {loaded && shown === 0 && searching && (
        <EmptyState
          title={t("library.noMatch.title")}
          text={
            query.trim() !== ""
              ? t(filtering ? "library.noMatch.queryAndFilters" : "library.noMatch.query", {
                  query: query.trim(),
                })
              : t("library.noMatch.filters")
          }
        />
      )}

      {loaded && shown === 0 && !searching && tab === "library" && (
        <EmptyState
          title={t("library.emptyLibrary.title")}
          text={t("library.emptyLibrary.text")}
          actionLabel={t("shell.nav.addBook")}
          actionHref="/add"
        />
      )}

      {loaded && shown === 0 && !searching && tab === "wishlist" && (
        <EmptyState
          title={t("library.emptyWishlist.title")}
          text={t("library.emptyWishlist.text")}
          actionLabel={t("shell.nav.addBook")}
          actionHref="/add"
        />
      )}

      {loaded && view.standalone.length > 0 && (
        <StandaloneShelf books={view.standalone} mode={mode} tab={tab} />
      )}

      {loaded &&
        view.groups.map((group) => (
          <section
            key={group.series.id}
            aria-label={group.series.title}
            className="flex flex-col gap-4"
          >
            <SeriesHeader group={group} />
            <GroupShelf group={group} mode={mode} tab={tab} />
          </section>
        ))}
    </main>
  );
}
