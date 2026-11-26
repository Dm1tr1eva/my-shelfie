"use client";

import { useMemo } from "react";
import { DEFAULT_GENRES, type BookStatus } from "@/lib/books";
import {
  PRESET_MOODS,
  type Format,
  type LinkKind,
  type LinkLanguage,
  type Ownership,
  type Recommend,
  type SeriesStatus,
} from "@/lib/catalogue-constants";
import { translator, useLocale, type MessageKey, type Translate } from "./index";

export function makeDomain(t: Translate) {
  return {
    status: (value: BookStatus) => t(`domain.status.${value}`),
    bookStatus: (value: BookStatus, format: Format) =>
      format === "audio" && (value === "reading" || value === "read")
        ? t(`domain.statusAudio.${value}`)
        : t(`domain.status.${value}`),
    mood: (name: string) =>
      PRESET_MOODS.includes(name) ? t(`domain.mood.${name}` as MessageKey) : name,
    recommend: (value: Recommend) => t(`domain.recommend.${value}`),
    ownership: (value: Ownership) => t(`domain.ownership.${value}`),
    format: (value: Format) => t(`domain.format.${value}`),
    formatBook: (value: Format) => t(`domain.format.${value}Book`),
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
