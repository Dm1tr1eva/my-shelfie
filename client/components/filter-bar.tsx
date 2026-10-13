"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon, XIcon } from "@/components/icons";
import {
  FILTER_KEYS,
  NO_FILTERS,
  activeFilterCount,
  chipLabel,
  type FilterGroup,
  type FilterKey,
  type Filters,
} from "@/lib/filters";

const FOLDED_PILLS = 5;
const SEARCH_FROM = 8;

function OptionLabel({ option }: { option: FilterGroup["options"][number] }) {
  return (
    <>
      {option.badge && (
        <span className="rounded bg-navy px-1.5 text-xs font-bold text-page">{option.badge}</span>
      )}
      <span className="flex-1">{option.label}</span>
      <span className="text-sm text-muted">{option.count}</span>
    </>
  );
}

function FilterPopover({
  group,
  selected,
  onApply,
}: {
  group: FilterGroup;
  selected: string[];
  onApply: (values: string[]) => void;
}) {
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selected);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;

    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function toggleOpen() {
    if (!open) {
      setDraft(selected);
      setSearch("");
    }
    setOpen(!open);
  }

  function toggle(value: string) {
    setDraft((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  const shown = group.options.filter(
    (option) => search === "" || option.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleOpen}
        className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 font-semibold ${
          selected.length > 0 ? "border-navy bg-navy/10" : "border-field hover:bg-beige"
        }`}
      >
        {group.label}
        {selected.length > 0 && (
          <span className="rounded-full bg-navy px-2 text-sm text-page">{selected.length}</span>
        )}
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={group.label}
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-card border border-mist bg-card p-3 shadow-pop"
        >
          {group.searchable && group.options.length >= SEARCH_FROM && (
            <label className="relative mb-2 block">
              <span className="sr-only">Find in {group.label}</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <SearchIcon size={16} />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Find in ${group.label.toLowerCase()}`}
                className="field pl-9"
              />
            </label>
          )}

          <ul className="max-h-64 overflow-auto">
            {shown.map((option) => (
              <li key={option.value}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1">
                  <input
                    type="checkbox"
                    checked={draft.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    className="h-5 w-5 accent-burgundy"
                  />
                  <OptionLabel option={option} />
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-1 py-2 text-muted">Nothing found.</li>}
          </ul>

          <div className="mt-3 flex justify-between gap-2 border-t border-mist pt-3">
            <button
              type="button"
              onClick={() => {
                onApply([]);
                setOpen(false);
              }}
              className="btn-outline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
              className="btn-primary"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SheetGroup({
  group,
  draft,
  onToggle,
}: {
  group: FilterGroup;
  draft: string[];
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const matching = group.options.filter(
    (option) => search === "" || option.label.toLowerCase().includes(search.toLowerCase()),
  );
  const folded = !expanded && search === "" && matching.length > FOLDED_PILLS;
  const visible = folded
    ? matching.filter((option, index) => index < FOLDED_PILLS || draft.includes(option.value))
    : matching;

  return (
    <section aria-label={group.label} className="flex flex-col gap-2">
      <h3 className="font-sans text-base font-semibold">{group.label}</h3>

      {group.searchable && group.options.length >= SEARCH_FROM && (
        <label className="relative block">
          <span className="sr-only">Find in {group.label}</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon size={16} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Find a ${group.label.toLowerCase()}`}
            className="field pl-9"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {visible.map((option) => {
          const on = draft.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option.value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold ${
                on ? "border-navy bg-navy text-page" : "border-field hover:bg-beige"
              }`}
            >
              {option.badge && <span className="text-xs font-bold">{option.badge}</span>}
              {option.label}
              <span className={on ? "text-sm text-mist" : "text-sm text-muted"}>
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      {folded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-11 self-start text-navy underline"
        >
          +{matching.length - visible.length} more
        </button>
      )}
    </section>
  );
}

function FilterSheet({
  groups,
  filters,
  countWith,
  onApply,
  onClose,
}: {
  groups: FilterGroup[];
  filters: Filters;
  countWith: (draft: Filters) => number;
  onApply: (next: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  const count = countWith(draft);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(key: FilterKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/50 md:hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="flex max-h-[88vh] w-full flex-col rounded-t-card bg-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-mist p-4">
          <h2 className="text-xl font-semibold">Filters</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn-outline w-11 px-0"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-auto p-4">
          {groups.map((group) => (
            <SheetGroup
              key={group.key}
              group={group}
              draft={draft[group.key]}
              onToggle={(value) => toggle(group.key, value)}
            />
          ))}
        </div>

        <div className="flex justify-between gap-3 border-t border-mist p-4">
          <button type="button" onClick={() => setDraft(NO_FILTERS)} className="btn-outline">
            Clear all
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="btn-primary"
          >
            Show {count} {count === 1 ? "book" : "books"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilterBar({
  groups,
  filters,
  onChange,
  countWith,
  summary,
}: {
  groups: FilterGroup[];
  filters: Filters;
  onChange: (next: Filters) => void;
  countWith: (draft: Filters) => number;
  summary: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeFilterCount(filters);
  const usable = groups.filter((group) => group.options.length > 0);

  const chips = FILTER_KEYS.flatMap((key) =>
    filters[key].map((value) => ({ key, value, label: chipLabel(key, value) })),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {usable.map((group) => (
          <FilterPopover
            key={group.key}
            group={group}
            selected={filters[group.key]}
            onApply={(values) => onChange({ ...filters, [group.key]: values })}
          />
        ))}
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-field px-4 font-semibold"
        >
          Filters{active > 0 ? ` · ${active}` : ""}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-2 text-sm text-muted">{summary}</p>
        {chips.map((chip) => (
          <span
            key={`${chip.key}-${chip.value}`}
            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-navy pl-3 pr-1 text-sm font-semibold text-page"
          >
            {chip.label}
            <button
              type="button"
              aria-label={`Remove filter ${chip.label}`}
              onClick={() =>
                onChange({
                  ...filters,
                  [chip.key]: filters[chip.key].filter((value) => value !== chip.value),
                })
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-page/20"
            >
              <XIcon size={14} />
            </button>
          </span>
        ))}
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="min-h-9 px-2 text-sm font-semibold text-navy underline"
          >
            Clear all
          </button>
        )}
      </div>

      {sheetOpen && (
        <FilterSheet
          groups={usable}
          filters={filters}
          countWith={countWith}
          onApply={onChange}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
