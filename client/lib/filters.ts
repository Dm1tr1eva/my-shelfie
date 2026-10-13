import { LINK_LANGUAGES, type Book } from "./books";
import { SERIES_STATUS_LABELS, SERIES_STATUSES, type Series } from "./series";

export type FilterKey = "genre" | "trope" | "status" | "author" | "language";

export const FILTER_KEYS: FilterKey[] = ["genre", "trope", "status", "author", "language"];

export type Filters = Record<FilterKey, string[]>;

export const NO_FILTERS: Filters = { genre: [], trope: [], status: [], author: [], language: [] };

export type Subject = { book?: Book; series?: Series };

export type FilterOption = { value: string; label: string; count: number; badge?: string };

export type FilterGroup = {
  key: FilterKey;
  label: string;
  options: FilterOption[];
  searchable: boolean;
};

const GROUP_LABELS: Record<FilterKey, string> = {
  genre: "Genre",
  trope: "Trope",
  status: "Series status",
  author: "Author",
  language: "Shop language",
};

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
      return book ? [...new Set(book.links.map((link) => link.language))] : [];
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

function labelOf(key: FilterKey, value: string) {
  if (key === "status") {
    return SERIES_STATUS_LABELS[value as keyof typeof SERIES_STATUS_LABELS] ?? value;
  }
  if (key === "language") {
    return LINK_LANGUAGES.find((language) => language.value === value)?.name ?? value;
  }
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
  return null;
}

export function buildFilterGroups<T>(
  items: T[],
  subjectOf: (item: T) => Subject,
  filters: Filters,
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
      label: GROUP_LABELS[key],
      searchable: key === "trope" || key === "author",
      options: values.map((value) => ({
        value,
        label: labelOf(key, value),
        badge: badgeOf(key, value),
        count: counts.get(value) ?? 0,
      })),
    };
  });
}

export function chipLabel(key: FilterKey, value: string) {
  const label = labelOf(key, value);
  if (key === "language") return `Shop language: ${badgeOf(key, value) ?? label}`;
  if (key === "status") return `Series: ${label}`;
  return label;
}
