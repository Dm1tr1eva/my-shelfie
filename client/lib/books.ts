"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";

export type Ownership = "owned" | "wanted";
export type BookStatus = "want" | "reading" | "dropped" | "read";
export type LinkLanguage = "ru" | "uk" | "en" | "other";

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "To read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

export const STATUSES = Object.keys(STATUS_LABELS) as BookStatus[];

export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  owned: "In my library",
  wanted: "Wishlist",
};

export const LINK_LANGUAGES: { value: LinkLanguage; badge: string; name: string }[] = [
  { value: "ru", badge: "RU", name: "Russian" },
  { value: "uk", badge: "UK", name: "Ukrainian" },
  { value: "en", badge: "EN", name: "English" },
  { value: "other", badge: "OTH", name: "Other" },
];

export const LINK_LANGUAGE_OPTIONS = LINK_LANGUAGES.map((language) => ({
  value: language.value,
  label: `${language.badge} · ${language.name}`,
  short: language.badge,
}));

export const GENRES = [
  "Fantasy",
  "Romantasy",
  "Romance",
  "Science fiction",
  "Mystery & thriller",
  "Horror",
  "Historical fiction",
  "Contemporary fiction",
  "Classics",
  "Young adult",
  "Non-fiction",
  "Poetry",
] as const;

export type Genre = (typeof GENRES)[number];

export type ShopLink = { language: LinkLanguage; url: string };

export type Book = {
  id: string;
  userId: string;
  title: string;
  author: string;
  status: BookStatus;
  ownership: Ownership;
  genres: Genre[];
  tropes: string[];
  links: ShopLink[];
  createdAt: string;
  updatedAt: string;
  seriesId?: string;
  seriesNumber?: number;
  coverUrl?: string;
  googleVolumeId?: string;
  description?: string;
  notes?: string;
  annotation?: string;
  rating?: number;
  review?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type NewBook = {
  title: string;
  author: string;
  ownership?: Ownership;
  status?: BookStatus;
  coverUrl?: string;
  googleVolumeId?: string;
  seriesId?: string;
  seriesNumber?: number;
  genres?: Genre[];
  tropes?: string[];
  links?: ShopLink[];
  notes?: string;
  annotation?: string;
};

export type BookChanges = Partial<{
  title: string;
  author: string;
  status: BookStatus;
  ownership: Ownership;
  rating: number | null;
  review: string | null;
  seriesId: string | null;
  seriesNumber: number | null;
  genres: Genre[];
  tropes: string[];
  links: ShopLink[];
  notes: string | null;
  annotation: string | null;
}>;

type BooksResponse = {
  books: Book[];
  total: number;
  page: number;
  limit: number;
};

const LIST_LIMIT = 500;
const LIBRARY_KEY = /^\/api\/(books|series|next-to-buy|tropes)(\/|\?|$)/;

export function isLibraryKey(key: unknown) {
  return typeof key === "string" && LIBRARY_KEY.test(key);
}

function bookKey(id: string) {
  return `/api/books/${id}`;
}

export function useBooks() {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<BooksResponse>(
    authStatus === "authenticated" ? `/api/books?limit=${LIST_LIMIT}` : null,
    (path: string) => apiFetch<BooksResponse>(path),
  );

  return {
    books: data?.books ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    reload: () => mutate(),
  };
}

export function useBook(id: string) {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<Book>(
    authStatus === "authenticated" ? bookKey(id) : null,
    (path: string) => apiFetch<Book>(path),
  );

  return { book: data, error, isLoading, reload: () => mutate() };
}

export function useBookActions() {
  const { mutate } = useSWRConfig();

  const createBook = useCallback(
    async (book: NewBook) => {
      const created = await apiFetch<Book>("/api/books", {
        method: "POST",
        body: JSON.stringify(book),
      });
      await mutate(isLibraryKey);
      return created;
    },
    [mutate],
  );

  const updateBook = useCallback(
    async (id: string, changes: BookChanges) => {
      const updated = await apiFetch<Book>(bookKey(id), {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      await mutate(bookKey(id), updated, { revalidate: false });
      await mutate((key) => isLibraryKey(key) && key !== bookKey(id));
      return updated;
    },
    [mutate],
  );

  const deleteBook = useCallback(
    async (id: string) => {
      await apiFetch<void>(bookKey(id), { method: "DELETE" });
      await mutate((key) => isLibraryKey(key) && key !== bookKey(id));
    },
    [mutate],
  );

  return { createBook, updateBook, deleteBook };
}
