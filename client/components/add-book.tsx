"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { CheckIcon, SearchIcon, XIcon } from "@/components/icons";
import { ApiError, apiFetch } from "@/lib/api";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH, type BookSearchResult } from "@/lib/book-search";
import { useBookActions, useBooks, type Book, type Ownership } from "@/lib/books";
import { useSeriesList } from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";

type Phase = "idle" | "loading" | "done" | "failed";
type Added = { id: string; title: string; ownership: Ownership };
type SearchPage = { results: BookSearchResult[]; nextStartIndex?: number };

function Stepper() {
  return (
    <ol className="flex items-center gap-4 text-sm font-semibold">
      <li className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-page">
          1
        </span>
        Find it
      </li>
      <li aria-hidden="true" className="h-px w-8 bg-field" />
      <li className="flex items-center gap-2 text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-field">
          2
        </span>
        Details <span className="font-normal">(optional)</span>
      </li>
    </ol>
  );
}

function ResultRow({
  result,
  existing,
  onAdd,
  onMove,
  onOpenSheet,
  busy,
}: {
  result: BookSearchResult;
  existing?: Book;
  onAdd: (result: BookSearchResult, ownership: Ownership) => void;
  onMove: (book: Book) => void;
  onOpenSheet: (result: BookSearchResult) => void;
  busy: boolean;
}) {
  const meta = [result.authors.join(", "), result.year].filter(Boolean).join(" · ");

  return (
    <li className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <BookCover url={result.coverUrl} title={result.title} size="md" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold">{result.title}</span>
          <span className="text-sm text-muted">{meta}</span>
          {result.link && (
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm text-navy underline underline-offset-2"
            >
              View on Google Books
            </a>
          )}
          {existing && (
            <span className="text-sm font-semibold text-burgundy">
              {existing.ownership === "wanted"
                ? "Already on your wishlist"
                : "Already in your library"}
            </span>
          )}
        </div>
      </div>

      {existing ? (
        existing.ownership === "wanted" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove(existing)}
            className="btn-primary"
          >
            Move to library
          </button>
        )
      ) : (
        <>
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdd(result, "wanted")}
              className="btn-outline"
            >
              Add to wishlist
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdd(result, "owned")}
              className="btn-primary"
            >
              Add to library
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenSheet(result)}
            className="btn-primary md:hidden"
          >
            Add this book
          </button>
        </>
      )}
    </li>
  );
}

