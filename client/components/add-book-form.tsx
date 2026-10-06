"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { STATUS_LABELS, STATUSES, useBookActions, type BookStatus } from "@/lib/books";

export function AddBookForm({ onDone }: { onDone: () => void }) {
  const { createBook } = useBookActions();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<BookStatus>("want");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await createBook({ title: title.trim(), author: author.trim(), status });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Add a book"
      className="flex flex-col gap-3 rounded border p-4 sm:max-w-md"
    >
      <label className="flex flex-col gap-1">
        <span>Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Author</span>
        <input
          required
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BookStatus)}
          className="rounded border px-3 py-2"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add book"}
        </button>
        <button type="button" onClick={onDone} className="rounded border px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
