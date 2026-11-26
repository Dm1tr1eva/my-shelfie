"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterPanel } from "@/components/filter-panel";
import { FilterIcon, SearchIcon, XIcon } from "@/components/icons";
import {
  LibraryBookTile,
  LibraryGapTile,
  LibraryMoreTile,
  SHELF_COLUMNS,
  SeriesShelfHeader,
} from "@/components/library-tiles";
import { Shelf } from "@/components/shelf";
import { ShelfSkeleton } from "@/components/skeleton";
import { useBooks } from "@/lib/books";
import {
  LIBRARY_FILTER_KEYS,
  activeFilterCount,
  libraryFilterGroups,
  panelChipLabel,
  type Filters,
} from "@/lib/filters";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { readLibraryParams, writeLibraryParams, type LibraryParams } from "@/lib/library-params";
import { useSeriesList } from "@/lib/series";
import { libraryShelves, rowsOf, shelfRow, type SeriesShelf } from "@/lib/shelves";
import { useRequireAuth } from "@/lib/use-require-auth";

const WIDE_SHELF = "(min-width: 64rem)";

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE_SHELF);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useShelfColumns() {
  const wide = useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE_SHELF).matches,
    () => false,
  );
  return wide ? 7 : 4;
}

function SeriesShelfView({ shelf, columns }: { shelf: SeriesShelf; columns: number }) {
  const { series } = shelf;
  const { shown, more } = shelfRow(shelf.slots, columns);
  const headingId = `series-${series.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SeriesShelfHeader series={series} segments={shelf.segments} headingId={headingId} />
      <Shelf columns={SHELF_COLUMNS}>
        {shown.map((slot) =>
          slot.kind === "book" ? (
            <LibraryBookTile key={slot.book.id} book={slot.book} />
          ) : (
            <LibraryGapTile
              key={`gap-${slot.from}`}
              series={series}
              from={slot.from}
              to={slot.to}
            />
          ),
        )}
        {more > 0 && <LibraryMoreTile series={series} count={more} />}
      </Shelf>
    </section>
  );
}

export function Library() {
  const t = useT();
  const domain = useDomain();
  const { user, status } = useRequireAuth();
  const books = useBooks();
  const seriesList = useSeriesList();
  const columns = useShelfColumns();
  const searchParams = useSearchParams();
  const [{ query, filters }, setParams] = useState<LibraryParams>(() =>
    readLibraryParams(searchParams),
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const loading = books.isLoading || seriesList.isLoading;
  const failed = Boolean(books.error || seriesList.error);
  const loaded = !loading && !failed;
  const active = activeFilterCount(filters);
  const narrowing = active > 0 || query.trim() !== "";

  const seriesById = new Map(seriesList.series.map((item) => [item.id, item]));
  const shelves = libraryShelves(books.books, seriesList.series, query, filters);
  const groups = libraryFilterGroups(
    books.books.map((book) => ({
      book,
      series: book.seriesId ? seriesById.get(book.seriesId) : undefined,
    })),
    { t, domain },
  );
  const countWith = (draft: Filters) =>
    libraryShelves(books.books, seriesList.series, query, draft).count;
  const pills = LIBRARY_FILTER_KEYS.flatMap((key) =>
    filters[key].map((value) => ({
      key,
      value,
      label: panelChipLabel(key, value, { t, domain }),
    })),
  );

  function show(next: LibraryParams) {
    setParams(next);
    const search = writeLibraryParams(next.query, next.filters);
    window.history.replaceState(
      null,
      "",
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }

  function retry() {
    books.reload();
    seriesList.reload();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8 md:gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
          <h1 className="text-[32px] font-semibold leading-tight md:text-[38px] lg:text-[44px]">
            {t("library.title")}
          </h1>

          {loaded && books.books.length > 0 && (
            <div className="flex items-center gap-2 md:w-[420px]">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">{t("library.searchAll")}</span>
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                  <SearchIcon size={18} />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => show({ query: event.target.value, filters })}
                  placeholder={t("library.searchAll")}
                  className="field pl-10"
                />
              </label>
              <button
                ref={filterButton}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={panelOpen}
                aria-label={
                  active > 0
                    ? t("library.filters.withCount", { count: active })
                    : t("library.filters.title")
                }
                onClick={() => setPanelOpen(true)}
                className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-field bg-card text-navy hover:bg-row-hover"
              >
                <FilterIcon size={20} />
                {active > 0 && (
                  <span
                    aria-hidden="true"
                    className="num absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-burgundy px-1 text-[11px] text-card"
                  >
                    {active}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {pills.length > 0 && (
          <ul className="flex flex-wrap gap-x-2">
            {pills.map((pill) => (
              <li key={`${pill.key}-${pill.value}`}>
                <button
                  type="button"
                  aria-label={t("library.filters.remove", { label: pill.label })}
                  onClick={() => {
                    show({
                      query,
                      filters: {
                        ...filters,
                        [pill.key]: filters[pill.key].filter((value) => value !== pill.value),
                      },
                    });
                    filterButton.current?.focus();
                  }}
                  className="inline-flex min-h-11 items-center md:min-h-10"
                >
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy pl-3 pr-2.5 text-sm font-semibold text-page">
                    {pill.label}
                    <XIcon size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <ShelfSkeleton />}
      {failed && (
        <ErrorState
          title={t("library.loadError.title")}
          text={t("library.loadError.text")}
          onRetry={retry}
        />
      )}

      {loaded && books.books.length === 0 && (
        <EmptyState
          title={t("library.emptyLibrary.title")}
          text={t("library.emptyLibrary.text")}
          actionLabel={t("shell.nav.addBook")}
          actionHref="/add"
        />
      )}

      {loaded && books.books.length > 0 && shelves.count === 0 && narrowing && (
        <EmptyState
          title={t("library.noMatch.title")}
          text={
            query.trim() !== ""
              ? t(active > 0 ? "library.noMatch.queryAndFilters" : "library.noMatch.query", {
                  query: query.trim(),
                })
              : t("library.noMatch.filters")
          }
        />
      )}

      {loaded &&
        shelves.series.map((shelf) => (
          <SeriesShelfView key={shelf.series.id} shelf={shelf} columns={columns} />
        ))}

      {loaded && shelves.standalone.length > 0 && (
        <section aria-labelledby="standalone-heading" className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h2
              id="standalone-heading"
              className="font-serif text-[21px] font-semibold leading-tight md:text-2xl"
            >
              {t("library.standalone.title")}
            </h2>
            <p className="text-sm text-muted">{t("library.shelf.notPartOfSeries")}</p>
          </header>
          <div className="flex flex-col gap-6">
            {rowsOf(shelves.standalone, columns).map((row) => (
              <Shelf key={row[0].id} columns={SHELF_COLUMNS}>
                {row.map((book) => (
                  <LibraryBookTile key={book.id} book={book} showNumber={false} />
                ))}
              </Shelf>
            ))}
          </div>
        </section>
      )}

      {panelOpen && (
        <FilterPanel
          groups={groups}
          filters={filters}
          countWith={countWith}
          onApply={(next) => show({ query, filters: next })}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </main>
  );
}
