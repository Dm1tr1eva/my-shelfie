"use client";

import { useCallback, useId, useRef, useState } from "react";
import { AgeChip, GenreChip, SeriesStatusChip, TropeChip } from "@/components/chips";
import { ErrorState, NotFound } from "@/components/error-state";
import { ChevronDownIcon, EditIcon } from "@/components/icons";
import { SeriesBooks } from "@/components/series-books";
import { SeriesEdit } from "@/components/series-edit";
import { SeriesNote } from "@/components/series-note";
import { SeriesSegments } from "@/components/series-segments";
import { RowsSkeleton } from "@/components/skeleton";
import { Toast, type ToastMessage } from "@/components/toast";
import { ApiError } from "@/lib/api";
import type { Book } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useSeries, type Series } from "@/lib/series";
import { seriesSlots } from "@/lib/shelves";
import { useMediaQuery } from "@/lib/use-media-query";
import { useRequireAuth } from "@/lib/use-require-auth";

const LABEL = "text-xs font-semibold uppercase tracking-[0.06em] text-muted";

function TitleWithAge({ series, id }: { series: Series; id: string }) {
  const words = series.title.trim().split(/\s+/);
  const last = words.pop() ?? "";
  const age = series.ageRating;

  return (
    <h1 id={id} className="text-[30px] font-semibold leading-[1.1] md:text-[38px] lg:text-[44px]">
      {words.length > 0 && `${words.join(" ")} `}
      <span>
        {last}
        {age !== "none" && (
          <>
            {"\u00a0"}
            <AgeChip age={age} />
          </>
        )}
      </span>
    </h1>
  );
}

function Details({ series }: { series: Series }) {
  const t = useT();
  const hasTags = series.genres.length + series.tropes.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {hasTags && (
        <dl className="flex flex-col gap-3">
          {series.genres.length > 0 && (
            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3">
              <dt className={`${LABEL} pt-1.5`}>{t("series.page.genre")}</dt>
              <dd className="flex flex-wrap gap-2">
                {series.genres.map((genre) => (
                  <GenreChip key={genre} genre={genre} />
                ))}
              </dd>
            </div>
          )}
          {series.tropes.length > 0 && (
            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3">
              <dt className={`${LABEL} pt-1.5`}>{t("series.page.tropes")}</dt>
              <dd className="flex flex-wrap gap-2">
                {series.tropes.map((trope) => (
                  <TropeChip key={trope} trope={trope} />
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
      {series.annotation && (
        <div className={`flex flex-col gap-2 ${hasTags ? "border-t border-mist pt-5" : ""}`}>
          <h2 className="text-xl font-semibold">{t("series.page.annotation")}</h2>
          <p className="max-w-3xl whitespace-pre-line leading-relaxed">{series.annotation}</p>
        </div>
      )}
    </div>
  );
}

function ProgressCard({ series, books }: { series: Series; books: Book[] }) {
  const t = useT();
  const { segments } = seriesSlots(series, books);
  const owned = segments.filter((state) => state === "owned").length;

  return (
    <div className="flex items-center gap-3 rounded-card bg-navy px-4 py-3 text-page md:flex-col md:items-stretch md:gap-4 md:px-5 md:py-5">
      <p className="shrink-0 font-serif font-semibold">
        <span className="num text-xl md:text-4xl">{owned}</span>{" "}
        <span className="text-sm text-mist md:text-lg">
          {t("series.page.ownedOf", { total: segments.length })}
        </span>
      </p>
      <SeriesSegments states={segments} card />
    </div>
  );
}

function SeriesView({ series, books }: { series: Series; books: Book[] }) {
  const t = useT();
  const detailsId = useId();
  const titleId = useId();
  const wide = useMediaQuery("(min-width: 48rem)");
  const [editing, setEditing] = useState(false);
  const inline = editing && wide;
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const counter = useRef(0);
  const pencil = useRef<HTMLButtonElement>(null);
  const { slots } = seriesSlots(series, books);
  const hasDetails = series.genres.length + series.tropes.length > 0 || Boolean(series.annotation);

  const show = useCallback((message: Omit<ToastMessage, "id">) => {
    counter.current += 1;
    setToast({ ...message, id: counter.current });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);

  function closeEditing() {
    setEditing(false);
    window.setTimeout(() => pencil.current?.focus());
  }

  const side = (
    <div className="flex flex-col gap-4">
      <ProgressCard series={series} books={books} />
      <SeriesNote series={series} show={show} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <section
        aria-labelledby={inline ? undefined : titleId}
        className={
          inline
            ? "grid gap-6 md:grid-cols-[minmax(0,1fr)_230px] lg:grid-cols-[minmax(0,1fr)_300px]"
            : "card relative grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_230px] md:gap-x-6 md:gap-y-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-8"
        }
      >
        {inline ? (
          <SeriesEdit series={series} onClose={closeEditing} sheet={false} />
        ) : (
          <div className="flex min-w-0 flex-col gap-5 md:col-start-1 md:row-start-1">
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <TitleWithAge series={series} id={titleId} />
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {series.author && <span className="text-muted">{series.author}</span>}
                  <SeriesStatusChip status={series.status} />
                </p>
              </div>
              <button
                ref={pencil}
                type="button"
                aria-label={t("series.page.edit")}
                onClick={() => setEditing(true)}
                className="btn-round shrink-0"
              >
                <EditIcon size={18} />
              </button>
            </div>
          </div>
        )}
        <div className={inline ? "" : "md:col-start-2 md:row-span-2 md:row-start-1"}>{side}</div>
        {!inline && (
          <div
            id={detailsId}
            className={`min-w-0 md:col-start-1 md:row-start-2 md:block ${more ? "" : "hidden"}`}
          >
            <Details series={series} />
          </div>
        )}
        {!inline && hasDetails && (
          <button
            type="button"
            aria-expanded={more}
            aria-controls={detailsId}
            aria-label={more ? t("series.page.less") : t("series.page.more")}
            onClick={() => setMore((current) => !current)}
            className="absolute -bottom-4 left-1/2 inline-flex h-8 w-12 -translate-x-1/2 items-center justify-center rounded-pill border border-mist bg-card text-navy md:hidden"
          >
            <span className={more ? "rotate-180" : ""}>
              <ChevronDownIcon size={18} />
            </span>
          </button>
        )}
      </section>

      {editing && !wide && <SeriesEdit series={series} onClose={closeEditing} sheet />}
      <SeriesBooks series={series} slots={slots} />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

export function SeriesPage({ id }: { id: string }) {
  const t = useT();
  const { user, status } = useRequireAuth();
  const { series, books, error, isLoading, reload } = useSeries(id);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      {isLoading && <RowsSkeleton label={t("series.loading")} />}
      {notFound && (
        <NotFound
          title={t("series.notFound")}
          backHref="/library"
          backLabel={t("series.backToLibrary")}
        />
      )}
      {error && !notFound && !series && (
        <ErrorState
          title={t("series.loadError")}
          text={t("series.checkConnection")}
          onRetry={reload}
        />
      )}
      {series && !notFound && <SeriesView series={series} books={books} />}
    </main>
  );
}
