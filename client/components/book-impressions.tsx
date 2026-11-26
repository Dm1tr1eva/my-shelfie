"use client";

import { useCallback, useId, useRef, useState } from "react";
import { AutoTextarea } from "@/components/auto-textarea";
import { ADD_PILL } from "@/components/book-links";
import { PlusIcon, XIcon } from "@/components/icons";
import type { Book, Quote } from "@/lib/books";
import {
  BOOK_LENGTH_MAX,
  MOOD_NAME_MAX,
  MOODS_MAX,
  PRESET_MOODS,
  QUOTES_MAX,
  RECOMMEND_VALUES,
} from "@/lib/catalogue-constants";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { isWholeIn } from "@/lib/numbers";
import { useDraft, type SaveBook } from "@/lib/use-book-autosave";

const LABEL = "text-xs font-semibold uppercase tracking-[0.06em] text-muted";

function pill(selected: boolean) {
  return `inline-flex min-h-9 items-center rounded-pill border px-3 text-sm font-medium ${
    selected ? "border-navy bg-navy text-page" : "border-mist bg-card text-ink hover:bg-beige"
  }`;
}

function Moods({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const domain = useDomain();
  const inputId = useId();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [taken, setTaken] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);

  const own = book.moods.filter((mood) => !PRESET_MOODS.includes(mood));
  const full = book.moods.length >= MOODS_MAX;

  function flip(mood: string) {
    void save({
      moods: book.moods.includes(mood)
        ? book.moods.filter((item) => item !== mood)
        : [...book.moods, mood],
    });
  }

  function closeForm() {
    setAdding(false);
    setText("");
    setTaken(false);
    window.setTimeout(() => addButton.current?.focus());
  }

  function addOwn() {
    const name = text.trim();
    if (name === "") return;
    const lower = name.toLowerCase();
    const preset = PRESET_MOODS.find(
      (mood) => mood.toLowerCase() === lower || domain.mood(mood).toLowerCase() === lower,
    );
    const existing = book.moods.find((mood) => mood.toLowerCase() === lower);
    if (existing || (preset && book.moods.includes(preset))) {
      setTaken(true);
      return;
    }
    void save({ moods: [...book.moods, preset ?? name] });
    closeForm();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={LABEL}>{t("book.panel.impressions.moods")}</p>
      <div className="flex flex-wrap gap-2">
        {[...PRESET_MOODS, ...own].map((mood) => {
          const selected = book.moods.includes(mood);
          return (
            <button
              key={mood}
              type="button"
              aria-pressed={selected}
              disabled={!selected && full}
              onClick={() => flip(mood)}
              className={`${pill(selected)} disabled:opacity-50`}
            >
              {domain.mood(mood)}
            </button>
          );
        })}
        {!adding && !full && (
          <button
            ref={addButton}
            type="button"
            onClick={() => setAdding(true)}
            className={ADD_PILL}
          >
            <PlusIcon size={14} />
            {t("book.panel.impressions.ownMood")}
          </button>
        )}
      </div>
      {adding && (
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="sr-only">
            {t("book.panel.impressions.ownMoodLabel")}
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              autoFocus
              maxLength={MOOD_NAME_MAX}
              value={text}
              placeholder={t("book.panel.impressions.ownMoodLabel")}
              onChange={(event) => {
                setText(event.target.value);
                setTaken(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOwn();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  closeForm();
                }
              }}
              className="field min-h-10 min-w-0 flex-1"
            />
            <button type="button" onClick={addOwn} className="btn-outline shrink-0">
              {t("book.panel.impressions.addMood")}
            </button>
          </div>
          {taken && (
            <p role="alert" className="text-sm font-semibold text-burgundy">
              {t("book.panel.impressions.moodTaken")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Recommend({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const domain = useDomain();
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className={LABEL}>
        {t("book.panel.impressions.recommend")}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {RECOMMEND_VALUES.map((value) => {
          const selected = book.recommend === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => void save({ recommend: selected ? null : value })}
              className={pill(selected)}
            >
              {domain.recommend(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuoteForm({
  quotes,
  save,
  onClose,
}: {
  quotes: Quote[];
  save: SaveBook;
  onClose: () => void;
}) {
  const t = useT();
  const textId = useId();
  const pageId = useId();
  const [page, setPage] = useState("");

  const pageNumber = page.trim() === "" ? undefined : Number(page);
  const pageValid = pageNumber === undefined || isWholeIn(page, 1, BOOK_LENGTH_MAX);

  const commit = useCallback(
    async (text: string) => {
      if (text.trim() === "" || !pageValid) return text.trim() === "";
      const quote: Quote = pageNumber === undefined ? { text } : { text, page: pageNumber };
      const ok = await save({ quotes: [...quotes, quote] }, { optimistic: false });
      if (ok) onClose();
      return ok;
    },
    [onClose, pageNumber, pageValid, quotes, save],
  );
  const draft = useDraft("quote", "", commit);

  function cancel() {
    draft.discard();
    onClose();
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
      className="flex flex-col gap-3 rounded-card border border-slate p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={textId} className="text-sm font-semibold">
          {t("book.panel.impressions.quoteText")}
        </label>
        <AutoTextarea
          id={textId}
          autoFocus
          maxLength={2000}
          value={draft.value}
          onChange={(event) => draft.setValue(event.target.value)}
          className="field bg-input-strong font-serif italic"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={pageId} className="text-sm font-semibold">
          {t("book.panel.impressions.quotePage")}
        </label>
        <input
          id={pageId}
          type="number"
          inputMode="numeric"
          min={1}
          max={BOOK_LENGTH_MAX}
          value={page}
          aria-invalid={!pageValid}
          onChange={(event) => setPage(event.target.value)}
          className={`field w-28 bg-input-strong ${pageValid ? "" : "border-2 border-burgundy"}`}
        />
        {!pageValid && (
          <p role="alert" className="text-sm font-semibold text-burgundy">
            {t("book.panel.pagesInvalid")}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={cancel} className="btn-outline">
          {t("book.panel.links.cancel")}
        </button>
        <button
          type="button"
          onClick={() => void draft.flush()}
          disabled={draft.value.trim() === "" || !pageValid}
          className="btn-primary bg-navy"
        >
          {t("book.panel.impressions.saveQuote")}
        </button>
      </div>
    </div>
  );
}

function Quotes({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);

  const closeForm = useCallback(() => {
    setAdding(false);
    window.setTimeout(() => addButton.current?.focus());
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className={LABEL}>{t("book.panel.impressions.quotes")}</p>
      {book.quotes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {book.quotes.map((quote, index) => (
            <li
              key={`${index}-${quote.text}`}
              className="flex items-start gap-2 rounded-r-control border-l-[3px] border-burgundy bg-page py-3 pl-4 pr-1"
            >
              <figure className="min-w-0 flex-1">
                <blockquote className="whitespace-pre-line font-serif text-[15px] font-semibold italic leading-snug">
                  {quote.text}
                </blockquote>
                {quote.page !== undefined && (
                  <figcaption className="mt-1 text-xs text-muted">
                    {t("book.panel.impressions.page", { page: quote.page })}
                  </figcaption>
                )}
              </figure>
              <button
                type="button"
                aria-label={t("book.panel.impressions.removeQuote")}
                onClick={() =>
                  void save({ quotes: book.quotes.filter((_, position) => position !== index) })
                }
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-beige"
              >
                <XIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <QuoteForm quotes={book.quotes} save={save} onClose={closeForm} />
      ) : (
        book.quotes.length < QUOTES_MAX && (
          <button
            ref={addButton}
            type="button"
            onClick={() => setAdding(true)}
            className={ADD_PILL}
          >
            <PlusIcon size={14} />
            {t("book.panel.impressions.addQuote")}
          </button>
        )
      )}
    </div>
  );
}

function Note({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const noteId = useId();
  const commit = useCallback(
    (text: string) => save({ notes: text.trim() === "" ? null : text }, { optimistic: false }),
    [save],
  );
  const draft = useDraft("notes", book.notes ?? "", commit);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={noteId} className={LABEL}>
        {t("book.panel.impressions.note")}
      </label>
      <AutoTextarea
        id={noteId}
        maxLength={5000}
        value={draft.value}
        placeholder={t("book.panel.impressions.notePlaceholder")}
        onChange={(event) => draft.setValue(event.target.value)}
        onFocus={() => draft.setEditing(true)}
        onBlur={() => {
          draft.setEditing(false);
          void draft.flush();
        }}
        className="rounded-r-control border-0 border-l-[3px] border-burgundy bg-note px-3 py-2.5 text-sm text-ink placeholder:text-muted"
      />
    </div>
  );
}

export function BookImpressions({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();

  return (
    <section aria-labelledby="book-impressions-heading" className="flex flex-col gap-5">
      <h2 id="book-impressions-heading" className="text-xl font-semibold">
        {t("book.panel.impressions.heading")}
      </h2>
      <Moods book={book} save={save} />
      <Recommend book={book} save={save} />
      <Quotes book={book} save={save} />
      <Note book={book} save={save} />
    </section>
  );
}
