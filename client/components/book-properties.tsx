"use client";

import { useCallback, useId, useRef, useState } from "react";
import { StarRating } from "@/components/form-controls";
import { XIcon } from "@/components/icons";
import { ProgressBar } from "@/components/progress-bar";
import { Select } from "@/components/select";
import { STATUSES, type Book, type BookStatus } from "@/lib/books";
import {
  BOOK_LENGTH_MAX,
  DATE_YEAR_MAX,
  DATE_YEAR_MIN,
  type Format,
  type Ownership,
} from "@/lib/catalogue-constants";
import { isWholeIn } from "@/lib/numbers";
import { useLocale, useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { useBookProgress } from "@/lib/progress";
import { useDraft, type SaveBook } from "@/lib/use-book-autosave";

const FORMATS: Format[] = ["paper", "ebook", "audio"];
const OWNERSHIPS: Ownership[] = ["owned", "wanted"];

function Row({
  label,
  labelId,
  children,
}: {
  label: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt id={labelId} className="flex min-h-11 items-center text-sm text-muted">
        {label}
      </dt>
      <dd className="flex min-h-11 min-w-0 items-center">{children}</dd>
    </>
  );
}

function HaveToggle({
  value,
  onChange,
  labelId,
}: {
  value: Ownership;
  onChange: (value: Ownership) => void;
  labelId: string;
}) {
  const t = useT();

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="inline-flex rounded-pill bg-page p-0.5"
    >
      {OWNERSHIPS.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => !selected && onChange(option)}
            className={`inline-flex min-h-9 items-center rounded-pill px-3.5 text-sm font-semibold ${
              selected
                ? option === "owned"
                  ? "bg-burgundy text-card"
                  : "bg-mist text-navy"
                : "text-ink hover:bg-beige"
            }`}
          >
            {t(`book.panel.haveOptions.${option}`)}
          </button>
        );
      })}
    </div>
  );
}

function PagesField({ book, save, labelId }: { book: Book; save: SaveBook; labelId: string }) {
  const t = useT();
  const [invalid, setInvalid] = useState(false);
  const commit = useCallback(
    async (text: string) => {
      if (text.trim() !== "" && !isWholeIn(text, 1, BOOK_LENGTH_MAX)) {
        setInvalid(true);
        return false;
      }
      return save({ pages: text.trim() === "" ? null : Number(text) }, { optimistic: false });
    },
    [save],
  );
  const draft = useDraft("pages", book.pages === undefined ? "" : String(book.pages), commit);

  return (
    <div className="flex flex-col gap-1">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={BOOK_LENGTH_MAX}
        aria-labelledby={labelId}
        aria-invalid={invalid}
        value={draft.value}
        onChange={(event) => {
          draft.setValue(event.target.value);
          setInvalid(false);
        }}
        onFocus={() => draft.setEditing(true)}
        onBlur={() => {
          draft.setEditing(false);
          void draft.flush();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={`field min-h-10 w-24 bg-card ${invalid ? "border-2 border-burgundy" : "border-mist"}`}
      />
      {invalid && (
        <p role="alert" className="text-sm font-semibold text-burgundy">
          {t("book.panel.pagesInvalid")}
        </p>
      )}
    </div>
  );
}

function durationText(minutes: number | undefined) {
  return minutes === undefined ? ":" : `${Math.floor(minutes / 60)}:${minutes % 60}`;
}

function DurationField({ book, save, labelId }: { book: Book; save: SaveBook; labelId: string }) {
  const t = useT();
  const [invalid, setInvalid] = useState(false);
  const commit = useCallback(
    async (text: string) => {
      const [hours, minutes] = text.split(":");
      if (hours.trim() === "" && minutes.trim() === "") {
        return save({ durationMinutes: null }, { optimistic: false });
      }
      const h = hours.trim() === "" ? "0" : hours;
      const m = minutes.trim() === "" ? "0" : minutes;
      const total = Number(h) * 60 + Number(m);
      if (
        !isWholeIn(h, 0, BOOK_LENGTH_MAX) ||
        !isWholeIn(m, 0, 59) ||
        total < 1 ||
        total > BOOK_LENGTH_MAX
      ) {
        setInvalid(true);
        return false;
      }
      return save({ durationMinutes: total }, { optimistic: false });
    },
    [save],
  );
  const draft = useDraft("duration", durationText(book.durationMinutes), commit);
  const [hours, minutes] = draft.value.split(":");

  function part(index: 0 | 1, text: string) {
    const parts = draft.value.split(":");
    parts[index] = text;
    draft.setValue(parts.join(":"));
    setInvalid(false);
  }

  const input = `field min-h-10 w-14 bg-card px-2 ${invalid ? "border-2 border-burgundy" : "border-mist"}`;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-1"
      onFocus={() => draft.setEditing(true)}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        draft.setEditing(false);
        void draft.flush();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLElement).blur();
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label={t("book.panel.hours")}
          aria-invalid={invalid}
          value={hours}
          onChange={(event) => part(0, event.target.value)}
          className={input}
        />
        {t("book.panel.hoursShort")}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          aria-label={t("book.panel.minutes")}
          aria-invalid={invalid}
          value={minutes}
          onChange={(event) => part(1, event.target.value)}
          className={input}
        />
        {t("book.panel.minutesShort")}
      </div>
      {invalid && (
        <p role="alert" className="text-sm font-semibold text-burgundy">
          {t("book.panel.durationInvalid")}
        </p>
      )}
    </div>
  );
}

