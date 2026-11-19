"use client";

import {
  LINK_LANGUAGES,
  type LinkKind,
  type LinkLanguage,
  type SeriesStatus,
} from "@/lib/catalogue-constants";
import type { BookStatus } from "@/lib/books";
import { BookmarkIcon, CheckIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";

const SERIES_STATUS_CLASSES: Record<SeriesStatus, string> = {
  ongoing: "text-navy ring-slate",
  readable: "text-navy ring-slate",
  complete: "text-muted ring-mist",
  unknown: "text-muted ring-mist",
};

const STATUS_DOT_CLASSES: Record<BookStatus, { dot: string; word: string }> = {
  want: { dot: "border-[1.5px] border-muted", word: "text-ink" },
  reading: { dot: "bg-burgundy", word: "font-semibold text-burgundy" },
  read: { dot: "bg-navy", word: "text-ink" },
  dropped: { dot: "bg-mist", word: "text-muted" },
};

export function StatusDot({ status }: { status: BookStatus }) {
  const domain = useDomain();
  const { dot, word } = STATUS_DOT_CLASSES[status];

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] ${word}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {domain.status(status)}
    </span>
  );
}

export function WishlistLabel() {
  const t = useT();

  return (
    <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full bg-mist pl-1.5 pr-2 text-[11px] font-bold leading-none text-navy">
      <BookmarkIcon size={12} />
      {t("shell.labels.inWishlist")}
    </span>
  );
}

export function SeriesStatusChip({ status }: { status: SeriesStatus }) {
  const domain = useDomain();

  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${SERIES_STATUS_CLASSES[status]}`}
    >
      {domain.seriesStatus(status)}
    </span>
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
      className="inline-flex h-[22px] min-w-7 items-center justify-center rounded-[6px] border border-slate px-[7px] text-[11px] font-bold tracking-[0.04em] text-navy"
    >
      {info?.badge ?? language.toUpperCase()}
    </span>
  );
}

export function SelectedMark() {
  return <CheckIcon size={16} />;
}
