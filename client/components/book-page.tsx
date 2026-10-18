"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GenreChip, LangBadge, TropeChip } from "@/components/chips";
import { ErrorState, NotFound } from "@/components/error-state";
import { RowsSkeleton } from "@/components/skeleton";
import {
  FormatToggle,
  OwnershipToggle,
  ReadingStatusPills,
  StarRating,
} from "@/components/form-controls";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import { ExternalLinkIcon, PlusIcon, XIcon } from "@/components/icons";
import { Select } from "@/components/select";
import { SeriesPicker, type SeriesChoice } from "@/components/series-picker";
import { TagInput } from "@/components/tag-input";
import { ApiError } from "@/lib/api";
import {
  LINK_LANGUAGES,
  LINK_LANGUAGE_OPTIONS,
  useBook,
  useBookActions,
  useBooks,
  type Book,
  type BookChanges,
  type BookStatus,
  type Genre,
  type LinkLanguage,
  type Format,
  type Ownership,
  type ShopLink,
} from "@/lib/books";
import { highestNumberOf } from "@/lib/catalogue";
import { hostOf, isHttpUrl } from "@/lib/links";
import { useSeriesActions, useSeriesList } from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";

type Draft = {
  ownership: Ownership;
  format: Format;
  status: BookStatus;
  rating: number | undefined;
  genres: Genre[];
  tropes: string[];
  links: ShopLink[];
  notes: string;
  annotation: string;
  series: SeriesChoice;
};

function draftOf(book: Book): Draft {
  return {
    ownership: book.ownership,
    format: book.format,
    status: book.status,
    rating: book.rating,
    genres: book.genres,
    tropes: book.tropes,
    links: book.links,
    notes: book.notes ?? "",
    annotation: book.annotation ?? "",
    series: { seriesId: book.seriesId, seriesNumber: book.seriesNumber },
  };
}

function changesBetween(book: Book, draft: Draft): BookChanges {
  const before = draftOf(book);
  const changes: BookChanges = {};

  if (draft.ownership !== before.ownership) changes.ownership = draft.ownership;
  if (draft.format !== before.format) changes.format = draft.format;
  if (draft.status !== before.status) changes.status = draft.status;
  if (draft.rating !== before.rating) changes.rating = draft.rating ?? null;
  if (JSON.stringify(draft.genres) !== JSON.stringify(before.genres)) changes.genres = draft.genres;
  if (JSON.stringify(draft.tropes) !== JSON.stringify(before.tropes)) changes.tropes = draft.tropes;
  if (JSON.stringify(draft.links) !== JSON.stringify(before.links)) changes.links = draft.links;
  if (draft.notes !== before.notes) changes.notes = draft.notes.trim() === "" ? null : draft.notes;
  if (draft.annotation !== before.annotation) {
    changes.annotation = draft.annotation.trim() === "" ? null : draft.annotation;
  }
  if (draft.series.seriesId !== before.series.seriesId) {
    changes.seriesId = draft.series.seriesId ?? null;
  }
  const draftNumber = draft.series.seriesId ? draft.series.seriesNumber : undefined;
  const beforeNumber = before.series.seriesId ? before.series.seriesNumber : undefined;
  if (draftNumber !== beforeNumber) {
    changes.seriesNumber = draftNumber ?? null;
  }

  return changes;
}

