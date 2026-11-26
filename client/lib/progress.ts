"use client";

import useSWR from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";

type ProgressEntry = {
  id: string;
  bookId: string;
  date: string;
  page?: number;
  percent: number;
};

export function useBookProgress(bookId: string) {
  const { status } = useAuth();

  const { data } = useSWR<{ entries: ProgressEntry[] }>(
    status === "authenticated" ? "/api/progress" : null,
    (path: string) => apiFetch<{ entries: ProgressEntry[] }>(path),
  );

  return data?.entries.find((entry) => entry.bookId === bookId)?.percent ?? 0;
}
