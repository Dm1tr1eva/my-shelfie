"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";

export type BookStatus = "want" | "reading" | "dropped" | "read";

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

export const STATUSES = Object.keys(STATUS_LABELS) as BookStatus[];

export type Book = {
  id: string;
  userId: string;
  title: string;
  author: string;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
  coverUrl?: string;
  description?: string;
  rating?: number;
  review?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type NewBook = Pick<Book, "title" | "author" | "status">;

export type BookChanges = Partial<{
  title: string;
  author: string;
  status: BookStatus;
  rating: number | null;
  review: string | null;
}>;

type BooksResponse = {
  books: Book[];
  total: number;
  page: number;
  limit: number;
};

const LIST_LIMIT = 100;

function booksKey(status: BookStatus | "all") {
  const query = status === "all" ? "" : `?status=${status}`;
  return `/api/books${query}${query ? "&" : "?"}limit=${LIST_LIMIT}`;
}

function bookKey(id: string) {
  return `/api/books/${id}`;
}

function isListKey(key: unknown) {
  return typeof key === "string" && key.startsWith("/api/books?");
}

export function useBooks(status: BookStatus | "all") {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<BooksResponse>(
    authStatus === "authenticated" ? booksKey(status) : null,
    (path: string) => apiFetch<BooksResponse>(path),
  );

  return {
    books: data?.books ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useBook(id: string) {
  const { status: authStatus } = useAuth();

  const { data, error, isLoading } = useSWR<Book>(
    authStatus === "authenticated" ? bookKey(id) : null,
    (path: string) => apiFetch<Book>(path),
  );

  return { book: data, error, isLoading };
}

export function useBookActions() {
  const { mutate } = useSWRConfig();

  const createBook = useCallback(
    async (book: NewBook) => {
      const created = await apiFetch<Book>("/api/books", {
        method: "POST",
        body: JSON.stringify(book),
      });
      await mutate(isListKey);
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
      await mutate(isListKey);
      return updated;
    },
    [mutate],
  );

  const deleteBook = useCallback(
    async (id: string) => {
      await apiFetch<void>(bookKey(id), { method: "DELETE" });
      await mutate(isListKey);
    },
    [mutate],
  );

  return { createBook, updateBook, deleteBook };
}
