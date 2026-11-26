"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AutoTextarea } from "@/components/auto-textarea";
import { BookCover } from "@/components/book-cover";
import { CoverPicker } from "@/components/book-cover-picker";
import { BookImpressions } from "@/components/book-impressions";
import { BookLinks } from "@/components/book-links";
import { BookProperties } from "@/components/book-properties";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Drawer } from "@/components/drawer";
import { ErrorState } from "@/components/error-state";
import { GenreChip, TropeChip } from "@/components/chips";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import { EditIcon, TrashIcon } from "@/components/icons";
import { TagInput } from "@/components/tag-input";
import { Toast } from "@/components/toast";
import { ApiError } from "@/lib/api";
import { useBook, useBookActions, useBooks, type Book } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useSeriesList, type Series } from "@/lib/series";
import {
  FlushContext,
  useBookAutosave,
  useDraft,
  useFlushRegistry,
  type SaveBook,
} from "@/lib/use-book-autosave";
import { useRequireAuth } from "@/lib/use-require-auth";

type CloseBy = "back" | "library";

function PanelHeader({ book, series }: { book?: Book; series?: Series }) {
  const t = useT();
  if (!book) return null;

  if (series) {
    return (
      <Link
        href={`/series/${series.id}`}
        className="inline-flex min-h-11 items-center text-[13px] font-semibold text-burgundy"
      >
        {book.seriesNumber === undefined
          ? series.title
          : t("book.panel.seriesNumber", { series: series.title, number: book.seriesNumber })}
      </Link>
    );
  }

  return <p className="text-[13px] font-semibold text-muted">{t("book.panel.standalone")}</p>;
}

