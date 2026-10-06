"use client";

import useSWR from "swr";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";

export type BookStatus = "want" | "reading" | "dropped" | "read";

// Mirrors the backend DTO exactly (server/dto/bookDto.js) — an unset
// optional field is absent from the object, not null.
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

type BooksResponse = {
  books: Book[];
  total: number;
  page: number;
  limit: number;
};

// No pagination UI yet, so a large explicit limit stands in for one — see
// docs/designs/book-list.md's trade-offs. Revisit with real pager controls
// once a list can realistically exceed this.
const LIST_LIMIT = 100;

function booksKey(status: BookStatus | "all") {
  const query = status === "all" ? "" : `?status=${status}`;
  return `/api/books${query}${query ? "&" : "?"}limit=${LIST_LIMIT}`;
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
