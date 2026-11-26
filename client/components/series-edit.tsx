"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AutoTextarea } from "@/components/auto-textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Drawer } from "@/components/drawer";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import { EditIcon, TrashIcon } from "@/components/icons";
import { TagInput } from "@/components/tag-input";
import { useBooks } from "@/lib/books";
import type { AgeRating } from "@/lib/catalogue-constants";
import { tropeSuggestions } from "@/lib/genres";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { failureText } from "@/lib/i18n/server-errors";
import { isWholeIn } from "@/lib/numbers";
import { SERIES_STATUSES, useSeriesActions, type Series, type SeriesStatus } from "@/lib/series";

const TOTAL_MAX = 200;
const AGES: AgeRating[] = ["none", "12", "16", "18"];

function Segments<T extends string>({
  labelId,
  options,
  value,
  onChange,
  name,
}: {
  labelId: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  name: (value: T) => string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="flex flex-wrap gap-1 self-start rounded-card bg-page p-1"
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`inline-flex min-h-9 items-center rounded-pill px-3.5 text-sm font-medium ${
              selected ? "bg-navy text-page" : "text-ink hover:bg-beige"
            }`}
          >
            {name(option)}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  labelId,
  htmlFor,
  children,
}: {
  label: string;
  labelId?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 md:grid md:grid-cols-[136px_minmax(0,1fr)] md:items-start md:gap-6">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-soft md:pt-2.5">
          {label}
        </label>
      ) : (
        <span id={labelId} className="text-sm font-semibold text-ink-soft md:pt-2.5">
          {label}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}

