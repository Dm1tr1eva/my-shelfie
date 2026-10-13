import { LINK_LANGUAGES, OWNERSHIP_LABELS, type LinkLanguage, type Ownership } from "@/lib/books";
import { SERIES_STATUS_LABELS, type SeriesStatus } from "@/lib/series";
import { CheckIcon } from "@/components/icons";

const SERIES_STATUS_CLASSES: Record<SeriesStatus, string> = {
  ongoing: "bg-navy text-page",
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
  return (
    <span
      className={`chip ${ownership === "owned" ? "bg-burgundy text-card" : "bg-mist text-navy"}`}
    >
      {OWNERSHIP_LABELS[ownership]}
    </span>
  );
}

export function SeriesStatusChip({ status }: { status: SeriesStatus }) {
  return (
    <span className={`chip ${SERIES_STATUS_CLASSES[status]}`}>{SERIES_STATUS_LABELS[status]}</span>
  );
}

export function GapChip({ text }: { text: string }) {
  return <span className="chip bg-burgundy text-card">{text}</span>;
}

export function GenreChip({ genre }: { genre: string }) {
  return <span className="chip bg-slate text-ink">{genre}</span>;
}

export function TropeChip({ trope }: { trope: string }) {
  return <span className="chip border border-slate bg-card text-ink">{trope}</span>;
}

export function LangBadge({ language }: { language: LinkLanguage }) {
  const info = LINK_LANGUAGES.find((item) => item.value === language);

  return (
    <span
      title={info?.name}
      className={`inline-flex min-w-7 items-center justify-center rounded-[5px] px-1.5 py-0.5 text-xs font-bold ${LANGUAGE_CLASSES[language]}`}
    >
      {info?.badge ?? language.toUpperCase()}
    </span>
  );
}

export function SelectedMark() {
  return <CheckIcon size={16} />;
}
