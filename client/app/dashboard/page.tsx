"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddBookForm } from "@/components/add-book-form";
import { STATUS_LABELS, STATUSES, useBooks, type Book, type BookStatus } from "@/lib/books";
import { useRequireAuth } from "@/lib/use-require-auth";

const FILTERS: { value: BookStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
];

function BookRow({ book }: { book: Book }) {
  return (
    <li className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href={`/dashboard/books/${book.id}`} className="font-medium underline-offset-2 hover:underline">
          {book.title}
        </Link>
        <p className="text-sm text-neutral-500">{book.author}</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {book.rating && <span aria-label={`Rated ${book.rating} out of 5`}>{"★".repeat(book.rating)}</span>}
        <span className="rounded-full border px-2 py-0.5">{STATUS_LABELS[book.status]}</span>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, status, logout } = useRequireAuth();
  const [filter, setFilter] = useState<BookStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const { books, isLoading, error } = useBooks(filter);

  if (status !== "authenticated" || !user) {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
        <button onClick={handleLogout} className="rounded border px-4 py-2">
          Log out
        </button>
      </div>

      {adding ? (
        <AddBookForm onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-fit rounded bg-black px-4 py-2 text-white"
        >
          Add a book
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f.value ? "bg-black text-white" : ""
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p>Loading your books...</p>}
      {error && <p className="text-red-600">Could not load your books.</p>}
      {!isLoading && !error && books.length === 0 && (
        <p className="text-neutral-500">No books here yet.</p>
      )}

      {!isLoading && !error && books.length > 0 && (
        <ul>
          {books.map((book) => (
            <BookRow key={book.id} book={book} />
          ))}
        </ul>
      )}
    </main>
  );
}
