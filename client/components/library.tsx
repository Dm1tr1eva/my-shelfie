"use client";

import { useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterPanel } from "@/components/filter-panel";
import { ActiveFilterPills, SearchAndFilter } from "@/components/catalogue-toolbar";
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
import { useAddressParams } from "@/lib/use-address-params";
import { useSeriesList } from "@/lib/series";
import { libraryShelves, rowsOf, shelfRow, type SeriesShelf } from "@/lib/shelves";
import { useMediaQuery } from "@/lib/use-media-query";
import { useRequireAuth } from "@/lib/use-require-auth";

const WIDE_SHELF = "(min-width: 64rem)";

function useShelfColumns() {
  const wide = useMediaQuery(WIDE_SHELF);
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
            <LibraryGapTile key={`gap-${slot.from}`} series={series} gap={slot} />
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
  const [{ query, filters }, show] = useAddressParams();
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
            <SearchAndFilter
              label={t("library.searchAll")}
              query={query}
              onQuery={(next) => show({ query: next, filters })}
              active={active}
              panelOpen={panelOpen}
              onOpenPanel={() => setPanelOpen(true)}
              filterButton={filterButton}
            />
          )}
        </div>

        <ActiveFilterPills
          pills={pills}
          onRemove={(pill) => {
            show({
              query,
              filters: {
                ...filters,
                [pill.key]: filters[pill.key].filter((value) => value !== pill.value),
              },
            });
            filterButton.current?.focus();
          }}
        />
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