function SeriesForm({
  series,
  onClose,
  sheet,
}: {
  series: Series;
  onClose: () => void;
  sheet: boolean;
}) {
  const t = useT();
  const domain = useDomain();
  const router = useRouter();
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;
  const { updateSeries, deleteSeries } = useSeriesActions();
  const { books } = useBooks();
  const [title, setTitle] = useState(series.title);
  const [author, setAuthor] = useState(series.author ?? "");
  const [status, setStatus] = useState<SeriesStatus>(series.status);
  const [total, setTotal] = useState(
    series.totalBooks === undefined ? "" : String(series.totalBooks),
  );
  const [age, setAge] = useState<AgeRating>(series.ageRating);
  const [genres, setGenres] = useState(series.genres);
  const [tropes, setTropes] = useState(series.tropes);
  const [annotation, setAnnotation] = useState(series.annotation ?? "");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState(false);

  const titleMissing = title.trim() === "";
  const totalWrong = total.trim() !== "" && !isWholeIn(total, 1, TOTAL_MAX);

  const suggestions = tropeSuggestions(books);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setChecked(true);
    if (titleMissing || totalWrong) return;
    setPending(true);
    setError(null);
    try {
      await updateSeries(series.id, {
        title: title.trim(),
        author: author.trim() === "" ? null : author.trim(),
        status,
        totalBooks: total.trim() === "" ? null : Number(total),
        ageRating: age,
        genres,
        tropes,
        annotation: annotation.trim() === "" ? null : annotation,
      });
      onClose();
    } catch (err) {
      setError(failureText(err, t, t("series.page.form.failed")));
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await deleteSeries(series.id);
      router.push("/library");
    } catch (err) {
      setAsking(false);
      setPending(false);
      setError(failureText(err, t, t("series.page.delete.failed")));
    }
  }

  const field = "field bg-input-strong";

  return (
    <form onSubmit={save} noValidate aria-labelledby={id("heading")} className="flex flex-col">
      <div className="flex items-center gap-2 bg-navy px-5 py-4 text-page md:px-8">
        <EditIcon size={16} />
        <h2 id={id("heading")} className="font-sans text-base font-semibold">
          {t("series.page.form.heading")}
        </h2>
      </div>

      <div className="flex flex-col gap-5 px-5 py-6 md:px-8">
        <Row label={t("series.page.form.title")} htmlFor={id("title")}>
          <input
            id={id("title")}
            autoFocus={!sheet}
            value={title}
            maxLength={200}
            aria-invalid={checked && titleMissing}
            onChange={(event) => setTitle(event.target.value)}
            className={`${field} font-serif text-2xl font-semibold ${checked && titleMissing ? "border-2 border-burgundy" : ""}`}
          />
          {checked && titleMissing && (
            <p role="alert" className="text-sm font-semibold text-burgundy">
              {t("series.page.form.titleRequired")}
            </p>
          )}
        </Row>
        <Row label={t("series.page.form.author")} htmlFor={id("author")}>
          <input
            id={id("author")}
            value={author}
            maxLength={200}
            onChange={(event) => setAuthor(event.target.value)}
            className={field}
          />
        </Row>
        <Row label={t("series.page.form.status")} labelId={id("status")}>
          <Segments
            labelId={id("status")}
            options={SERIES_STATUSES}
            value={status}
            onChange={setStatus}
            name={domain.seriesStatus}
          />
        </Row>
        <Row label={t("series.page.form.total")} htmlFor={id("total")}>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id={id("total")}
              inputMode="numeric"
              value={total}
              aria-invalid={checked && totalWrong}
              aria-describedby={id("total-hint")}
              onChange={(event) => setTotal(event.target.value)}
              className={`${field} w-24 ${checked && totalWrong ? "border-2 border-burgundy" : ""}`}
            />
            <span id={id("total-hint")} className="text-sm text-muted">
              {t("series.page.form.totalHint")}
            </span>
          </div>
          {checked && totalWrong && (
            <p role="alert" className="text-sm font-semibold text-burgundy">
              {t("series.page.form.totalInvalid")}
            </p>
          )}
        </Row>
        <Row label={t("series.page.form.age")} labelId={id("age")}>
          <Segments
            labelId={id("age")}
            options={AGES}
            value={age}
            onChange={setAge}
            name={(value) => (value === "none" ? t("series.page.form.ageNone") : `${value}+`)}
          />
        </Row>
        <div className="border-t border-mist" />
        <GenreMultiSelect value={genres} onChange={setGenres} />
        <TagInput
          label={t("series.page.form.tropes")}
          value={tropes}
          onChange={setTropes}
          suggestions={suggestions}
        />
        <div className="border-t border-mist" />
        <Row label={t("series.page.form.annotation")} htmlFor={id("annotation")}>
          <AutoTextarea
            id={id("annotation")}
            value={annotation}
            maxLength={5000}
            onChange={(event) => setAnnotation(event.target.value)}
            className={`${field} leading-relaxed`}
          />
        </Row>
        {error && (
          <p role="alert" className="font-semibold text-burgundy">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist bg-page/60 px-5 py-4 md:px-8">
        <button
          type="button"
          onClick={() => setAsking(true)}
          disabled={pending}
          className="btn-primary"
        >
          <TrashIcon size={18} />
          {t("series.page.delete.button")}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="btn-outline">
            {t("series.page.form.cancel")}
          </button>
          <button type="submit" disabled={pending} className="btn-outline bg-beige">
            {t("series.page.form.done")}
          </button>
        </div>
      </div>

      {asking && (
        <ConfirmDialog
          title={t("series.page.delete.title", { title: series.title })}
          text={t("series.page.delete.text")}
          cancelLabel={t("series.page.delete.cancel")}
          confirmLabel={t("series.page.delete.confirm")}
          pending={pending}
          onCancel={() => setAsking(false)}
          onConfirm={() => void remove()}
        />
      )}
    </form>
  );
}

export function SeriesEdit({
  series,
  onClose,
  sheet,
}: {
  series: Series;
  onClose: () => void;
  sheet: boolean;
}) {
  const t = useT();

  if (!sheet) {
    return (
      <div className="overflow-hidden rounded-card border-2 border-navy bg-card">
        <SeriesForm series={series} onClose={onClose} sheet={sheet} />
      </div>
    );
  }

  return (
    <Drawer label={t("series.page.form.heading")} header={null} onClose={onClose} tall>
      <div className="-mx-5 -my-4">
        <SeriesForm series={series} onClose={onClose} sheet={sheet} />
      </div>
    </Drawer>
  );
}
