"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";
import { isLibraryKey, type Book } from "./books";

export type SeriesStatus = "ongoing" | "complete" | "unknown";

export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
  ongoing: "Ongoing",
  complete: "Complete",
  unknown: "Unknown",
};

export const SERIES_STATUSES = Object.keys(SERIES_STATUS_LABELS) as SeriesStatus[];

export const SERIES_STATUS_OPTIONS = SERIES_STATUSES.map((value) => ({
  value,
  label: SERIES_STATUS_LABELS[value],
}));

export const SERIES_STATE_CHOICES: { value: SeriesStatus; label: string }[] = [
  { value: "ongoing", label: "Still coming out" },
  { value: "complete", label: "Finished" },
  { value: "unknown", label: "Don't know" },
];

export type Series = {
  id: string;
  title: string;
  status: SeriesStatus;
  ownedCount: number;
  wantedCount: number;
  createdAt: string;
  updatedAt: string;
  author?: string;
  note?: string;
  totalBooks?: number;
};

export type NewSeries = {
  title: string;
  author?: string;
  status?: SeriesStatus;
  note?: string;
  totalBooks?: number;
};

export type SeriesChanges = Partial<{
  title: string;
  author: string | null;
  status: SeriesStatus;
  note: string | null;
  totalBooks: number | null;
}>;

export function useSeriesList() {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading } = useSWR<{ series: Series[] }>(
    authStatus === "authenticated" ? "/api/series" : null,
    (path: string) => apiFetch<{ series: Series[] }>(path),
  );

  return { series: data?.series ?? [], isLoading, error };
}

export function useSeries(id: string) {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ series: Series; books: Book[] }>(
    authStatus === "authenticated" ? `/api/series/${id}` : null,
    (path: string) => apiFetch<{ series: Series; books: Book[] }>(path),
  );

  return {
    series: data?.series,
    books: data?.books ?? [],
    isLoading,
    error,
    reload: () => mutate(),
  };
}

export function useSeriesActions() {
  const { mutate } = useSWRConfig();

  const createSeries = useCallback(
    async (series: NewSeries) => {
      const created = await apiFetch<Series>("/api/series", {
        method: "POST",
        body: JSON.stringify(series),
      });
      await mutate(isLibraryKey);
      return created;
    },
    [mutate],
  );

  const updateSeries = useCallback(
    async (id: string, changes: SeriesChanges) => {
      const updated = await apiFetch<Series>(`/api/series/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      await mutate(isLibraryKey);
      return updated;
    },
    [mutate],
  );

  const deleteSeries = useCallback(
    async (id: string) => {
      await apiFetch<void>(`/api/series/${id}`, { method: "DELETE" });
      await mutate((key) => isLibraryKey(key) && key !== `/api/series/${id}`);
    },
    [mutate],
  );

  return { createSeries, updateSeries, deleteSeries };
}
