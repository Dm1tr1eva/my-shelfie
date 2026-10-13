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
                <span className="chip bg-burgundy text-card">Gap</span>#{slot.number} ·{" "}
                {slot.wantedBook ? slot.wantedBook.title : "Missing from the series"}
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
  return (
    <section aria-labelledby="standalone-heading" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id="standalone-heading" className="font-serif text-2xl font-semibold">
          Standalone books
        </h2>
        <p className="text-sm text-muted">
          Not part of a series · {books.length} {books.length === 1 ? "book" : "books"}
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
  const filterGroups = buildFilterGroups(scope, subjectOf, filters);
  const countWith = (draft: Filters) => applyFilters(scope, subjectOf, draft).length;
  const bookCount =
    view.standalone.length +
    view.groups.reduce(
      (count, group) => count + group.slots.filter((slot) => slot.kind === "book").length,
      0,
    );
  const groupCount = view.groups.length + (view.standalone.length > 0 ? 1 : 0);
  const summary = `${bookCount} ${bookCount === 1 ? "book" : "books"}${
    groupCount > 0 ? ` in ${groupCount} ${groupCount === 1 ? "group" : "groups"}` : ""
  }`;
  const tabs = [
    { href: "/library", label: "My library", count: stats.owned, id: "library" as const },
    { href: "/wishlist", label: "Wishlist", count: stats.wishlist, id: "wishlist" as const },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">Library</h1>

        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search my books</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search my books"
            className="field pl-10"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist">
        <nav aria-label="Library sections" className="flex gap-6">
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

        <p className="hidden text-sm text-muted md:block">
          {stats.owned} owned · {stats.wishlist} on wishlist · {stats.read} read
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted md:hidden">
          {stats.owned} owned · {stats.wishlist} on wishlist · {stats.read} read
        </p>
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
          title="Could not load your books"
          text="Check your connection and try again."
          onRetry={reload}
        />
      )}

      {loaded && shown === 0 && searching && (
        <EmptyState
          title="No books match"
          text={
            query.trim() !== ""
              ? `Nothing in this list matches “${query.trim()}”${filtering ? " and the filters" : ""}.`
              : "Nothing in this list matches the filters."
          }
        />
      )}

      {loaded && shown === 0 && !searching && tab === "library" && (
        <EmptyState
          title="Your library is empty"
          text="Add the paper books you own, and they will gather here, shelf by shelf."
          actionLabel="Add a book"
          actionHref="/add"
        />
      )}

      {loaded && shown === 0 && !searching && tab === "wishlist" && (
        <EmptyState
          title="Your wishlist is empty"
          text="Books you want to buy will wait here, grouped by series."
          actionLabel="Add a book"
          actionHref="/add"
        />
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

      {loaded && view.standalone.length > 0 && (
        <StandaloneShelf books={view.standalone} mode={mode} tab={tab} />
      )}
    </main>
  );
}