function BookForm({ book }: { book: Book }) {
  const router = useRouter();
  const { updateBook, deleteBook } = useBookActions();
  const { books } = useBooks();
  const { series: seriesList, isLoading: seriesLoading } = useSeriesList();
  const { createSeries } = useSeriesActions();

  const [draft, setDraft] = useState<Draft>(() => draftOf(book));
  const [editingTags, setEditingTags] = useState(false);
  const [editingSeries, setEditingSeries] = useState(false);
  const [newLanguage, setNewLanguage] = useState<LinkLanguage>("uk");
  const [newUrl, setNewUrl] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changes = changesBetween(book, draft);
  const dirty = Object.keys(changes).length > 0;
  const series = seriesList.find((item) => item.id === draft.series.seriesId);
  const seriesBooks = books.filter((item) => item.seriesId === series?.id);
  const total = Math.max(series?.totalBooks ?? 0, highestNumberOf(seriesBooks), seriesBooks.length);

  const tropeCounts = new Map<string, number>();
  for (const item of books) {
    for (const trope of item.tropes) tropeCounts.set(trope, (tropeCounts.get(trope) ?? 0) + 1);
  }
  const suggestions = [...tropeCounts].map(([name, count]) => ({ name, count }));

  function patch(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      await updateBook(book.id, changes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setPending(true);
    try {
      await deleteBook(book.id);
      router.push("/library");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  function addLink() {
    if (!isHttpUrl(newUrl)) {
      setLinkError(true);
      return;
    }
    patch({ links: [...draft.links, { language: newLanguage, url: newUrl.trim() }] });
    setNewUrl("");
    setLinkError(false);
  }

  const linkGroups = LINK_LANGUAGES.map((language) => ({
    language,
    links: draft.links.filter((link) => link.language === language.value),
  })).filter((group) => group.links.length > 0);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href={draft.ownership === "wanted" ? "/wishlist" : "/library"} className="link">
          Library
        </Link>
        {series && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/series/${series.id}`} className="link">
              {series.title}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          {draft.series.seriesId && draft.series.seriesNumber !== undefined
            ? `Book ${draft.series.seriesNumber}`
            : book.title}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-5 sm:flex-row">
            <div className="w-40 shrink-0 self-start sm:w-48">
              <BookCover url={book.coverUrl} title={book.title} format={draft.format} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {!draft.series.seriesId && <p className="font-semibold text-navy">Standalone</p>}

              {series && draft.series.seriesNumber !== undefined && (
                <p className="font-semibold text-navy">
                  <Link href={`/series/${series.id}`} className="underline underline-offset-2">
                    Book {draft.series.seriesNumber} of {total}
                  </Link>{" "}
                  · {series.title}
                </p>
              )}

              {series && (
                <Link
                  href={`/add?series=${series.id}&number=${Math.floor(highestNumberOf(seriesBooks)) + 1}`}
                  className="btn-outline self-start"
                >
                  <PlusIcon size={18} />
                  Add a book to this series
                </Link>
              )}

              <div>
                <h1 className="text-[28px] font-semibold leading-tight md:text-[42px] lg:text-[52px]">
                  {book.title}
                </h1>
                <p className="mt-1 text-lg text-muted">{book.author}</p>
              </div>

              <OwnershipToggle
                value={draft.ownership}
                onChange={(ownership) => patch({ ownership })}
              />
              <FormatToggle value={draft.format} onChange={(format) => patch({ format })} />

              <div className="flex flex-wrap items-center gap-2">
                {draft.genres.map((genre) => (
                  <GenreChip key={genre} genre={genre} />
                ))}
                {draft.tropes.map((trope) => (
                  <TropeChip key={trope} trope={trope} />
                ))}
                {draft.genres.length + draft.tropes.length === 0 && (
                  <span className="text-sm text-muted">No genres or tropes yet.</span>
                )}
                {draft.series.seriesId && series ? (
                  <Link
                    href={`/series/${series.id}`}
                    className="inline-flex min-h-11 items-center text-navy underline underline-offset-2"
                  >
                    Tags belong to the series
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTags((current) => !current)}
                    aria-expanded={editingTags}
                    className="min-h-11 text-navy underline underline-offset-2"
                  >
                    {editingTags ? "Done" : "Edit tags"}
                  </button>
                )}
              </div>

              {editingTags && !draft.series.seriesId && (
                <div className="card flex flex-col gap-4 p-4">
                  <GenreMultiSelect value={draft.genres} onChange={(genres) => patch({ genres })} />
                  <TagInput
                    label="Tropes"
                    value={draft.tropes}
                    onChange={(tropes) => patch({ tropes })}
                    suggestions={suggestions}
                  />
                </div>
              )}

              {!seriesLoading && (
                <div>
                  <button
                    type="button"
                    onClick={() => setEditingSeries((current) => !current)}
                    aria-expanded={editingSeries}
                    className="min-h-11 text-navy underline underline-offset-2"
                  >
                    {editingSeries ? "Done" : series ? "Change series" : "Add to a series"}
                  </button>
                  {editingSeries && (
                    <div className="card mt-2 p-4">
                      <SeriesPicker
                        series={seriesList}
                        books={books}
                        currentBookId={book.id}
                        value={draft.series}
                        onChange={(value) => patch({ series: value })}
                        onCreate={createSeries}
                        suggestion={
                          draft.series.seriesId
                            ? undefined
                            : { title: book.title, author: book.author }
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {draft.ownership === "wanted" && (
            <section aria-labelledby="buy-heading" className="card flex flex-col gap-4 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="buy-heading" className="text-2xl font-semibold">
                  Where to buy
                </h2>
                <span className="text-sm text-muted">
                  {draft.links.length} {draft.links.length === 1 ? "link" : "links"}
                </span>
              </div>

              {linkGroups.length === 0 && <p className="text-muted">No links yet.</p>}

              {linkGroups.map((group) => (
                <div key={group.language.value} className="flex flex-col gap-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <LangBadge language={group.language.value} />
                    {group.language.name}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {group.links.map((link) => (
                      <li key={link.url} className="flex items-center gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 flex-1 items-center gap-2 rounded-control bg-page px-3 font-medium text-navy"
                        >
                          {hostOf(link.url)}
                          <ExternalLinkIcon size={16} />
                        </a>
                        <button
                          type="button"
                          aria-label={`Remove link ${hostOf(link.url)}`}
                          onClick={() =>
                            patch({ links: draft.links.filter((item) => item.url !== link.url) })
                          }
                          className="btn-outline w-11 px-0"
                        >
                          <XIcon size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="flex flex-col gap-2 border-t border-mist pt-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    label="Link language"
                    hideLabel
                    className="sm:w-28"
                    value={newLanguage}
                    onChange={(value) => setNewLanguage(value as LinkLanguage)}
                    options={LINK_LANGUAGE_OPTIONS}
                  />
                  <input
                    type="url"
                    aria-label="Shop URL"
                    aria-invalid={linkError}
                    placeholder="https://"
                    value={newUrl}
                    onChange={(event) => {
                      setNewUrl(event.target.value);
                      setLinkError(false);
                    }}
                    className={`field ${linkError ? "border-2 border-burgundy" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="btn-outline shrink-0 whitespace-nowrap"
                  >
                    <PlusIcon size={18} />
                    Add link
                  </button>
                </div>
                {linkError && (
                  <p role="alert" className="text-sm font-semibold text-burgundy">
                    Start the link with https://
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-2xl font-semibold font-serif">Notes</span>
              <textarea
                value={draft.notes}
                onChange={(event) => patch({ notes: event.target.value })}
                rows={4}
                className="field"
              />
            </label>

            {draft.series.seriesId && series ? (
              <div className="flex flex-col gap-1">
                <h2 className="font-serif text-2xl font-semibold">About the series</h2>
                {draft.annotation ? (
                  <p className="whitespace-pre-line">{draft.annotation}</p>
                ) : (
                  <p className="text-muted">The series has no description yet.</p>
                )}
                <Link
                  href={`/series/${series.id}`}
                  className="inline-flex min-h-11 items-center self-start text-navy underline underline-offset-2"
                >
                  Edit the series
                </Link>
              </div>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="font-serif text-2xl font-semibold">
                  My annotation{" "}
                  <span className="font-sans text-sm font-normal text-muted">optional</span>
                </span>
                <textarea
                  value={draft.annotation}
                  onChange={(event) => patch({ annotation: event.target.value })}
                  rows={4}
                  className="field"
                />
              </label>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="reading-heading" className="card flex flex-col gap-4 p-5">
            <h2 id="reading-heading" className="text-xl font-semibold">
              Reading
            </h2>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Status</p>
              <ReadingStatusPills value={draft.status} onChange={(status) => patch({ status })} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Rating</p>
              <StarRating value={draft.rating} onChange={(rating) => patch({ rating })} />
            </div>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-xl font-semibold">Remove</h2>
            <p className="text-sm text-muted">
              Deletes the book, its notes and links. The series stays.
            </p>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="btn-outline border-burgundy text-burgundy"
            >
              Delete book
            </button>
          </section>
        </aside>
      </div>

      {error && (
        <p role="alert" className="font-semibold text-burgundy">
          {error}
        </p>
      )}

      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="fixed inset-x-0 bottom-[92px] z-30 mx-auto flex w-[calc(100%-2rem)] max-w-3xl flex-wrap items-center justify-between gap-3 rounded-card bg-navy px-5 py-3 text-page shadow-pop md:bottom-6"
        >
          <p className="font-semibold">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(draftOf(book))}
              className="inline-flex min-h-11 items-center rounded-control border border-mist px-4 font-semibold"
            >
              Discard
            </button>
            <button type="button" onClick={save} disabled={pending} className="btn-beige">
              {pending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookPage({ id }: { id: string }) {
  const { user, status } = useRequireAuth();
  const { book, error, isLoading, reload } = useBook(id);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      {isLoading && <RowsSkeleton label="Loading the book…" />}
      {notFound && (
        <NotFound title="Book not found" backHref="/library" backLabel="Back to the library" />
      )}
      {error && !notFound && (
        <ErrorState
          title="Could not load this book"
          text="Check your connection and try again."
          onRetry={reload}
        />
      )}
      {book && <BookForm key={`${book.id}-${book.updatedAt}`} book={book} />}
    </main>
  );
}
