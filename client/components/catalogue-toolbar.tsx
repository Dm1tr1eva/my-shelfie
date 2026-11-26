"use client";

import type { RefObject } from "react";
import { FilterIcon, SearchIcon, XIcon } from "@/components/icons";
import type { FilterKey } from "@/lib/filters";
import { useT } from "@/lib/i18n";

export type FilterPill = { key: FilterKey; value: string; label: string };

export function SearchAndFilter({
  label,
  query,
  onQuery,
  active,
  panelOpen,
  onOpenPanel,
  filterButton,
}: {
  label: string;
  query: string;
  onQuery: (query: string) => void;
  active: number;
  panelOpen: boolean;
  onOpenPanel: () => void;
  filterButton: RefObject<HTMLButtonElement | null>;
}) {
  const t = useT();

  return (
    <div className="flex items-center gap-2 md:w-[420px]">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={label}
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
        onClick={onOpenPanel}
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
  );
}

export function ActiveFilterPills({
  pills,
  onRemove,
}: {
  pills: FilterPill[];
  onRemove: (pill: FilterPill) => void;
}) {
  const t = useT();
  if (pills.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-2">
      {pills.map((pill) => (
        <li key={`${pill.key}-${pill.value}`}>
          <button
            type="button"
            aria-label={t("library.filters.remove", { label: pill.label })}
            onClick={() => onRemove(pill)}
            className="group inline-flex min-h-11 items-center md:min-h-10"
          >
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy pl-3 pr-2.5 text-sm font-semibold text-page transition-colors group-hover:bg-navy/85">
              {pill.label}
              <XIcon size={14} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
