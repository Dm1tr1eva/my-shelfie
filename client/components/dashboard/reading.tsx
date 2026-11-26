"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { Muted, Section } from "@/components/dashboard/section";
import { Popover } from "@/components/popover";
import { useLocale, useT } from "@/lib/i18n";
import { translateError } from "@/lib/i18n/server-errors";
import { useHomeActions, type ReadingBook } from "@/lib/stats";

const STEPS = [10, 25, 50];

type Unit = "pages" | "percent";

function pageOf(book: ReadingBook) {
  return (
    book.progress?.page ?? Math.round(((book.progress?.percent ?? 0) * (book.pages ?? 0)) / 100)
  );
}

function WhereAreYou({
  book,
  onClose,
  onFinish,
}: {
  book: ReadingBook;
  onClose: () => void;
  onFinish: () => void;
}) {
  const t = useT();
  const { recordProgress } = useHomeActions();
  const canPages = Boolean(book.pages) && book.format !== "audio";
  const [unit, setUnit] = useState<Unit>(canPages ? "pages" : "percent");
  const [value, setValue] = useState(
    String(canPages ? pageOf(book) : (book.progress?.percent ?? 0)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = unit === "pages" ? (book.pages ?? 0) : 100;
  const number = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(number) && number >= 0 && number <= max;

  function switchUnit(next: Unit) {
    if (next === unit || !book.pages) return;
    const converted =
      next === "percent"
        ? Math.floor((number * 100) / book.pages)
        : Math.round((number * book.pages) / 100);
    setUnit(next);
    setValue(String(Number.isFinite(converted) ? converted : 0));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await recordProgress(book.id, unit === "pages" ? { page: number } : { percent: number });
      onClose();
    } catch (failure) {
      setError(translateError(failure, t));
      setSaving(false);
    }
  }

  const fieldId = useId();

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {canPages && (
        <div role="radiogroup" aria-label={t("dashboard.where.unit")} className="flex gap-2">
          {(["pages", "percent"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={unit === option}
              onClick={() => switchUnit(option)}
              className={`min-h-10 flex-1 rounded-pill px-3 text-sm font-semibold ${
                unit === option ? "bg-navy text-page" : "border border-mist text-navy"
              }`}
            >
              {t(option === "pages" ? "dashboard.where.pages" : "dashboard.where.percent")}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {t(unit === "pages" ? "dashboard.where.page" : "dashboard.where.percentField")}
        </label>
        <input
          id={fieldId}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="field num w-24 bg-input-strong"
        />
        <span className="text-sm text-muted">
          {unit === "pages" ? t("dashboard.where.ofPages", { pages: max }) : "%"}
        </span>
      </div>

      <div className="flex gap-2">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            aria-label={t("dashboard.where.add", { step: unit === "pages" ? step : `${step}%` })}
            onClick={() => setValue(String(Math.min(max, (valid ? number : 0) + step)))}
            className="num min-h-10 flex-1 rounded-pill border border-mist text-sm text-navy hover:bg-beige"
          >
            +{step}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onFinish} disabled={saving} className="btn-outline">
          {t(book.format === "audio" ? "dashboard.reading.listened" : "dashboard.reading.finished")}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-outline border-transparent">
            {t("dashboard.where.cancel")}
          </button>
          <button type="submit" disabled={!valid || saving} className="btn-primary">
            {t("dashboard.where.save")}
          </button>
        </div>
      </div>
    </form>
  );
}

function ReadingRow({ book, headingId }: { book: ReadingBook; headingId: string }) {
  const t = useT();
  const locale = useLocale();
  const { finishBook } = useHomeActions();
  const [open, setOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverId = useId();
  const audio = book.format === "audio";
  const percent = book.progress?.percent ?? 0;
  const href = `/books/${book.id}`;

  async function finish() {
    setFinishing(true);
    setError(null);
    try {
      await finishBook(book.id);
      document.getElementById(headingId)?.focus();
    } catch (failure) {
      setError(translateError(failure, t));
      setFinishing(false);
    }
  }

  const started =
    book.startedAt &&
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(book.startedAt));

  return (
    <li className="flex flex-col gap-4 border-t border-mist pt-4 first:border-t-0 first:pt-0">
      <div className="flex gap-4">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="w-[72px] shrink-0 sm:w-[84px]"
        >
          <BookCover url={book.coverUrl} title={book.title} format={book.format} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link
            href={href}
            className="font-serif text-xl font-semibold leading-snug hover:underline"
          >
            {book.title}
          </Link>
          <p className="text-sm text-muted">
            {book.series &&
              `${book.series.title}${book.series.number !== undefined ? ` #${book.series.number}` : ""} · `}
            {book.author}
          </p>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={t("dashboard.reading.progress", { percent })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-beige"
            >
              <div className="h-full rounded-full bg-burgundy" style={{ width: `${percent}%` }} />
            </div>
            <span className="num text-sm text-burgundy">{percent}%</span>
          </div>
          {started && (
            <p className="text-xs text-muted">
              {t("dashboard.reading.started", { date: started })}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          onClick={() => setOpen((value) => !value)}
          className="btn-outline max-sm:px-4 max-sm:text-sm"
        >
          {t(audio ? "dashboard.reading.markProgress" : "dashboard.reading.markPage")}
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="btn-primary max-sm:px-4 max-sm:text-sm"
        >
          {t(audio ? "dashboard.reading.listened" : "dashboard.reading.finished")}
        </button>
        {open && (
          <Popover id={popoverId} label={t("dashboard.where.title")} onClose={() => setOpen(false)}>
            <WhereAreYou
              book={book}
              onClose={() => setOpen(false)}
              onFinish={() => {
                setOpen(false);
                finish();
              }}
            />
          </Popover>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      )}
    </li>
  );
}

export function CurrentlyReading({ books }: { books: ReadingBook[] }) {
  const t = useT();
  const headingId = "home-reading";

  return (
    <Section id={headingId} title={t("dashboard.reading.title")}>
      {books.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <Muted>{t("dashboard.reading.empty")}</Muted>
          <Link href="/library" className="btn-outline">
            {t("dashboard.reading.openLibrary")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {books.map((book) => (
            <ReadingRow key={book.id} book={book} headingId={headingId} />
          ))}
        </ul>
      )}
    </Section>
  );
}
