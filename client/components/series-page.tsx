"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GenreChip, TropeChip } from "@/components/chips";
import { ErrorState, NotFound } from "@/components/error-state";
import { OwnProgress } from "@/components/own-progress";
import { PlusIcon } from "@/components/icons";
import { SeriesStatePills } from "@/components/form-controls";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import { Shelf } from "@/components/shelf";
import { ShelfSkeleton } from "@/components/skeleton";
import { TagInput } from "@/components/tag-input";
import { ApiError } from "@/lib/api";
import { useBooks, type Book, type Genre } from "@/lib/books";
import { gapNumbersOf, highestNumberOf, isOwned, ownedNumbersOf } from "@/lib/catalogue";
import {
  SERIES_STATUS_LABELS,
  useSeries,
  useSeriesActions,
  type Series,
  type SeriesStatus,
} from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";

function SeriesBody({ series, books }: { series: Series; books: Book[] }) {
  const router = useRouter();
  const { updateSeries, deleteSeries } = useSeriesActions();
  const [editing, setEditing] = useState(false);
  const [firstField, setFirstField] = useState<"title" | "note">("title");
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(series.title);
  const [author, setAuthor] = useState(series.author ?? "");
  const [note, setNote] = useState(series.note ?? "");
  const [status, setStatus] = useState<SeriesStatus>(series.status);
  const [totalText, setTotalText] = useState(series.totalBooks ? String(series.totalBooks) : "");
  const [genres, setGenres] = useState<Genre[]>(series.genres);
  const [tropes, setTropes] = useState<string[]>(series.tropes);
  const [annotation, setAnnotation] = useState(series.annotation ?? "");
  const { books: allBooks } = useBooks();
  const tropeCounts = new Map<string, number>();
  for (const item of allBooks) {
    for (const trope of item.tropes) tropeCounts.set(trope, (tropeCounts.get(trope) ?? 0) + 1);
  }
  const suggestions = [...tropeCounts].map(([name, count]) => ({ name, count }));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ownedNumbers = ownedNumbersOf(books);
  const ownedCount = books.filter(isOwned).length;
  const total = Math.max(series.totalBooks ?? 0, highestNumberOf(books), books.length);
  const gaps = gapNumbersOf(books);
  const recorded = new Set(books.map((book) => book.seriesNumber));
  const missing = Array.from({ length: total }, (_, index) => index + 1).filter(
    (number) => !ownedNumbers.includes(number),
  );
  const nextNumber = Math.floor(highestNumberOf(books)) + 1;
  const numbered = books.filter((book) => book.seriesNumber !== undefined);
  const unnumbered = books.filter((book) => book.seriesNumber === undefined);

  useEffect(() => {
    if (!editing) return;
    formRef.current?.scrollIntoView({ block: "start" });
    (firstField === "note" ? noteRef : titleRef).current?.focus({ preventScroll: true });
  }, [editing, firstField]);

  function openEditing(field: "title" | "note") {
    setFirstField(field);
    setEditing(true);
  }

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
        totalBooks: totalText.trim() === "" ? null : Number(totalText),
        genres,
        tropes,
        annotation: annotation.trim() === "" ? null : annotation,
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
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          {SERIES_STATUS_LABELS[series.status]} series
        </p>
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">{series.title}</h1>
        {(series.author || series.note) && (
          <p className="text-muted">
            {series.author}
            {series.author && series.note ? " · " : ""}
            {series.note && <em>{series.note}</em>}
          </p>
        )}
        <button
          type="button"
          onClick={() => openEditing("note")}
          className="min-h-11 self-start text-navy underline underline-offset-2"
        >
          {series.note ? "Edit note" : "Add a note"}
        </button>
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
                        format={book.format}
                      />
                    </span>
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug">
                      {book.title}
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      {wanted ? (isGap ? "Wishlist · gap" : "Wishlist") : "In my library"}
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

      <section aria-labelledby="about-heading" className="card flex flex-col gap-4 p-5">
        <h2 id="about-heading" className="text-xl font-semibold">
          About this series
        </h2>
        {series.annotation ? (
          <p className="max-w-3xl whitespace-pre-line">{series.annotation}</p>
        ) : (
          <p className="text-muted">No description yet. Add one with Edit series.</p>
        )}
        <ul aria-label="Genres and tropes" className="flex flex-wrap gap-2">
          {series.genres.map((genre) => (
            <li key={genre}>
              <GenreChip genre={genre} />
            </li>
          ))}
          {series.tropes.map((trope) => (
            <li key={trope}>
              <TropeChip trope={trope} />
            </li>
          ))}
          {series.genres.length + series.tropes.length === 0 && (
            <li className="text-sm text-muted">No genres or tropes yet.</li>
          )}
        </ul>
        <p className="text-sm text-muted">These are shared by every book of the series.</p>
      </section>

      <section className="flex flex-col gap-3">
        {!editing ? (
          <button
            type="button"
            onClick={() => openEditing("title")}
            className="btn-outline self-start"
          >
            Edit series
          </button>
        ) : (
          <form
            ref={formRef}
            onSubmit={save}
            aria-label="Edit series"
            className="card flex scroll-mt-20 flex-col gap-3 p-5"
          >
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Title</span>
              <input
                ref={titleRef}
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
            <SeriesStatePills value={status} onChange={setStatus} />
            <GenreMultiSelect value={genres} onChange={setGenres} />
            <TagInput
              label="Tropes"
              value={tropes}
              onChange={setTropes}
              suggestions={suggestions}
            />
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Description</span>
              <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                rows={5}
                placeholder="What the series is about, in your words"
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Books in the series</span>
              <input
                type="number"
                min={1}
                max={200}
                inputMode="numeric"
                placeholder="Optional"
                value={totalText}
                onChange={(e) => setTotalText(e.target.value)}
                className="field sm:w-40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Note</span>
              <textarea
                ref={noteRef}
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
  const { series, books, error, isLoading, reload } = useSeries(id);

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

      {isLoading && <ShelfSkeleton label="Loading the series…" />}
      {notFound && (
        <NotFound title="Series not found" backHref="/library" backLabel="Back to the library" />
      )}
      {error && !notFound && (
        <ErrorState
          title="Could not load this series"
          text="Check your connection and try again."
          onRetry={reload}
        />
      )}
      {series && (
        <SeriesBody key={`${series.id}-${series.updatedAt}`} series={series} books={books} />
      )}
    </main>
  );
}
