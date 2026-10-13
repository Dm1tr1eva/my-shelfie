"use client";

import { useEffect, useId, useImperativeHandle, useState } from "react";
import { SeriesStatusChip } from "@/components/chips";
import { CheckIcon } from "@/components/icons";
import { SeriesStatePills } from "@/components/form-controls";
import { gapNumbersOf, highestNumberOf, isOwned } from "@/lib/catalogue";
import type { Book } from "@/lib/books";
import { type NewSeries, type Series, type SeriesStatus } from "@/lib/series";

export type SeriesChoice = { seriesId?: string; seriesNumber?: number };

export type SeriesSuggestion = { title: string; author?: string };

export type SeriesPickerHandle = { createPending: () => Promise<Series | undefined> };

export function SeriesPicker({
  series,
  books,
  currentBookId,
  value,
  onChange,
  onCreate,
  suggestion,
  onPendingChange,
  ref,
}: {
  series: Series[];
  books: Book[];
  currentBookId?: string;
  value: SeriesChoice;
  onChange: (value: SeriesChoice) => void;
  onCreate: (input: NewSeries) => Promise<Series>;
  suggestion?: SeriesSuggestion;
  onPendingChange?: (pending: boolean) => void;
  ref?: React.Ref<SeriesPickerHandle>;
}) {
  const inputId = useId();
  const listId = useId();
  const selected = series.find((item) => item.id === value.seriesId);
  const [query, setQuery] = useState(selected?.title ?? suggestion?.title ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAuthor, setNewAuthor] = useState(suggestion?.author ?? "");
  const [dismissed, setDismissed] = useState(false);
  const [newStatus, setNewStatus] = useState<SeriesStatus>("unknown");
  const [newTotal, setNewTotal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [markedStandalone, setMarkedStandalone] = useState(false);

  const typed = query.trim();
  const matches = series.filter(
    (item) => typed === "" || item.title.toLowerCase().includes(typed.toLowerCase()),
  );
  const exact = series.some((item) => item.title.toLowerCase() === typed.toLowerCase());
  const canCreate = typed !== "" && !exact;
  const suggested =
    suggestion !== undefined &&
    value.seriesId === undefined &&
    !markedStandalone &&
    typed.toLowerCase() === suggestion.title.trim().toLowerCase();
  const showCreate = creating || (suggested && canCreate && !dismissed);
  const existingSuggested = suggested
    ? series.find((item) => item.title.toLowerCase() === typed.toLowerCase())
    : undefined;

  const seriesBooks = (id: string) =>
    books.filter((book) => book.seriesId === id && book.id !== currentBookId);

  function countsOf(item: Series) {
    const linked = seriesBooks(item.id);
    return {
      owned: linked.filter(isOwned).length,
      total: Math.max(item.totalBooks ?? 0, highestNumberOf(linked), linked.length),
    };
  }

  function choose(item: Series) {
    setQuery(item.title);
    setOpen(false);
    setMarkedStandalone(false);
    onChange({ seriesId: item.id, seriesNumber: value.seriesNumber });
  }

  const totalInvalid =
    newTotal.trim() !== "" &&
    !(Number.isInteger(Number(newTotal)) && Number(newTotal) >= 1 && Number(newTotal) <= 200);
  const pending = showCreate && typed !== "";

  async function submitNewSeries() {
    if (totalInvalid) {
      setError("Books in the series must be a whole number from 1 to 200.");
      throw new Error("invalid series size");
    }

    setError(null);
    try {
      const created = await onCreate({
        title: typed,
        author: newAuthor.trim() || undefined,
        status: newStatus,
        ...(newTotal.trim() !== "" && { totalBooks: Number(newTotal) }),
      });
      setCreating(false);
      setMarkedStandalone(false);
      setQuery(created.title);
      onChange({ seriesId: created.id, seriesNumber: value.seriesNumber });
      return created;
    } catch (err) {
      setError((current) => current ?? "Could not create the series. Try again.");
      throw err;
    }
  }

  async function createSeries() {
    try {
      await submitNewSeries();
    } catch {
      return;
    }
  }

  useImperativeHandle(ref, () => ({
    createPending: async () => (pending ? submitNewSeries() : undefined),
  }));

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  function markStandalone() {
    setQuery("");
    setCreating(false);
    setMarkedStandalone(true);
    onChange({});
  }

  const gapFilled =
    value.seriesId !== undefined &&
    value.seriesNumber !== undefined &&
    gapNumbersOf(seriesBooks(value.seriesId)).includes(value.seriesNumber);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="relative flex flex-col gap-1">
          <label htmlFor={inputId} className="font-semibold">
            Series
          </label>
          <input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            placeholder="Find or create a series"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setMarkedStandalone(false);
              if (value.seriesId) onChange({ seriesNumber: value.seriesNumber });
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className="field"
          />

          {open && (matches.length > 0 || canCreate) && (
            <ul
              id={listId}
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-card border border-mist bg-card shadow-pop"
            >
              {matches.map((item) => {
                const counts = countsOf(item);
                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={item.id === value.seriesId}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(item);
                    }}
                    className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-beige"
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold">{item.title}</span>
                      {item.author && <span className="text-sm text-muted">{item.author}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      Own {counts.owned} of {counts.total}
                      <SeriesStatusChip status={item.status} />
                    </span>
                  </li>
                );
              })}
              {canCreate && (
                <li
                  role="option"
                  aria-selected={false}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setCreating(true);
                    setOpen(false);
                  }}
                  className="flex min-h-11 cursor-pointer items-center px-3 font-semibold text-navy hover:bg-beige"
                >
                  New series “{typed}”
                </li>
              )}
            </ul>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-semibold">No.</span>
          <input
            type="number"
            min={1}
            step="any"
            inputMode="decimal"
            value={value.seriesNumber ?? ""}
            onChange={(event) =>
              onChange({
                seriesId: value.seriesId,
                seriesNumber: event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
            className="field"
          />
        </label>
      </div>

      {showCreate && (
        <div className="card flex flex-col gap-3 p-4">
          <p className="font-semibold">New series “{typed}”</p>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Author</span>
            <input
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              className="field"
            />
          </label>
          <SeriesStatePills value={newStatus} onChange={setNewStatus} />
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Books in the series</span>
            <input
              type="number"
              min={1}
              max={200}
              inputMode="numeric"
              placeholder="Optional"
              value={newTotal}
              onChange={(e) => setNewTotal(e.target.value)}
              className="field sm:w-40"
            />
            <span className="text-sm text-muted">
              How many books the series has, or has announced. You can change it later.
            </span>
          </label>
          {error && (
            <p role="alert" className="font-semibold text-burgundy">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={createSeries} className="btn-primary">
              Create series
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setDismissed(true);
              }}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {existingSuggested && (
        <button
          type="button"
          onClick={() => choose(existingSuggested)}
          className="self-start font-semibold text-navy underline"
        >
          Use the existing series “{existingSuggested.title}”
        </button>
      )}

      {gapFilled && value.seriesNumber !== undefined && (
        <p className="text-sm font-semibold text-burgundy">
          This fills the gap at #{value.seriesNumber}.
        </p>
      )}

      {markedStandalone ? (
        <p role="status" className="flex items-center gap-2 font-semibold text-navy">
          <CheckIcon size={16} />
          Standalone book. It is not part of a series.
        </p>
      ) : (
        <button type="button" onClick={markStandalone} className="self-start text-navy underline">
          Mark as standalone
        </button>
      )}
    </div>
  );
}
