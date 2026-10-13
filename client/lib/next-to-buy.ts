"use client";

import useSWR from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";
import type { Book, Genre, LinkLanguage } from "./books";
import type { Series, SeriesStatus } from "./series";

export type NextToBuyItem = {
  type: "series" | "standalone";
  book: Book;
  gap: boolean;
  series?: Series;
};

export type NextToBuyFilters = {
  language?: LinkLanguage;
  genre?: Genre;
  trope?: string;
  seriesStatus?: SeriesStatus;
};

function queryOf(filters: NextToBuyFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function useNextToBuy(filters: NextToBuyFilters) {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading } = useSWR<{ items: NextToBuyItem[] }>(
    authStatus === "authenticated" ? `/api/next-to-buy${queryOf(filters)}` : null,
    (path: string) => apiFetch<{ items: NextToBuyItem[] }>(path),
  );

  return { items: data?.items ?? [], isLoading, error };
}
