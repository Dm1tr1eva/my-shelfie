"use client";

import { useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterPanel } from "@/components/filter-panel";
import { ActiveFilterPills, SearchAndFilter } from "@/components/catalogue-toolbar";
import { RowsSkeleton } from "@/components/skeleton";
import { WishlistRow } from "@/components/wishlist-row";
import type { DesireLevel } from "@/lib/catalogue-constants";
import { activeFilterCount, filterPanelGroups, panelChipLabel, type Filters } from "@/lib/filters";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { useAddressParams } from "@/lib/use-address-params";
import { useRequireAuth } from "@/lib/use-require-auth";
import {
  WISHLIST_FILTER_KEYS,
  narrowGroups,
  rowsOf,
  useWishlist,
  wishlistValuesOf,
  type WishlistGroup,
  type WishlistRow as Row,
} from "@/lib/wishlist";

function GroupSection({
  group,
  narrowing,
  onChange,
  onFailure,
}: {
  group: WishlistGroup;
  narrowing: boolean;
  onChange: (row: Row, desire: DesireLevel) => void;
  onFailure: (row: Row) => void;
}) {
  const t = useT();
  const headingId = `wishlist-${group.key}`;

  if (narrowing && group.items.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <h2
          id={headingId}
          className="font-serif text-[21px] font-semibold leading-tight md:text-2xl lg:text-[26px]"
        >
          {t(`wishlist.groups.${group.key}.title`)}
        </h2>
        <span className="num inline-flex h-6 min-w-[26px] items-center justify-center rounded-full bg-beige px-2 text-[13px] text-ink">
          {group.items.length}
        </span>
      </div>
      {group.items.length === 0 ? (
        <p className="text-sm text-muted">{t(`wishlist.groups.${group.key}.empty`)}</p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] bg-card">
          {group.items.map((row) => (
            <WishlistRow
              key={`${row.type}-${row.id}`}
              row={row}
              onChange={onChange}
              onFailure={onFailure}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Wishlist() {
  const t = useT();
  const domain = useDomain();
  const { user, status } = useRequireAuth();
  const wishlist = useWishlist();
  const [{ query, filters }, show] = useAddressParams(WISHLIST_FILTER_KEYS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const filterButton = useRef<HTMLButtonElement>(null);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const loading = wishlist.isLoading;
  const failed = Boolean(wishlist.error);
  const loaded = !loading && !failed;
  const all = rowsOf(wishlist.groups);
  const active = activeFilterCount(filters);
  const narrowing = active > 0 || query.trim() !== "";
  const groups = narrowGroups(wishlist.groups, query, filters);
  const shownCount = rowsOf(groups).length;
  const labels = { t, domain };
  const panelGroups = filterPanelGroups(WISHLIST_FILTER_KEYS, all, wishlistValuesOf, labels);
  const pills = WISHLIST_FILTER_KEYS.flatMap((key) =>
    filters[key].map((value) => ({ key, value, label: panelChipLabel(key, value, labels) })),
  );

  function changed(row: Row, desire: DesireLevel) {
    setFailure(null);
    setAnnouncement(
      t("wishlist.desire.changed", { title: row.title, level: t(`wishlist.desire.${desire}`) }),
    );
  }

  function failedFor(row: Row) {
    setFailure(t("wishlist.desire.failed", { title: row.title }));
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8 md:gap-7">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
          <h1 className="text-[32px] font-semibold leading-tight md:text-[38px] lg:text-[44px]">
            {t("wishlist.title")}
          </h1>

          {loaded && all.length > 0 && (
            <SearchAndFilter
              label={t("wishlist.search")}
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

        {failure && (
          <p role="alert" className="font-semibold text-burgundy">
            {failure}
          </p>
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      {loading && <RowsSkeleton label={t("wishlist.loading")} />}
      {failed && (
        <ErrorState
          title={t("wishlist.loadError.title")}
          text={t("wishlist.loadError.text")}
          onRetry={wishlist.reload}
        />
      )}

      {loaded && all.length === 0 && (
        <EmptyState
          title={t("wishlist.empty.title")}
          text={t("wishlist.empty.text")}
          actionLabel={t("shell.nav.addBook")}
          actionHref="/add"
        />
      )}

      {loaded && all.length > 0 && narrowing && shownCount === 0 && (
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
        all.length > 0 &&
        groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            narrowing={narrowing}
            onChange={changed}
            onFailure={failedFor}
          />
        ))}

      {panelOpen && (
        <FilterPanel
          groups={panelGroups}
          filters={filters}
          countWith={(draft: Filters) => rowsOf(narrowGroups(wishlist.groups, query, draft)).length}
          showLabel={(count) => t("wishlist.show", { count })}
          onApply={(next) => show({ query, filters: next })}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </main>
  );
}
