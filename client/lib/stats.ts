"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";
import { isLibraryKey } from "./books";
import type { ExpectedSource, Format } from "./catalogue-constants";

export const STATS_KEY = "/api/stats";

export type SeriesRef = { id: string; title: string; number?: number };

export type BookRef = {
  id: string;
  title: string;
  author: string;
  format: Format;
  coverUrl?: string;
  series?: SeriesRef;
};

export type MonthBook = BookRef & { rating?: number; finishedAt: string };

export type ReadingBook = BookRef & {
  pages?: number;
  startedAt?: string;
  progress?: { percent: number; page?: number; date: string };
};

export type YearGoal = {
  year: number;
  target: number;
  done: number;
  percent: number;
  weeksLeft: number;
};

export type VeryMuchItem =
  | {
      type: "series";
      group: "continue" | "new";
      id: string;
      title: string;
      coverUrl?: string;
      owned: number;
      total: number;
    }
  | { type: "book"; id: string; title: string; author: string; coverUrl?: string };

export type HomeStats = {
  year: number;
  readCount: number;
  pagesRead: number;
  waitingOnShelf: number;
  seriesComplete: { complete: number; of: number };
  yearGoal: YearGoal | null;
  readPerMonth: { month: number; books: MonthBook[] }[];
  currentlyReading: ReadingBook[];
  genres: { name: string; count: number }[];
  waitingForContinuation: {
    series: { id: string; title: string };
    number: number;
    expectedYear?: number;
    source?: ExpectedSource;
  }[];
  veryMuch: VeryMuchItem[];
  quoteOfTheDay: { text: string; page?: number; book: { id: string; title: string } } | null;
  newOnShelf: BookRef[];
};

export type Position = { page: number } | { percent: number };

export function seriesLabel(series: SeriesRef) {
  return series.number === undefined ? series.title : `${series.title} #${series.number}`;
}

export function localDate(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function useHomeStats() {
  const { status } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<HomeStats>(
    status === "authenticated" ? STATS_KEY : null,
    (path: string) => apiFetch<HomeStats>(path),
  );

  return { stats: data, error, isLoading, reload: () => mutate() };
}

export function useHomeActions() {
  const { mutate } = useSWRConfig();

  const refresh = useCallback(
    () => mutate((key) => key === STATS_KEY || isLibraryKey(key)),
    [mutate],
  );

  const recordProgress = useCallback(
    async (bookId: string, position: Position) => {
      await apiFetch("/api/progress", {
        method: "POST",
        body: JSON.stringify({ bookId, ...position }),
      });
      await refresh();
    },
    [refresh],
  );

  const finishBook = useCallback(
    async (bookId: string) => {
      try {
        await apiFetch("/api/progress", {
          method: "POST",
          body: JSON.stringify({ bookId, percent: 100 }),
        });
        await apiFetch(`/api/books/${bookId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "read", finishedAt: localDate() }),
        });
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const saveGoal = useCallback(
    async (year: number, books: number) => {
      await apiFetch("/api/year-goal", {
        method: "PUT",
        body: JSON.stringify({ year, books }),
      });
      await refresh();
    },
    [refresh],
  );

  return { recordProgress, finishBook, saveGoal };
}
