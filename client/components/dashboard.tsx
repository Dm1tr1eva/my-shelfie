"use client";

import { useState } from "react";
import { AddBookForm } from "@/components/add-book-form";
import { BookGrid } from "@/components/book-grid";
import { BookRow } from "@/components/book-row";
import { CurrentlyReading } from "@/components/currently-reading";
import { StatsCards } from "@/components/stats-cards";
import { ViewToggle } from "@/components/view-toggle";
import { computeStats } from "@/lib/book-stats";
import { STATUS_LABELS, STATUSES, useBooks, type BookStatus } from "@/lib/books";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useViewMode } from "@/lib/use-view-mode";

const FILTERS: { value: BookStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
];

export function Dashboard() {
  const { user, status } = useRequireAuth();
  const [filter, setFilter] = useState<BookStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const { mode, changeMode } = useViewMode();
  const { books, isLoading, error } = useBooks("all");

  if (status !== "authenticated" || !user) {
    return null;
  }

  const visible = filter === "all" ? books : books.filter((book) => book.status === filter);
  const reading = books.filter((book) => book.status === "reading");
  const loaded = !isLoading && !error;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">My shelf</h1>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            Add a book
          </button>
        )}
      </div>

      {adding && <AddBookForm onDone={() => setAdding(false)} />}

      {loaded && books.length > 0 && <StatsCards stats={computeStats(books)} />}
      {loaded && <CurrentlyReading books={reading} />}

      <section aria-labelledby="library-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="library-heading" className="text-xl">
            Library
          </h2>
          <ViewToggle mode={mode} onChange={changeMode} />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`chip border ${
                filter === f.value
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border-strong hover:bg-surface-alt"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && <p>Loading your books...</p>}
        {error && <p className="text-danger">Could not load your books.</p>}
        {loaded && visible.length === 0 && <p className="text-muted">No books here yet.</p>}

        {loaded && visible.length > 0 && mode === "grid" && <BookGrid books={visible} />}
        {loaded && visible.length > 0 && mode === "list" && (
          <ul>
            {visible.map((book) => (
              <BookRow key={book.id} book={book} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