function PanelSkeleton() {
  const t = useT();

  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">{t("book.loading")}</span>
      <div aria-hidden="true" className="flex gap-4">
        <div className="aspect-[2/3] w-20 shrink-0 rounded-cover bg-beige md:w-24" />
        <div className="flex flex-1 flex-col gap-3 pt-2">
          <div className="h-6 w-4/5 rounded-control bg-beige" />
          <div className="h-4 w-1/2 rounded-control bg-beige" />
          <div className="h-9 w-36 rounded-pill bg-beige" />
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-4 border-t border-mist pt-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-6">
            <div className="h-4 w-20 rounded-control bg-beige" />
            <div className="h-9 w-32 rounded-control bg-beige" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TitleBlock({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const titleId = useId();
  const authorId = useId();
  const [renaming, setRenaming] = useState(false);
  const [choosingCover, setChoosingCover] = useState(false);
  const pencil = useRef<HTMLButtonElement>(null);
  const coverButton = useRef<HTMLButtonElement>(null);

  const commitTitle = useCallback(
    (text: string) =>
      text.trim() === ""
        ? Promise.resolve(true)
        : save({ title: text.trim() }, { optimistic: false }),
    [save],
  );
  const commitAuthor = useCallback(
    (text: string) =>
      text.trim() === ""
        ? Promise.resolve(true)
        : save({ author: text.trim() }, { optimistic: false }),
    [save],
  );
  const title = useDraft("title", book.title, commitTitle);
  const author = useDraft("author", book.author, commitAuthor);

  async function finishRenaming(refocus: boolean) {
    const done = await Promise.all([title.flush(), author.flush()]);
    if (!done.every(Boolean)) return;
    title.setEditing(false);
    author.setEditing(false);
    setRenaming(false);
    if (refocus) window.setTimeout(() => pencil.current?.focus());
  }

  function cancelRenaming() {
    title.reset();
    author.reset();
    setRenaming(false);
    window.setTimeout(() => pencil.current?.focus());
  }

  function onRenameKey(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void finishRenaming(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelRenaming();
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-mist pb-5">
      <div className="flex gap-4">
        <div className="w-[72px] shrink-0 md:w-24">
          <BookCover url={book.coverUrl} title={book.title} format={book.format} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:pt-4">
          {renaming ? (
            <div
              className="flex flex-col gap-2"
              onKeyDown={onRenameKey}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  void finishRenaming(false);
                }
              }}
            >
              <label htmlFor={titleId} className="sr-only">
                {t("book.panel.title")}
              </label>
              <input
                id={titleId}
                autoFocus
                value={title.value}
                onChange={(event) => title.setValue(event.target.value)}
                onFocus={() => title.setEditing(true)}
                className="field min-h-10 bg-input-strong font-serif text-lg font-semibold"
              />
              <label htmlFor={authorId} className="sr-only">
                {t("book.panel.author")}
              </label>
              <input
                id={authorId}
                value={author.value}
                onChange={(event) => author.setValue(event.target.value)}
                onFocus={() => author.setEditing(true)}
                className="field min-h-10 bg-input-strong text-sm"
              />
              <button
                type="button"
                onClick={() => void finishRenaming(true)}
                className="btn-outline self-start"
              >
                {t("book.panel.renameDone")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h2 className="min-w-0 flex-1 text-xl font-semibold leading-tight md:text-[22px]">
                  {book.title}
                </h2>
                <button
                  ref={pencil}
                  type="button"
                  aria-label={t("book.panel.rename")}
                  onClick={() => {
                    title.reset();
                    author.reset();
                    setRenaming(true);
                  }}
                  className="btn-round h-9 w-9"
                >
                  <EditIcon size={16} />
                </button>
              </div>
              <p className="text-sm text-muted">{book.author}</p>
            </>
          )}
          {!choosingCover && (
            <button
              ref={coverButton}
              type="button"
              onClick={() => setChoosingCover(true)}
              className="btn-outline min-h-9 self-start px-4 text-sm md:min-h-9"
            >
              {t("book.panel.cover.change")}
            </button>
          )}
        </div>
      </div>
      {choosingCover && (
        <CoverPicker
          book={book}
          onSave={(changes) => void save(changes)}
          onDone={() => {
            setChoosingCover(false);
            window.setTimeout(() => coverButton.current?.focus());
          }}
        />
      )}
    </div>
  );
}

function Annotation({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const areaId = useId();
  const commit = useCallback(
    (text: string) => save({ annotation: text.trim() === "" ? null : text }, { optimistic: false }),
    [save],
  );
  const draft = useDraft("annotation", book.annotation ?? "", commit);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">
        <label htmlFor={areaId}>{t("book.panel.annotation")}</label>
      </h2>
      <AutoTextarea
        id={areaId}
        maxLength={5000}
        value={draft.value}
        onChange={(event) => draft.setValue(event.target.value)}
        onFocus={() => draft.setEditing(true)}
        onBlur={() => {
          draft.setEditing(false);
          void draft.flush();
        }}
        className="rounded-card border border-mist bg-card px-3 py-2.5 text-sm leading-relaxed"
      />
    </section>
  );
}

function SeriesTags({ book }: { book: Book }) {
  const t = useT();
  if (book.genres.length + book.tropes.length === 0) return null;

  return (
    <dl className="flex flex-col gap-2">
      {book.genres.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-full text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            {t("book.genres.label")}
          </dt>
          {book.genres.map((genre) => (
            <dd key={genre}>
              <GenreChip genre={genre} />
            </dd>
          ))}
        </div>
      )}
      {book.tropes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-full text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            {t("book.panel.tropes")}
          </dt>
          {book.tropes.map((trope) => (
            <dd key={trope}>
              <TropeChip trope={trope} />
            </dd>
          ))}
        </div>
      )}
    </dl>
  );
}

function OwnTags({ book, save }: { book: Book; save: SaveBook }) {
  const t = useT();
  const { books } = useBooks();
  const counts = new Map<string, number>();
  for (const item of books) {
    for (const trope of item.tropes) counts.set(trope, (counts.get(trope) ?? 0) + 1);
  }
  const suggestions = [...counts].map(([name, count]) => ({ name, count }));

  return (
    <div className="flex flex-col gap-4">
      <GenreMultiSelect value={book.genres} onChange={(genres) => void save({ genres })} />
      <TagInput
        label={t("book.panel.tropes")}
        value={book.tropes}
        onChange={(tropes) => void save({ tropes })}
        suggestions={suggestions}
      />
    </div>
  );
}

