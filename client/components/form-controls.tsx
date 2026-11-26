"use client";

import { useId } from "react";
import { CheckIcon, StarIcon } from "@/components/icons";
import { SERIES_STATE_CHOICES, type SeriesStatus } from "@/lib/series";
import { STATUSES, type BookStatus, type Format } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";

const TOGGLE_FORMATS: Format[] = ["paper", "ebook"];

function SegmentedToggle<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-control border border-field p-0.5"
    >
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[6px] px-4 font-semibold ${
              selected ? "bg-burgundy text-card" : "hover:bg-beige"
            }`}
          >
            {selected && <CheckIcon size={16} />}
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}

export function FormatToggle({
  value,
  onChange,
}: {
  value: Format;
  onChange: (value: Format) => void;
}) {
  const t = useT();
  const domain = useDomain();

  return (
    <SegmentedToggle
      label={t("book.controls.format")}
      options={TOGGLE_FORMATS}
      labels={{
        paper: domain.format("paper"),
        ebook: domain.format("ebook"),
        audio: domain.format("audio"),
      }}
      value={value}
      onChange={onChange}
    />
  );
}

export function ReadingStatusPills({
  value,
  onChange,
}: {
  value: BookStatus;
  onChange: (value: BookStatus) => void;
}) {
  const t = useT();
  const domain = useDomain();

  return (
    <div role="group" aria-label={t("book.controls.status")} className="flex flex-wrap gap-2">
      {STATUSES.map((status) => {
        const selected = value === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(status)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold ${
              selected ? "border-navy bg-navy text-page" : "border-field hover:bg-beige"
            }`}
          >
            {selected && <CheckIcon size={16} />}
            {domain.status(status)}
          </button>
        );
      })}
    </div>
  );
}

export function StarRating({
  value,
  onChange,
  compact = false,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  compact?: boolean;
}) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div role="group" aria-label={t("book.controls.rating")} className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={t("book.controls.rate", { star })}
            aria-pressed={value === star}
            onClick={() => onChange(compact && value === star ? undefined : star)}
            className="inline-flex h-11 w-11 items-center justify-center text-burgundy"
          >
            <StarIcon size={26} filled={value !== undefined && star <= value} />
          </button>
        ))}
      </div>

      {compact ? null : value === undefined ? (
        <span className="text-sm text-muted">{t("book.controls.notRated")}</span>
      ) : (
        <button type="button" onClick={() => onChange(undefined)} className="btn-outline">
          {t("book.controls.clear")}
        </button>
      )}
    </div>
  );
}

export function SeriesStatePills({
  value,
  onChange,
}: {
  value: SeriesStatus;
  onChange: (value: SeriesStatus) => void;
}) {
  const labelId = useId();
  const t = useT();
  const domain = useDomain();

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="font-semibold">
        {t("book.controls.seriesFinished")}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {SERIES_STATE_CHOICES.map((choice) => {
          const selected = value === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(choice.value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold ${
                selected ? "border-navy bg-navy text-page" : "border-field hover:bg-beige"
              }`}
            >
              {selected && <CheckIcon size={16} />}
              {domain.seriesChoice(choice.value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
