"use client";

import { useId, useState } from "react";
import { Drawer } from "@/components/drawer";
import { SearchIcon } from "@/components/icons";
import { NO_FILTERS, type FilterKey, type Filters, type PanelGroup } from "@/lib/filters";
import { useT } from "@/lib/i18n";

const FOLDED_OPTIONS = 4;

const PILL = "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm md:min-h-10";

function PanelGroupView({
  group,
  selected,
  onToggle,
}: {
  group: PanelGroup;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const t = useT();
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const needle = search.trim().toLowerCase();
  const matching = group.options.filter(
    (option) => needle === "" || option.label.toLowerCase().includes(needle),
  );
  const folded = group.folds && !expanded && needle === "" && matching.length > FOLDED_OPTIONS;
  const visible = folded
    ? matching.filter((option, index) => index < FOLDED_OPTIONS || selected.includes(option.value))
    : matching;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <h3
        id={headingId}
        className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-muted"
      >
        {group.label}
      </h3>

      {group.searchLabel && group.options.length > FOLDED_OPTIONS && (
        <label className="relative block">
          <span className="sr-only">{group.searchLabel}</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon size={16} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={group.searchLabel}
            className="field bg-input-strong pl-9"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {visible.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option.value)}
              className={`${PILL} ${on ? "border-navy bg-navy font-semibold text-page" : "border-mist bg-card text-ink hover:bg-row-hover"}`}
            >
              {option.label}
            </button>
          );
        })}
        {folded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`${PILL} border-dashed border-slate font-semibold text-navy`}
          >
            {t("library.filters.more", { count: matching.length - visible.length })}
          </button>
        )}
        {matching.length === 0 && (
          <p className="text-sm text-muted">{t("library.filters.nothingFound")}</p>
        )}
      </div>
    </section>
  );
}

export function FilterPanel({
  groups,
  filters,
  countWith,
  showLabel,
  onApply,
  onClose,
}: {
  groups: PanelGroup[];
  filters: Filters;
  countWith: (draft: Filters) => number;
  showLabel?: (count: number) => string;
  onApply: (next: Filters) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Filters>(filters);
  const count = countWith(draft);
  const showText = showLabel ? showLabel(count) : t("library.filters.show", { count });

  function toggle(key: FilterKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  return (
    <Drawer
      label={t("library.filters.title")}
      onClose={onClose}
      header={
        <h2 className="font-serif text-2xl font-semibold md:text-[26px]">
          {t("library.filters.title")}
        </h2>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setDraft(NO_FILTERS)} className="btn-outline">
            {t("library.panel.reset")}
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="btn-primary"
          >
            {showText}
          </button>
          <p aria-live="polite" className="sr-only">
            {showText}
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <PanelGroupView
            key={group.key}
            group={group}
            selected={draft[group.key]}
            onToggle={(value) => toggle(group.key, value)}
          />
        ))}
      </div>
    </Drawer>
  );
}
