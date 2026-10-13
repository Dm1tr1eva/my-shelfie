"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GenreChip, OwnershipChip, SeriesStatusChip, TropeChip } from "@/components/chips";
import { OwnProgress } from "@/components/own-progress";
import { PlusIcon } from "@/components/icons";
import { Select } from "@/components/select";
import { Shelf } from "@/components/shelf";
import { ApiError } from "@/lib/api";
import type { Book } from "@/lib/books";
import { gapNumbersOf, highestNumberOf, isOwned, ownedNumbersOf } from "@/lib/catalogue";
import {
  SERIES_STATUS_OPTIONS,
  useSeries,
  useSeriesActions,
  type Series,
  type SeriesStatus,
} from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function SeriesBody({ series, books }: { series: Series; books: Book[] }) {
  const router = useRouter();
  const { updateSeries, deleteSeries } = useSeriesActions();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(series.title);
  const [author, setAuthor] = useState(series.author ?? "");
  const [note, setNote] = useState(series.note ?? "");
  const [status, setStatus] = useState<SeriesStatus>(series.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ownedNumbers = ownedNumbersOf(books);
  const ownedCount = books.filter(isOwned).length;
  const total = Math.max(highestNumberOf(books), books.length);
  const gaps = gapNumbersOf(books);
  const recorded = new Set(books.map((book) => book.seriesNumber));
  const missing = Array.from({ length: total }, (_, index) => index + 1).filter(
    (number) => !ownedNumbers.includes(number),
  );
  const nextNumber = Math.floor(highestNumberOf(books)) + 1;
  const numbered = books.filter((book) => book.seriesNumber !== undefined);
  const unnumbered = books.filter((book) => book.seriesNumber === undefined);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateSeries(series.id, {
        title: title.trim(),
        author: author.trim() === "" ? null : author.trim(),
        note: note.trim() === "" ? null : note.trim(),
        status,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the series "${series.title}"? Its books stay on your shelf.`))
      return;
    setPending(true);
    try {
      await deleteSeries(series.id);
      router.push("/library");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p>
          <SeriesStatusChip status={series.status} />
        </p>
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">{series.title}</h1>
        {(series.author || series.note) && (
          <p className="text-muted">
            {series.author}
            {series.author && series.note ? " · " : ""}
            {series.note && <em>{series.note}</em>}
          </p>
        )}
      </header>

      <section
        aria-labelledby="copies-heading"
        className="flex flex-col gap-4 rounded-card bg-navy p-6 text-page md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-col gap-3 md:flex-1">
          <h2
            id="copies-heading"
            className="font-sans text-sm font-semibold uppercase tracking-wide text-mist"
          >
            Your copies
          </h2>
          <p className="font-serif text-4xl font-semibold">
            {ownedCount} <span className="text-xl text-mist">of {total}</span>
          </p>
          <OwnProgress ownedNumbers={ownedNumbers} ownedCount={ownedCount} total={total} onDark />
          {missing.length > 0 && (
            <p className="text-sm text-mist">
              Missing:{" "}
              {missing
                .map((number) => `#${number}${gaps.includes(number) ? " (a gap)" : ""}`)
                .join(" and ")}
            </p>
          )}
        </div>
        <Link href={`/add?series=${series.id}&number=${nextNumber}`} className="btn-beige">
          <PlusIcon size={18} />
          Add the next book
        </Link>
      </section>

      <section aria-label="Books in this series" className="flex flex-col gap-4">
        <Shelf>
          {numbered
            .sort((a, b) => (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0))
            .map((book) => {
              const wanted = !isOwned(book);
              const isGap = wanted && gaps.includes(book.seriesNumber ?? -1);
              return (
                <li key={book.id}>
                  <Link href={`/books/${book.id}`} className="flex flex-col gap-2">
                    <span className={wanted ? "opacity-55 saturate-[.7]" : ""}>
                      <BookCover
                        url={book.coverUrl}
                        title={book.title}
                        number={book.seriesNumber}
                      />
                    </span>
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug">
                      {book.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <OwnershipChip ownership={book.ownership} />
                      {isGap && <span className="font-semibold text-burgundy">gap</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          {Array.from({ length: Math.floor(total) }, (_, index) => index + 1)
            .filter((number) => !recorded.has(number))
            .map((number) => (
              <li key={`missing-${number}`}>
                <Link
                  href={`/add?series=${series.id}&number=${number}`}
                  className="flex flex-col gap-2"
                >
                  <span className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-cover border-2 border-dashed border-burgundy bg-burgundy/[0.06] px-2 text-center">
                    <span className="text-lg font-bold text-burgundy">#{number}</span>
                    <span className="text-xs font-semibold text-burgundy">
                      Missing from the series
                    </span>
                  </span>
                  <span className="text-[15px] font-semibold">Not in library</span>
                </Link>
              </li>
            ))}
        </Shelf>

        {unnumbered.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {unnumbered.map((book) => (
              <li key={book.id}>
                <Link href={`/books/${book.id}`} className="link">
                  {book.title}
                </Link>{" "}
                <span className="text-muted">(no number)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="genres-heading" className="card flex flex-col gap-3 p-5">
          <h2 id="genres-heading" className="text-xl font-semibold">
            Genres in this series
          </h2>
          <ul className="flex flex-wrap gap-2">
            {countBy(books.flatMap((book) => book.genres)).map(([genre, count]) => (
              <li key={genre} className="flex items-center gap-1">
                <GenreChip genre={genre} />
                <span className="text-sm text-muted">{count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tropes-heading" className="card flex flex-col gap-3 p-5">
          <h2 id="tropes-heading" className="text-xl font-semibold">
            Tropes
          </h2>
          <ul className="flex flex-wrap gap-2">
            {countBy(books.flatMap((book) => book.tropes)).map(([trope, count]) => (
              <li key={trope} className="flex items-center gap-1">
                <TropeChip trope={trope} />
                <span className="text-sm text-muted">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="btn-outline self-start">
            Edit series
          </button>
        ) : (
          <form onSubmit={save} aria-label="Edit series" className="card flex flex-col gap-3 p-5">
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Author</span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} className="field" />
            </label>
            <Select
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as SeriesStatus)}
              options={SERIES_STATUS_OPTIONS}
            />
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Note</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Book 4 delayed to 2027"
                className="field"
              />
            </label>
            {error && (
              <p role="alert" className="font-semibold text-burgundy">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-outline">
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="btn-outline ml-auto border-burgundy text-burgundy"
              >
                Delete series
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function SeriesPage({ id }: { id: string }) {
  const { user, status } = useRequireAuth();
  const { series, books, error, isLoading } = useSeries(id);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/library" className="link">
          Library
        </Link>
      </nav>

      {isLoading && (
        <p role="status" aria-busy="true">
          Loading...
        </p>
      )}
      {notFound && <p>Series not found.</p>}
      {error && !notFound && (
        <p role="alert" className="text-burgundy">
          Could not load this series.
        </p>
      )}
      {series && (
        <SeriesBody key={`${series.id}-${series.updatedAt}`} series={series} books={books} />
      )}
    </main>
  );
}
