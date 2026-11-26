import { LINK_KINDS, LINK_LANGUAGES, STATUSES, type Book, type BookStatus } from "./books";
import type { Translate } from "./i18n";
import type { Domain } from "./i18n/domain";
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

export const BOOK_FILTER_KEYS: FilterKey[] = [
  "have",
  "reading",
  "format",
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

export type FilterLabels = { t: Translate; domain: Domain };

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
      return book && book.ownership !== "wanted" ? [ratingValue(book.rating)] : [];
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

export type ValuesOf<T> = (item: T, key: FilterKey) => readonly string[];

export function matchesValues<T>(
  item: T,
  valuesFor: ValuesOf<T>,
  filters: Filters,
  except?: FilterKey,
) {
  return LIBRARY_FILTER_KEYS.every((key) => {
    if (key === except) return true;

    const wanted = filters[key];
    if (wanted.length === 0) return true;

    const have = valuesFor(item, key);
    return wanted.some((value) => have.includes(value));
  });
}

export function matchesFilters(subject: Subject, filters: Filters, except?: FilterKey) {
  return matchesValues(subject, valuesOf, filters, except);
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

const KNOWN_VALUES: Partial<Record<FilterKey, readonly string[]>> = {
  have: ["owned", "wanted"],
  reading: STATUSES,
  format: FORMAT_VALUES,
  age: AGE_VALUES,
  status: [...SERIES_STATUSES, STANDALONE],
  language: LINK_LANGUAGES.map((language) => language.value),
  kind: LINK_KINDS.map((kind) => kind.value),
  rating: RATING_VALUES,
};

export function knownFilterValues(key: FilterKey) {
  return KNOWN_VALUES[key];
}
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

function byFrequency<T>(items: T[], valuesFor: ValuesOf<T>, key: FilterKey) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const value of new Set(valuesFor(item, key))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.keys()].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
  );
}

function panelValues<T>(key: FilterKey, items: T[], valuesFor: ValuesOf<T>): readonly string[] {
  const known = KNOWN_VALUES[key];
  if (!known) return byFrequency(items, valuesFor, key);

  if (key === "age") {
    return items.some((item) => valuesFor(item, key).some((value) => value !== "none"))
      ? known
      : [];
  }
  if (key === "language" || key === "kind") {
    const found = new Set(items.flatMap((item) => valuesFor(item, key)));
    return known.filter((value) => found.has(value));
  }
  return known;
}

export function filterPanelGroups<T>(
  keys: FilterKey[],
  items: T[],
  valuesFor: ValuesOf<T>,
  labels: FilterLabels,
): PanelGroup[] {
  return keys
    .map((key) => ({
      key,
      label: labels.t(`library.panel.group.${key}`),
      folds: FOLDING.includes(key),
      searchLabel: key === "trope" ? labels.t("library.filters.searchForOne.trope") : undefined,
      options: panelValues(key, items, valuesFor).map((value) => ({
        value,
        label: panelOptionLabel(key, value, labels),
      })),
    }))
    .filter((group) => group.options.length > 0);
}

export function libraryFilterGroups(subjects: Subject[], labels: FilterLabels): PanelGroup[] {
  return filterPanelGroups(LIBRARY_FILTER_KEYS, subjects, valuesOf, labels);
}