function DeleteBook({
  book,
  series,
  onDeleted,
  onFailed,
}: {
  book: Book;
  series?: Series;
  onDeleted: () => void;
  onFailed: () => void;
}) {
  const t = useT();
  const { deleteBook } = useBookActions();
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await deleteBook(book.id);
      onDeleted();
    } catch {
      setPending(false);
      setAsking(false);
      onFailed();
    }
  }

  return (
    <div className="flex justify-end border-t border-mist pt-5">
      <button type="button" onClick={() => setAsking(true)} className="btn-primary">
        <TrashIcon size={18} />
        {t("book.panel.delete.button")}
      </button>
      {asking && (
        <ConfirmDialog
          title={t("book.panel.delete.title", { title: book.title })}
          text={
            series
              ? t("book.panel.delete.textSeries", { series: series.title })
              : t("book.panel.delete.text")
          }
          cancelLabel={t("book.panel.delete.cancel")}
          confirmLabel={t("book.panel.delete.confirm")}
          pending={pending}
          onCancel={() => setAsking(false)}
          onConfirm={() => void confirm()}
        />
      )}
    </div>
  );
}

function PanelContent({
  book,
  series,
  onDeleted,
}: {
  book: Book;
  series?: Series;
  onDeleted: () => void;
}) {
  const t = useT();
  const { save, toast, show, dismiss } = useBookAutosave(book.id);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <TitleBlock book={book} save={save} />
      <BookProperties book={book} save={save} />
      {series ? <SeriesTags book={book} /> : <OwnTags book={book} save={save} />}
      <div className="border-t border-mist pt-5">
        <Annotation book={book} save={save} />
      </div>
      <div className="border-t border-mist pt-5">
        <BookLinks links={book.links} onChange={(links) => void save({ links })} />
      </div>
      <div className="border-t border-mist pt-5">
        <BookImpressions book={book} save={save} />
      </div>
      <DeleteBook
        book={book}
        series={series}
        onDeleted={onDeleted}
        onFailed={() => show({ tone: "error", text: t("book.panel.deleteFailed") })}
      />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

export function BookPanel({ id, closeBy }: { id: string; closeBy: CloseBy }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useRequireAuth();
  const { book, error, isLoading, reload } = useBook(id);
  const { series: seriesList } = useSeriesList();
  const { register, flushAll } = useFlushRegistry();
  const closing = useRef(false);

  const close = useCallback(() => {
    if (closeBy === "back") router.back();
    else router.replace("/library");
  }, [closeBy, router]);

  const requestClose = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    if (await flushAll()) close();
    else closing.current = false;
  }, [close, flushAll]);

  const here = pathname === `/books/${id}`;

  useEffect(() => {
    if (here) void reload();
    else closing.current = false;
  }, [here, reload]);

  if (status !== "authenticated" || !user || !here) return null;

  const notFound = error instanceof ApiError && error.status === 404;
  const series = book?.seriesId ? seriesList.find((item) => item.id === book.seriesId) : undefined;

  return (
    <Drawer
      label={book?.title ?? t("shell.titles.book")}
      header={<PanelHeader book={book} series={series} />}
      onClose={() => void requestClose()}
      tall
      lightScrim
      className="md:w-[460px] lg:w-[500px]"
    >
      <FlushContext.Provider value={register}>
        {isLoading && <PanelSkeleton />}
        {notFound && (
          <div className="flex flex-col items-start gap-3 py-6">
            <h2 className="text-2xl font-semibold">{t("book.notFound.title")}</h2>
            <p className="text-muted">{t("book.panel.notFoundText")}</p>
            <button type="button" onClick={close} className="btn-primary">
              {t("shell.close")}
            </button>
          </div>
        )}
        {error && !notFound && !book && (
          <ErrorState
            title={t("book.loadFailed.title")}
            text={t("book.loadFailed.text")}
            onRetry={reload}
          />
        )}
        {book && !notFound && (
          <PanelContent key={book.id} book={book} series={series} onDeleted={close} />
        )}
      </FlushContext.Provider>
    </Drawer>
  );
}
