import { LINK_KINDS, LINK_LANGUAGES, type Book } from "./books";
import { translator, type Translate } from "./i18n";
import { englishDomain, type Domain } from "./i18n/domain";
import type { SeriesStatus } from "./catalogue-constants";
import { SERIES_STATUSES, type Series } from "./series";

export type FilterKey = "genre" | "trope" | "status" | "author" | "language" | "kind";

export const FILTER_KEYS: FilterKey[] = ["genre", "trope", "status", "author", "language", "kind"];

export type Filters = Record<FilterKey, string[]>;

export const NO_FILTERS: Filters = {
  genre: [],
  trope: [],
  status: [],
  author: [],
  language: [],
  kind: [],
};

export type Subject = { book?: Book; series?: Series };

export type FilterOption = { value: string; label: string; count: number; badge?: string };

export type FilterGroup = {
  key: FilterKey;
  label: string;
  options: FilterOption[];
  searchable: boolean;
};

export type FilterLabels = { t: Translate; domain: Domain };

const ENGLISH_LABELS: FilterLabels = { t: translator("en"), domain: englishDomain };

export function activeFilterCount(filters: Filters) {
  return FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
}

function valuesOf(subject: Subject, key: FilterKey): string[] {
  const { book, series } = subject;

  switch (key) {
    case "genre":
      return book?.genres ?? [];
    case "trope":
      return book?.tropes ?? [];
    case "status":
      return series ? [series.status] : [];
    case "author":
      if (book) return [book.author];
      return series?.author ? [series.author] : [];
    case "language":
      return book ? [...new Set(book.links.flatMap((link) => link.languages))] : [];
    case "kind":
      return book ? [...new Set(book.links.map((link) => link.kind))] : [];
  }
}

export function matchesFilters(subject: Subject, filters: Filters, except?: FilterKey) {
  return FILTER_KEYS.every((key) => {
    if (key === except) return true;

    const wanted = filters[key];
    if (wanted.length === 0) return true;

    const have = valuesOf(subject, key);
    return wanted.some((value) => have.includes(value));
  });
}

export function applyFilters<T>(items: T[], subjectOf: (item: T) => Subject, filters: Filters) {
  if (activeFilterCount(filters) === 0) return items;
  return items.filter((item) => matchesFilters(subjectOf(item), filters));
}

function labelOf(key: FilterKey, value: string, { domain }: FilterLabels) {
  if (key === "status") {
    return SERIES_STATUSES.includes(value as SeriesStatus)
      ? domain.seriesStatus(value as SeriesStatus)
      : value;
  }
  if (key === "language") {
    const language = LINK_LANGUAGES.find((item) => item.value === value);
    return language ? domain.language(language.value) : value;
  }
  if (key === "kind") {
    const kind = LINK_KINDS.find((item) => item.value === value);
    return kind ? domain.linkKind(kind.value) : value;
  }
  if (key === "genre") return domain.genre(value);
  return value;
}

function badgeOf(key: FilterKey, value: string) {
  if (key !== "language") return undefined;
  return LINK_LANGUAGES.find((language) => language.value === value)?.badge;
}

function orderOf(key: FilterKey, values: string[]) {
  if (key === "status") return SERIES_STATUSES.filter((value) => values.includes(value));
  if (key === "language") {
    return LINK_LANGUAGES.map((language) => language.value as string).filter((value) =>
      values.includes(value),
    );
  }
  if (key === "kind") {
    return LINK_KINDS.map((kind) => kind.value as string).filter((value) => values.includes(value));
  }
  return null;
}

export function buildFilterGroups<T>(
  items: T[],
  subjectOf: (item: T) => Subject,
  filters: Filters,
  labels: FilterLabels = ENGLISH_LABELS,
): FilterGroup[] {
  const subjects = items.map(subjectOf);

  return FILTER_KEYS.map((key) => {
    const present = new Set<string>(filters[key]);
    for (const subject of subjects) {
      for (const value of valuesOf(subject, key)) present.add(value);
    }

    const counts = new Map<string, number>([...present].map((value) => [value, 0]));
    for (const subject of subjects) {
      if (!matchesFilters(subject, filters, key)) continue;
      for (const value of new Set(valuesOf(subject, key))) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    const fixed = orderOf(key, [...present]);
    const values =
      fixed ??
      [...present].sort(
        (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
      );

    return {
      key,
      label: labels.t(`library.filters.group.${key}`),
      searchable: key === "trope" || key === "author",
      options: values.map((value) => ({
        value,
        label: labelOf(key, value, labels),
        badge: badgeOf(key, value),
        count: counts.get(value) ?? 0,
      })),
    };
  });
}

export function chipLabel(key: FilterKey, value: string, labels: FilterLabels = ENGLISH_LABELS) {
  const label = labelOf(key, value, labels);
  if (key === "language" || key === "status" || key === "kind") {
    return labels.t(`library.filters.chip.${key}`, {
      value: key === "language" ? (badgeOf(key, value) ?? label) : label,
    });
  }
  return label;
}
