import { LINK_KINDS, LINK_LANGUAGES, STATUSES, type Book, type BookStatus } from "./books";
import { translator, type Translate } from "./i18n";
import { englishDomain, type Domain } from "./i18n/domain";
import type { AgeRating, Format, SeriesStatus } from "./catalogue-constants";
import { SERIES_STATUSES, type Series } from "./series";

export type FilterKey =
  | "have"
  | "reading"
  | "format"
  | "genre"
  | "age"
  | "trope"
  | "author"
  | "status"
  | "language"
  | "kind"
  | "rating";

export type BarFilterKey = "genre" | "trope" | "status" | "author" | "language" | "kind";

export const FILTER_KEYS: BarFilterKey[] = [
  "genre",
  "trope",
  "status",
  "author",
  "language",
  "kind",
];

export const LIBRARY_FILTER_KEYS: FilterKey[] = [
  "have",
  "reading",
  "format",
  "genre",
  "age",
  "trope",
  "author",
  "status",
  "language",
  "kind",
  "rating",
];

export type Filters = Record<FilterKey, string[]>;

export const NO_FILTERS: Filters = {
  have: [],
  reading: [],
  format: [],
  genre: [],
  age: [],
  trope: [],
  author: [],
  status: [],
  language: [],
  kind: [],
  rating: [],
};

export const STANDALONE = "standalone";

export type Subject = { book?: Book; series?: Series };

export type FilterOption = { value: string; label: string; count: number; badge?: string };

export type FilterGroup = {
  key: BarFilterKey;
  label: string;
  options: FilterOption[];
  searchable: boolean;
};

export type FilterLabels = { t: Translate; domain: Domain };

const ENGLISH_LABELS: FilterLabels = { t: translator("en"), domain: englishDomain };

export function activeFilterCount(filters: Filters) {
  return LIBRARY_FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
}

function ratingValue(rating: number | undefined) {
  if (!rating) return "none";
  return rating >= 4 ? String(rating) : "low";
}

function valuesOf(subject: Subject, key: FilterKey): string[] {
  const { book, series } = subject;

  switch (key) {
    case "have":
      return book ? [book.ownership === "wanted" ? "wanted" : "owned"] : [];
    case "reading":
      return book && book.ownership !== "wanted" ? [book.status] : [];
    case "format":
      return book ? [book.format] : [];
    case "age":
      return book ? [book.ageRating] : [];
    case "rating":
      return book ? [ratingValue(book.rating)] : [];
    case "genre":
      return book?.genres ?? [];
    case "trope":
      return book?.tropes ?? [];
    case "status":
      if (series) return [series.status];
      return book ? [STANDALONE] : [];
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
  return LIBRARY_FILTER_KEYS.every((key) => {
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

export type PanelOption = { value: string; label: string };

export type PanelGroup = {
  key: FilterKey;
  label: string;
  options: PanelOption[];
  folds: boolean;
  searchLabel?: string;
};

const FORMAT_VALUES: Format[] = ["paper", "ebook", "audio"];
const AGE_VALUES: AgeRating[] = ["none", "12", "16", "18"];
const RATING_VALUES = ["5", "4", "low", "none"];
const FOLDING: FilterKey[] = ["genre", "trope", "author"];

export function panelOptionLabel(key: FilterKey, value: string, { t, domain }: FilterLabels) {
  switch (key) {
    case "have":
      return value === "wanted" ? t("shell.labels.inWishlist") : t("library.panel.have.owned");
    case "reading":
      return STATUSES.includes(value as BookStatus) ? domain.status(value as BookStatus) : value;
    case "format":
      return FORMAT_VALUES.includes(value as Format) ? domain.format(value as Format) : value;
    case "age":
      return value === "none" ? t("library.panel.age.none") : `${value}+`;
    case "status":
      return value === STANDALONE
        ? t("library.standalone.title")
        : labelOf(key, value, { t, domain });
    case "language":
      return badgeOf(key, value) ?? value;
    case "kind": {
      const kind = LINK_KINDS.find((item) => item.value === value);
      return kind ? domain.linkKindShort(kind.value) : value;
    }
    case "rating":
      if (value === "low") return t("library.panel.rating.low");
      if (value === "none") return t("library.panel.rating.none");
      return `★ ${value}`;
    default:
      return labelOf(key, value, { t, domain });
  }
}

export function panelChipLabel(key: FilterKey, value: string, labels: FilterLabels) {
  const label = panelOptionLabel(key, value, labels);
  if (key === "age") return labels.t("library.panel.chip.age", { value: label });
  if (key === "language") return labels.t("library.panel.chip.language", { value: label });
  if (key === "kind") return labels.t("library.filters.chip.kind", { value: label });
  if (key === "status" && value !== STANDALONE) {
    return labels.t("library.filters.chip.status", { value: label });
  }
  return label;
}

function byFrequency(subjects: Subject[], key: FilterKey) {
  const counts = new Map<string, number>();
  for (const subject of subjects) {
    for (const value of new Set(valuesOf(subject, key))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.keys()].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
  );
}

function panelValues(key: FilterKey, subjects: Subject[]): string[] {
  const present = (fixed: string[]) => {
    const found = new Set(subjects.flatMap((subject) => valuesOf(subject, key)));
    return fixed.filter((value) => found.has(value));
  };

  switch (key) {
    case "have":
      return ["owned", "wanted"];
    case "reading":
      return STATUSES;
    case "format":
      return FORMAT_VALUES;
    case "age":
      return subjects.some((subject) => subject.book && subject.book.ageRating !== "none")
        ? AGE_VALUES
        : [];
    case "status":
      return [...SERIES_STATUSES, STANDALONE];
    case "language":
      return present(LINK_LANGUAGES.map((language) => language.value));
    case "kind":
      return present(LINK_KINDS.map((kind) => kind.value));
    case "rating":
      return RATING_VALUES;
    default:
      return byFrequency(subjects, key);
  }
}

export function libraryFilterGroups(subjects: Subject[], labels: FilterLabels): PanelGroup[] {
  return LIBRARY_FILTER_KEYS.map((key) => ({
    key,
    label: labels.t(`library.panel.group.${key}`),
    folds: FOLDING.includes(key),
    searchLabel: key === "trope" ? labels.t("library.filters.searchForOne.trope") : undefined,
    options: panelValues(key, subjects).map((value) => ({
      value,
      label: panelOptionLabel(key, value, labels),
    })),
  })).filter((group) => group.options.length > 0);
}
