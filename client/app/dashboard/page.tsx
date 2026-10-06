"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useBooks, type Book, type BookStatus } from "@/lib/books";

const STATUS_LABELS: Record<BookStatus, string> = {
  want: "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

const FILTERS: { value: BookStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "want", label: STATUS_LABELS.want },
  { value: "reading", label: STATUS_LABELS.reading },
  { value: "read", label: STATUS_LABELS.read },
  { value: "dropped", label: STATUS_LABELS.dropped },
];

function BookRow({ book }: { book: Book }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b py-3">
      <div>
        <p className="font-medium">{book.title}</p>
        <p className="text-sm text-neutral-500">{book.author}</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {book.rating && <span>{"★".repeat(book.rating)}</span>}
        <span className="rounded-full border px-2 py-0.5">{STATUS_LABELS[book.status]}</span>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [filter, setFilter] = useState<BookStatus | "all">("all");
  const { books, isLoading, error } = useBooks(filter);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    // Covers "loading" (session check in flight) and "anonymous" (the
    // redirect above is about to fire) with the same empty state — there is
    // nothing meaningful to render in either case, and the server API
    // enforces auth regardless of what this page shows.
    return null;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
        <button onClick={handleLogout} className="rounded border px-4 py-2">
          Log out
        </button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
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
