"use client";

import { useMemo } from "react";
import { DEFAULT_GENRES, type BookStatus } from "@/lib/books";
import type {
  Format,
  LinkKind,
  LinkLanguage,
  Ownership,
  SeriesStatus,
} from "@/lib/catalogue-constants";
import { translator, useLocale, type MessageKey, type Translate } from "./index";

export function makeDomain(t: Translate) {
  return {
    status: (value: BookStatus) => t(`domain.status.${value}`),
    ownership: (value: Ownership) => t(`domain.ownership.${value}`),
    format: (value: Format) => t(`domain.format.${value}`),
    formatBook: (value: Format) =>
      t(value === "paper" ? "domain.format.paperBook" : "domain.format.ebookBook"),
    seriesStatus: (value: SeriesStatus) => t(`domain.seriesStatus.${value}`),
    seriesChoice: (value: SeriesStatus) => t(`domain.seriesChoice.${value}`),
    seriesHeader: (value: SeriesStatus) => t(`domain.seriesHeader.${value}`),
    linkKind: (value: LinkKind) => t(`domain.linkKind.${value}`),
    linkKindShort: (value: LinkKind) => t(`domain.linkKindShort.${value}`),
    language: (value: LinkLanguage) => t(`domain.language.${value === "other" ? "misc" : value}`),
    genre: (name: string) =>
      DEFAULT_GENRES.includes(name) ? t(`domain.genre.${name}` as MessageKey) : name,
  };
}

export type Domain = ReturnType<typeof makeDomain>;

export const englishDomain: Domain = makeDomain(translator("en"));

export function useDomain(): Domain {
  const locale = useLocale();
  return useMemo(() => makeDomain(translator(locale)), [locale]);
}