export function AddBook() {
  const { user, status } = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const seriesId = params.get("series") ?? undefined;
  const numberParam = params.get("number");
  const seriesNumber = numberParam ? Number(numberParam) : undefined;

  const { books } = useBooks();
  const { series } = useSeriesList();
  const { createBook, updateBook } = useBookActions();

  const targetSeries = series.find((item) => item.id === seriesId);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searchedText, setSearchedText] = useState("");
  const [nextStart, setNextStart] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const activeSearch = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequested = useRef("");
  const [sheetFor, setSheetFor] = useState<BookSearchResult | null>(null);
  const [added, setAdded] = useState<Added | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualOwnership, setManualOwnership] = useState<Ownership>("owned");

  const runSearch = useCallback(async (text: string) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const id = (activeSearch.current += 1);
    lastRequested.current = text;
    setPhase("loading");
    setError(null);
    setNextStart(null);
    setMoreFailed(false);

    try {
      const body = await apiFetch<SearchPage>(`/api/books/search?q=${encodeURIComponent(text)}`, {
        signal: request.signal,
      });
      if (id !== activeSearch.current) return;
      setResults(body.results);
      setSearchedText(text);
      setNextStart(body.nextStartIndex ?? null);
      setPhase("done");
    } catch {
      if (id !== activeSearch.current) return;
      setResults([]);
      setNextStart(null);
      setPhase("failed");
    }
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
    },
    [],
  );

  if (status !== "authenticated" || !user) {
    return null;
  }

  function changeQuery(text: string) {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    activeSearch.current += 1;
    controller.current?.abort();
    setNextStart(null);
    setMoreFailed(false);
    setLoadingMore(false);

    const trimmed = text.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      lastRequested.current = "";
      setPhase("idle");
      setResults([]);
      return;
    }

    timer.current = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = (query || targetSeries?.title || "").trim();
    if (text.length < SEARCH_MIN_LENGTH) return;

    if (timer.current) clearTimeout(timer.current);
    runSearch(text);
  }

  function retry() {
    if (lastRequested.current) runSearch(lastRequested.current);
  }

  async function loadMore() {
    if (nextStart === null) return;

    const id = activeSearch.current;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const body = await apiFetch<SearchPage>(
        `/api/books/search?q=${encodeURIComponent(searchedText)}&startIndex=${nextStart}`,
      );
      if (id !== activeSearch.current) return;
      setResults((current) => {
        const seen = new Set(current.map((result) => result.volumeId));
        return [...current, ...body.results.filter((result) => !seen.has(result.volumeId))];
      });
      setNextStart(body.nextStartIndex ?? null);
    } catch {
      if (id === activeSearch.current) setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  function detailsHrefFor(id: string) {
    const query = seriesId
      ? `?series=${seriesId}${seriesNumber !== undefined ? `&number=${seriesNumber}` : ""}`
      : "";
    return `/add/${id}/details${query}`;
  }

  async function create(input: {
    title: string;
    author: string;
    ownership: Ownership;
    coverUrl?: string;
    googleVolumeId?: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      const created = await createBook({
        ...input,
        ...(seriesId && { seriesId }),
        ...(seriesId && seriesNumber !== undefined && { seriesNumber }),
      });
      setSheetFor(null);
      setManual(false);
      setManualTitle("");
      setManualAuthor("");
      router.push(detailsHrefFor(created.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function addResult(result: BookSearchResult, ownership: Ownership) {
    return create({
      title: result.title,
      author: result.authors.join(", ") || "Unknown author",
      ownership,
      coverUrl: result.coverUrl,
      googleVolumeId: result.volumeId,
    });
  }

  async function move(book: Book) {
    setBusy(true);
    try {
      await updateBook(book.id, { ownership: "owned" });
      setAdded({ id: book.id, title: book.title, ownership: "owned" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">Add a book</h1>
      <Stepper />

      {targetSeries && (
        <p className="card px-4 py-3 text-sm">
          Adding to <strong>{targetSeries.title}</strong>
          {seriesNumber !== undefined && <> as book #{seriesNumber}</>}.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Search Google Books</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            value={query}
            placeholder={targetSeries ? `${targetSeries.title} …` : "Search Google Books"}
            onChange={(event) => changeQuery(event.target.value)}
            className="field pl-10"
          />
        </label>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>
      <p className="-mt-3 text-sm text-muted">Search by title, author or ISBN.</p>

      {added && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-navy px-5 py-3 text-page"
        >
          <CheckIcon size={20} />
          <span className="flex-1 font-semibold">{added.title} moved to your library.</span>
          <Link href={detailsHrefFor(added.id)} className="btn-beige">
            Add series &amp; tags
          </Link>
          <button
            type="button"
            onClick={() => setAdded(null)}
            className="inline-flex min-h-11 items-center rounded-control border border-mist px-4 font-semibold"
          >
            Done
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-semibold text-burgundy">
          {error}
        </p>
      )}

      {phase === "loading" && (
        <p role="status" aria-busy="true">
          Searching...
        </p>
      )}

      {phase === "failed" && (
        <div role="alert" className="card flex flex-col gap-3 border-2 border-burgundy p-5">
          <p className="font-serif text-xl font-semibold">Google Books isn&apos;t answering</p>
          <p className="text-muted">You can try again, or add the book without search.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={retry} className="btn-primary">
              Try again
            </button>
            <button type="button" onClick={() => setManual(true)} className="btn-outline">
              Add it without search
            </button>
          </div>
        </div>
      )}

      {(phase === "done" || (phase === "loading" && results.length > 0)) && (
        <section
          aria-label="Search results"
          aria-busy={phase === "loading" || query.trim() !== searchedText}
          className={`flex flex-col gap-3 ${
            phase === "loading" || query.trim() !== searchedText ? "opacity-60" : ""
          }`}
        >
          <p className="text-sm text-muted">
            {results.length} {results.length === 1 ? "result" : "results"}.
          </p>
          {phase === "done" && results.length === 0 && (
            <p>No books found. Try fewer words, or add it without search.</p>
          )}
          <ul className="flex flex-col gap-3">
            {results.map((result) => (
              <ResultRow
                key={result.volumeId}
                result={result}
                existing={books.find((book) => book.googleVolumeId === result.volumeId)}
                onAdd={addResult}
                onMove={move}
                onOpenSheet={setSheetFor}
                busy={busy}
              />
            ))}
          </ul>

          {moreFailed && (
            <p role="alert" className="font-semibold text-burgundy">
              Could not load more results.
            </p>
          )}
          {nextStart !== null && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="btn-outline self-center"
            >
              {loadingMore ? "Loading..." : "Show more results"}
            </button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-mist pt-5">
        <p className="font-semibold">Not on Google Books?</p>
        {!manual ? (
          <button type="button" onClick={() => setManual(true)} className="btn-outline self-start">
            Add it without search
          </button>
        ) : (
          <form
            aria-label="Add a book by hand"
            onSubmit={(event) => {
              event.preventDefault();
              create({
                title: manualTitle.trim(),
                author: manualAuthor.trim(),
                ownership: manualOwnership,
              });
            }}
            className="card flex flex-col gap-3 p-4"
          >
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Title</span>
              <input
                required
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Author</span>
              <input
                required
                value={manualAuthor}
                onChange={(event) => setManualAuthor(event.target.value)}
                className="field"
              />
            </label>
            <fieldset className="flex flex-wrap gap-4">
              <legend className="mb-1 font-semibold">Where does it go?</legend>
              {(["owned", "wanted"] as const).map((option) => (
                <label key={option} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="manual-ownership"
                    checked={manualOwnership === option}
                    onChange={() => setManualOwnership(option)}
                    className="h-5 w-5 accent-burgundy"
                  />
                  {option === "owned" ? "In my library" : "Wishlist"}
                </label>
              ))}
            </fieldset>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary">
                Add book
              </button>
              <button type="button" onClick={() => setManual(false)} className="btn-outline">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {sheetFor && (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/50 md:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Add ${sheetFor.title}`}
            className="w-full rounded-t-card bg-card p-5 pb-8"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="font-serif text-xl font-semibold">{sheetFor.title}</p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheetFor(null)}
                className="btn-outline w-11 px-0"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => addResult(sheetFor, "owned")}
                className="btn-primary min-h-12"
              >
                Add to library
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => addResult(sheetFor, "wanted")}
                className="btn-outline min-h-12"
              >
                Add to wishlist
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
