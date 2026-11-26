"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";
import { isLibraryKey } from "./books";
import type {
  DesireLevel,
  Format,
  LinkKind,
  LinkLanguage,
  SeriesStatus,
} from "./catalogue-constants";
import {
  STANDALONE,
  activeFilterCount,
  matchesValues,
  type FilterKey,
  type Filters,
} from "./filters";
import type { SegmentState } from "./shelves";

export type WishlistSegment = { number: number | null; state: SegmentState };

type Facets = {
  genres: string[];
  tropes: string[];
  linkLanguages: LinkLanguage[];
  linkKinds: LinkKind[];
};

export type WishlistSeriesRow = Facets & {
  type: "series";
  id: string;
  title: string;
  author?: string;
  status: SeriesStatus;
  desire: DesireLevel;
  coverUrl?: string;
  segments: WishlistSegment[];
};

export type WishlistBookRow = Facets & {
  type: "book";
  id: string;
  title: string;
  author: string;
  desire: DesireLevel;
  coverUrl?: string;
  format: Format;
};

export type WishlistRow = WishlistSeriesRow | WishlistBookRow;

export type WishlistGroupKey = "continue" | "newSeries" | "standalone";

export type WishlistGroup = { key: WishlistGroupKey; count: number; items: WishlistRow[] };

type WishlistResponse = { groups: WishlistGroup[] };

export const WISHLIST_KEY = "/api/wishlist";

export const WISHLIST_FILTER_KEYS: FilterKey[] = [
  "genre",
  "trope",
  "author",
  "status",
  "language",
  "kind",
];

export const NEXT_DESIRE: Record<DesireLevel, DesireLevel> = {
  high: "normal",
  normal: "someday",
  someday: "high",
};

const SETTLE_MS = 400;

export function wishlistValuesOf(row: WishlistRow, key: FilterKey): readonly string[] {
  switch (key) {
    case "genre":
      return row.genres;
    case "trope":
      return row.tropes;
    case "author":
      return row.author ? [row.author] : [];
    case "status":
      return row.type === "series" ? [row.status] : [STANDALONE];
    case "language":
      return row.linkLanguages;
    case "kind":
      return row.linkKinds;
    default:
      return [];
  }
}

export function matchesWishlistQuery(row: WishlistRow, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.title, row.author ?? ""].some((text) => text.toLowerCase().includes(needle));
}

export function narrowGroups(
  groups: WishlistGroup[],
  query: string,
  filters: Filters,
): WishlistGroup[] {
  if (query.trim() === "" && activeFilterCount(filters) === 0) return groups;

  return groups.map((group) => {
    const items = group.items.filter(
      (row) => matchesWishlistQuery(row, query) && matchesValues(row, wishlistValuesOf, filters),
    );
    return { ...group, count: items.length, items };
  });
}

export function rowsOf(groups: WishlistGroup[]) {
  return groups.flatMap((group) => group.items);
}

export function useWishlist() {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<WishlistResponse>(
    authStatus === "authenticated" ? WISHLIST_KEY : null,
    (path: string) => apiFetch<WishlistResponse>(path),
    { revalidateOnFocus: false },
  );

  return { groups: data?.groups ?? [], isLoading, error, reload: () => mutate() };
}

function pathOf(row: WishlistRow) {
  return row.type === "series" ? `/api/series/${row.id}` : `/api/books/${row.id}`;
}

function withDesire(data: WishlistResponse | undefined, row: WishlistRow, desire: DesireLevel) {
  if (!data) return data;
  return {
    groups: data.groups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.type === row.type && item.id === row.id ? { ...item, desire } : item,
      ),
    })),
  };
}

export function useDesire(row: WishlistRow, onFailure: (row: WishlistRow) => void) {
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState<DesireLevel | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waiting = useRef<DesireLevel | null>(null);
  const latest = useRef(0);
  const live = useRef({ row, onFailure, mutate });

  useEffect(() => {
    live.current = { row, onFailure, mutate };
  });

  const save = useCallback(async (desire: DesireLevel, keepalive: boolean) => {
    const { row: current } = live.current;
    latest.current += 1;
    const request = latest.current;

    try {
      await apiFetch(pathOf(current), {
        method: "PATCH",
        body: JSON.stringify({ desire }),
        keepalive,
      });
      if (request !== latest.current) return;
      await live.current.mutate(
        WISHLIST_KEY,
        (data: WishlistResponse | undefined) => withDesire(data, current, desire),
        { revalidate: false },
      );
      setPending((shown) => (shown === desire ? null : shown));
      await live.current.mutate((key) => isLibraryKey(key) && key !== WISHLIST_KEY);
    } catch {
      if (request !== latest.current) return;
      setPending(null);
      live.current.onFailure(current);
    }
  }, []);

  useEffect(
    () => () => {
      if (timer.current && waiting.current) {
        clearTimeout(timer.current);
        void save(waiting.current, true);
      }
    },
    [save],
  );

  const shown = pending ?? row.desire;

  function cycle(): DesireLevel {
    const next = NEXT_DESIRE[shown];
    setPending(next);
    waiting.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      waiting.current = null;
      void save(next, false);
    }, SETTLE_MS);
    return next;
  }

  return { desire: shown, cycle };
}
