"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export type BookSearchResult = {
  volumeId: string;
  title: string;
  authors: string[];
  year?: number;
  coverUrl?: string;
  link?: string;
};

export const SEARCH_DEBOUNCE_MS = 400;
export const SEARCH_MIN_LENGTH = 3;

type Outcome = { query: string; results: BookSearchResult[]; failed: boolean };

export function useBookSearch(text: string) {
  const query = text.trim();
  const [settledQuery, setSettledQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (settledQuery.length < SEARCH_MIN_LENGTH) return;

    const controller = new AbortController();

    apiFetch<{ results: BookSearchResult[] }>(
      `/api/books/search?q=${encodeURIComponent(settledQuery)}`,
      { signal: controller.signal },
    )
      .then((body) => setOutcome({ query: settledQuery, results: body.results, failed: false }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setOutcome({ query: settledQuery, results: [], failed: true });
        }
      });

    return () => controller.abort();
  }, [settledQuery]);

  if (query.length < SEARCH_MIN_LENGTH) {
    return { status: "idle", results: [] } as const;
  }

  if (!outcome || outcome.query !== query) {
    return { status: "loading", results: [] } as const;
  }

  if (outcome.failed) {
    return { status: "failed", results: [] } as const;
  }

  return { status: "done", results: outcome.results } as const;
}
