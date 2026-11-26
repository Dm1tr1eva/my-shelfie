"use client";

import { useEffect, useId, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { apiFetch } from "@/lib/api";
import { SEARCH_MIN_LENGTH, type BookSearchResult } from "@/lib/book-search";
import type { Book, BookChanges } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { isHttpUrl } from "@/lib/links";

const QUERY_MAX = 200;

type Found = { state: "searching" } | { state: "failed" } | { state: "done"; covers: string[] };

function queryOf(book: Book) {
  return `${book.title} ${book.author}`.trim().slice(0, QUERY_MAX);
}

export function CoverPicker({
  book,
  onSave,
  onDone,
}: {
  book: Book;
  onSave: (changes: BookChanges) => void;
  onDone: () => void;
}) {
  const t = useT();
  const urlId = useId();
  const query = queryOf(book);
  const [found, setFound] = useState<Found>(
    query.length >= SEARCH_MIN_LENGTH ? { state: "searching" } : { state: "done", covers: [] },
  );
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState(false);

  useEffect(() => {
    if (query.length < SEARCH_MIN_LENGTH) return;
    let current = true;

    apiFetch<{ results: BookSearchResult[] }>(`/api/books/search?q=${encodeURIComponent(query)}`)
      .then((body) => {
        if (!current) return;
        const covers = [
          ...new Set(body.results.flatMap((result) => (result.coverUrl ? [result.coverUrl] : []))),
        ].filter((cover) => cover !== book.coverUrl);
        setFound({ state: "done", covers });
      })
      .catch(() => {
        if (current) setFound({ state: "failed" });
      });

    return () => {
      current = false;
    };
  }, [book.coverUrl, query]);

  function applyUrl() {
    if (!isHttpUrl(url)) {
      setUrlError(true);
      return;
    }
    onSave({ coverUrl: url.trim() });
    setUrl("");
  }

  return (
    <section
      aria-label={t("book.panel.cover.change")}
      className="flex flex-col gap-4 rounded-card border border-mist p-4"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{t("book.panel.cover.fromGoogle")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- the Google mark must be shown unaltered, not re-encoded by the optimizer */}
          <img
            src="/powered-by-google.png"
            alt={t("book.panel.cover.poweredBy")}
            width={62}
            height={30}
            className="h-4 w-auto"
          />
        </div>
        {found.state === "searching" && (
          <p role="status" className="text-sm text-muted">
            {t("book.panel.cover.searching")}
          </p>
        )}
        {found.state === "failed" && (
          <p className="text-sm text-muted">{t("book.panel.cover.failed")}</p>
        )}
        {found.state === "done" && found.covers.length === 0 && (
          <p className="text-sm text-muted">{t("book.panel.cover.none")}</p>
        )}
        {found.state === "done" && found.covers.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {found.covers.map((cover, index) => (
              <li key={cover}>
                <button
                  type="button"
                  aria-label={t("book.panel.cover.use", { number: index + 1 })}
                  onClick={() => onSave({ coverUrl: cover })}
                  className="block w-14 rounded-cover"
                >
                  <BookCover url={cover} title={book.title} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={urlId} className="text-sm font-semibold">
          {t("book.panel.cover.url")}
        </label>
        <div className="flex gap-2">
          <input
            id={urlId}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={url}
            aria-invalid={urlError}
            onChange={(event) => {
              setUrl(event.target.value);
              setUrlError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyUrl();
              }
            }}
            className={`field min-w-0 flex-1 ${urlError ? "border-2 border-burgundy" : ""}`}
          />
          <button type="button" onClick={applyUrl} className="btn-outline shrink-0">
            {t("book.panel.cover.useUrl")}
          </button>
        </div>
        {urlError && (
          <p role="alert" className="text-sm font-semibold text-burgundy">
            {t("book.links.startWithHttps")}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSave({ coverUrl: null })}
          disabled={!book.coverUrl}
          className="btn-outline"
        >
          {t("book.panel.cover.plain")}
        </button>
        <button type="button" onClick={onDone} className="btn-outline">
          {t("book.panel.cover.done")}
        </button>
      </div>
    </section>
  );
}
