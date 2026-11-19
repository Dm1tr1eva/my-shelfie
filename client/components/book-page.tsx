"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GenreChip, LangBadge, LinkKindBadge, TropeChip } from "@/components/chips";
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
  LINK_KINDS,
  linkKindOptions,
  linkLanguageOptions,
  useBook,
  useBookActions,
  useBooks,
  type Book,
  type BookChanges,
  type BookStatus,
  type Genre,
  type LinkKind,
  type LinkLanguage,
  type Format,
  type Ownership,
  type ShopLink,
} from "@/lib/books";
import { highestNumberOf } from "@/lib/catalogue";
import { useT } from "@/lib/i18n";
import { translateServerError } from "@/lib/i18n/server-errors";
import { useDomain } from "@/lib/i18n/domain";
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
  const t = useT();
  const domain = useDomain();
  const router = useRouter();
  const { updateBook, deleteBook } = useBookActions();
  const { books } = useBooks();
  const { series: seriesList, isLoading: seriesLoading } = useSeriesList();
  const { createSeries } = useSeriesActions();

  const [draft, setDraft] = useState<Draft>(() => draftOf(book));
  const [editingTags, setEditingTags] = useState(false);
  const [editingSeries, setEditingSeries] = useState(false);
  const [newKind, setNewKind] = useState<LinkKind>("paper");
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
      setError(err instanceof ApiError ? translateServerError(err.message, t) : t("book.error"));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("book.remove.confirm", { title: book.title }))) return;
    setPending(true);
    try {
      await deleteBook(book.id);
      router.push("/library");
    } catch (err) {
      setError(err instanceof ApiError ? translateServerError(err.message, t) : t("book.error"));
      setPending(false);
    }
  }

  function addLink() {
    if (!isHttpUrl(newUrl)) {
      setLinkError(true);
      return;
    }
    patch({
      links: [...draft.links, { kind: newKind, languages: [newLanguage], url: newUrl.trim() }],
    });
    setNewUrl("");
    setLinkError(false);
  }

  const linkGroups = LINK_KINDS.map((kind) => ({
    kind,
    links: draft.links.filter((link) => link.kind === kind.value),
  })).filter((group) => group.links.length > 0);
  const kindOptions = linkKindOptions(domain);
  const languageOptions = linkLanguageOptions(domain);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <nav
        aria-label={t("book.breadcrumb.label")}
        className="flex flex-wrap items-center gap-2 text-sm text-muted"
      >
        <Link href={draft.ownership === "wanted" ? "/wishlist" : "/library"} className="link">
          {t("book.breadcrumb.library")}
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
            ? t("book.breadcrumb.book", { number: draft.series.seriesNumber })
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
              {!draft.series.seriesId && (
                <p className="font-semibold text-navy">{t("book.standalone")}</p>
              )}

              {series && draft.series.seriesNumber !== undefined && (
                <p className="font-semibold text-navy">
                  <Link href={`/series/${series.id}`} className="underline underline-offset-2">
                    {t("book.position", { number: draft.series.seriesNumber, total })}
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
                  {t("book.addToThisSeries")}
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
                  <span className="text-sm text-muted">{t("book.noTags")}</span>
                )}
                {draft.series.seriesId && series ? (
                  <Link
                    href={`/series/${series.id}`}
                    className="inline-flex min-h-11 items-center text-navy underline underline-offset-2"
                  >
                    {t("book.tagsBelongToSeries")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTags((current) => !current)}
                    aria-expanded={editingTags}
                    className="min-h-11 text-navy underline underline-offset-2"
                  >
                    {editingTags ? t("book.done") : t("book.editTags")}
                  </button>
                )}
              </div>

              {editingTags && !draft.series.seriesId && (
                <div className="card flex flex-col gap-4 p-4">
                  <GenreMultiSelect value={draft.genres} onChange={(genres) => patch({ genres })} />
                  <TagInput
                    label={t("book.tropes")}
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
                    {editingSeries
                      ? t("book.done")
                      : series
                        ? t("book.changeSeries")
                        : t("book.addToSeries")}
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
                  {t("book.links.heading")}
                </h2>
                <span className="text-sm text-muted">
                  {t("book.links.count", { count: draft.links.length })}
                </span>
              </div>

              {linkGroups.length === 0 && <p className="text-muted">{t("book.links.none")}</p>}

              {linkGroups.map((group) => (
                <div key={group.kind.value} className="flex flex-col gap-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <LinkKindBadge kind={group.kind.value} decorative />
                    {domain.linkKind(group.kind.value)}
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
                          {link.languages.map((language) => (
                            <LangBadge key={language} language={language} />
                          ))}
                          {hostOf(link.url)}
                          <ExternalLinkIcon size={16} />
                        </a>
                        <button
                          type="button"
                          aria-label={t("book.links.remove", { host: hostOf(link.url) })}
                          onClick={() =>
                            patch({ links: draft.links.filter((item) => item.url !== link.url) })
                          }
                          className="btn-round"
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
                    label={t("book.links.kindLabel")}
                    hideLabel
                    className="sm:w-36"
                    value={newKind}
                    onChange={(value) => setNewKind(value as LinkKind)}
                    options={kindOptions}
                  />
                  <Select
                    label={t("book.links.languageLabel")}
                    hideLabel
                    className="sm:w-28"
                    value={newLanguage}
                    onChange={(value) => setNewLanguage(value as LinkLanguage)}
                    options={languageOptions}
                  />
                  <input
                    type="url"
                    aria-label={t("book.links.urlLabel")}
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
                    {t("book.links.add")}
                  </button>
                </div>
                {linkError && (
                  <p role="alert" className="text-sm font-semibold text-burgundy">
                    {t("book.links.startWithHttps")}
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-2xl font-semibold font-serif">{t("book.notes")}</span>
              <textarea
                value={draft.notes}
                onChange={(event) => patch({ notes: event.target.value })}
                rows={4}
                className="field"
              />
            </label>

            {draft.series.seriesId && series ? (
              <div className="flex flex-col gap-1">
                <h2 className="font-serif text-2xl font-semibold">{t("book.aboutSeries")}</h2>
                {draft.annotation ? (
                  <p className="whitespace-pre-line">{draft.annotation}</p>
                ) : (
                  <p className="text-muted">{t("book.noSeriesDescription")}</p>
                )}
                <Link
                  href={`/series/${series.id}`}
                  className="inline-flex min-h-11 items-center self-start text-navy underline underline-offset-2"
                >
                  {t("book.editSeries")}
                </Link>
              </div>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="font-serif text-2xl font-semibold">
                  {t("book.annotation")}{" "}
                  <span className="font-sans text-sm font-normal text-muted">
                    {t("book.optional")}
                  </span>
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
              {t("book.reading.heading")}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">{t("book.reading.status")}</p>
              <ReadingStatusPills value={draft.status} onChange={(status) => patch({ status })} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">{t("book.reading.rating")}</p>
              <StarRating value={draft.rating} onChange={(rating) => patch({ rating })} />
            </div>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-xl font-semibold">{t("book.remove.heading")}</h2>
            <p className="text-sm text-muted">{t("book.remove.text")}</p>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="btn-outline border-burgundy text-burgundy"
            >
              {t("book.remove.button")}
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
          aria-label={t("book.unsaved.label")}
          className="fixed inset-x-0 bottom-[92px] z-30 mx-auto flex w-[calc(100%-2rem)] max-w-3xl flex-wrap items-center justify-between gap-3 rounded-card bg-navy px-5 py-3 text-page shadow-pop md:bottom-6"
        >
          <p className="font-semibold">{t("book.unsaved.message")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(draftOf(book))}
              className="inline-flex min-h-11 items-center rounded-control border border-mist px-4 font-semibold"
            >
              {t("book.unsaved.discard")}
            </button>
            <button type="button" onClick={save} disabled={pending} className="btn-beige">
              {pending ? t("book.unsaved.saving") : t("book.unsaved.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookPage({ id }: { id: string }) {
  const t = useT();
  const { user, status } = useRequireAuth();
  const { book, error, isLoading, reload } = useBook(id);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      {isLoading && <RowsSkeleton label={t("book.loading")} />}
      {notFound && (
        <NotFound
          title={t("book.notFound.title")}
          backHref="/library"
          backLabel={t("book.notFound.back")}
        />
      )}
      {error && !notFound && (
        <ErrorState
          title={t("book.loadFailed.title")}
          text={t("book.loadFailed.text")}
          onRetry={reload}
        />
      )}
      {book && <BookForm key={`${book.id}-${book.updatedAt}`} book={book} />}
    </main>
  );
}
