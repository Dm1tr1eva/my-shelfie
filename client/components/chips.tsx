"use client";

import {
  LINK_LANGUAGES,
  type LinkKind,
  type LinkLanguage,
  type Ownership,
  type SeriesStatus,
} from "@/lib/catalogue-constants";
import { CheckIcon } from "@/components/icons";
import { useDomain } from "@/lib/i18n/domain";

const SERIES_STATUS_CLASSES: Record<SeriesStatus, string> = {
  ongoing: "bg-navy text-page",
  readable: "bg-success text-card",
  complete: "bg-ink text-page",
  unknown: "bg-beige text-ink-soft",
};

const LANGUAGE_CLASSES: Record<LinkLanguage, string> = {
  ru: "bg-ink text-page",
  uk: "bg-navy text-page",
  en: "bg-burgundy text-card",
  other: "bg-beige text-ink-soft",
};

export function OwnershipChip({ ownership }: { ownership: Ownership }) {
  const domain = useDomain();

  return (
    <span
      className={`chip ${ownership === "owned" ? "bg-burgundy text-card" : "bg-mist text-navy"}`}
    >
      {domain.ownership(ownership)}
    </span>
  );
}

export function SeriesStatusChip({ status }: { status: SeriesStatus }) {
  const domain = useDomain();

  return (
    <span className={`chip ${SERIES_STATUS_CLASSES[status]}`}>{domain.seriesStatus(status)}</span>
  );
}

export function GapChip({ text }: { text: string }) {
  return <span className="chip bg-burgundy text-card">{text}</span>;
}

export function GenreChip({ genre }: { genre: string }) {
  const domain = useDomain();

  return <span className="chip bg-slate text-ink">{domain.genre(genre)}</span>;
}

export function TropeChip({ trope }: { trope: string }) {
  return <span className="chip border border-slate bg-card text-ink">{trope}</span>;
}

const KIND_CLASSES: Record<LinkKind, string> = {
  paper: "bg-navy text-page",
  ebook: "bg-mist text-navy",
  audio: "bg-beige text-burgundy",
  free: "bg-success text-card",
  online: "bg-slate text-ink",
};

export function LinkKindBadge({
  kind,
  decorative = false,
}: {
  kind: LinkKind;
  decorative?: boolean;
}) {
  const domain = useDomain();

  return (
    <span
      title={domain.linkKind(kind)}
      aria-hidden={decorative || undefined}
      className={`inline-flex items-center justify-center rounded-[5px] px-1.5 py-0.5 text-xs font-bold ${KIND_CLASSES[kind]}`}
    >
      <span aria-hidden="true">{domain.linkKindShort(kind)}</span>
      {!decorative && <span className="sr-only">{domain.linkKind(kind)}</span>}
    </span>
  );
}

export function LangBadge({ language }: { language: LinkLanguage }) {
  const domain = useDomain();
  const info = LINK_LANGUAGES.find((item) => item.value === language);

  return (
    <span
      title={domain.language(language)}
      className={`inline-flex min-w-7 items-center justify-center rounded-[5px] px-1.5 py-0.5 text-xs font-bold ${LANGUAGE_CLASSES[language]}`}
    >
      {info?.badge ?? language.toUpperCase()}
    </span>
  );
}

export function SelectedMark() {
  return <CheckIcon size={16} />;
}