function dateValue(iso: string | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | null) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const button = useRef<HTMLButtonElement>(null);

  function start() {
    setDraft(dateValue(value));
    setEditing(true);
  }

  function finish(text: string, refocus: boolean) {
    if (!editing) return;
    setEditing(false);
    if (refocus) window.setTimeout(() => button.current?.focus());
    if (text === dateValue(value)) return;
    const year = Number(text.slice(0, 4));
    if (text !== "" && (year < DATE_YEAR_MIN || year > DATE_YEAR_MAX)) return;
    onChange(text === "" ? null : text);
  }

  if (editing) {
    return (
      <input
        type="date"
        aria-label={label}
        autoFocus
        min={`${DATE_YEAR_MIN}-01-01`}
        max={`${DATE_YEAR_MAX}-12-31`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => finish(event.target.value, false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            finish(event.currentTarget.value, true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
            window.setTimeout(() => button.current?.focus());
          }
        }}
        className="field min-h-10 w-auto bg-card"
      />
    );
  }

  const shown = value
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : null;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        ref={button}
        type="button"
        aria-label={shown ? `${label}: ${shown}` : `${label}: ${t("book.panel.pickDate")}`}
        onClick={start}
        className={`inline-flex min-h-9 items-center rounded-control px-3 text-sm ${
          shown
            ? "bg-page text-ink hover:bg-beige"
            : "border border-dashed border-slate text-muted hover:bg-page"
        }`}
      >
        {shown ?? t("book.panel.pickDate")}
      </button>
      {shown && (
        <button
          type="button"
          aria-label={`${label}: ${t("book.panel.clearDate")}`}
          onClick={() => onChange(null)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-beige"
        >
          <XIcon size={14} />
        </button>
      )}
    </span>
  );
}

function Progress({ book, labelId }: { book: Book; labelId: string }) {
  const t = useT();
  const percent = useBookProgress(book.id);

  return (
    <ProgressBar
      percent={percent}
      labelledBy={labelId}
      valueText={t("book.panel.progressLabel", { percent })}
      muted={book.status === "dropped"}
    />
  );
}

export function BookProperties({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const domain = useDomain();
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;
  const audio = book.format === "audio";
  const owned = book.ownership === "owned";
  const status = book.status;
  const showProgress = owned && (status === "reading" || status === "dropped");
  const showRating = owned && (status === "read" || status === "dropped");
  const showDates = owned && status !== "want";

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 md:gap-x-6">
      <Row label={t("book.panel.have")} labelId={id("have")}>
        <HaveToggle
          labelId={id("have")}
          value={book.ownership}
          onChange={(ownership) => void save({ ownership })}
        />
      </Row>
      <Row label={t("book.panel.format")}>
        <Select
          label={t("book.panel.format")}
          hideLabel
          className="text-sm"
          value={book.format}
          onChange={(format) => void save({ format: format as Format })}
          options={FORMATS.map((format) => ({ value: format, label: domain.format(format) }))}
        />
      </Row>
      {audio ? (
        <Row label={t("book.panel.duration")} labelId={id("duration")}>
          <DurationField book={book} save={save} labelId={id("duration")} />
        </Row>
      ) : (
        <Row label={t("book.panel.pages")} labelId={id("pages")}>
          <PagesField book={book} save={save} labelId={id("pages")} />
        </Row>
      )}
      {owned && (
        <Row label={t("book.panel.status")}>
          <Select
            label={t("book.panel.status")}
            hideLabel
            className="text-sm"
            value={status}
            onChange={(value) => void save({ status: value as BookStatus })}
            options={STATUSES.map((value) => ({
              value,
              label: domain.bookStatus(value, book.format),
            }))}
          />
        </Row>
      )}
      {showProgress && (
        <Row label={t("book.panel.progress")} labelId={id("progress")}>
          <Progress book={book} labelId={id("progress")} />
        </Row>
      )}
      {showRating && (
        <Row label={t("book.panel.rating")}>
          <StarRating
            compact
            value={book.rating}
            onChange={(rating) => void save({ rating: rating ?? null })}
          />
        </Row>
      )}
      {showDates && (
        <>
          <Row label={t("book.panel.started")}>
            <DateField
              label={t("book.panel.started")}
              value={book.startedAt}
              onChange={(startedAt) => void save({ startedAt })}
            />
          </Row>
          <Row label={t("book.panel.finished")}>
            <DateField
              label={t("book.panel.finished")}
              value={book.finishedAt}
              onChange={(finishedAt) => void save({ finishedAt })}
            />
          </Row>
        </>
      )}
    </dl>
  );
}
