"use client";

import { useState } from "react";
import { BookSearch } from "@/components/book-search";
import { ApiError } from "@/lib/api";
import { type BookSearchResult } from "@/lib/book-search";
import { STATUS_LABELS, STATUSES, useBookActions, type BookStatus } from "@/lib/books";

type PickedSource = { googleVolumeId: string; coverUrl?: string };

export function AddBookForm({ onDone }: { onDone: () => void }) {
  const { createBook } = useBookActions();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<BookStatus>("want");
  const [picked, setPicked] = useState<PickedSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handlePick(result: BookSearchResult) {
    setTitle(result.title);
    setAuthor(result.authors.join(", "));
    setPicked({ googleVolumeId: result.volumeId, coverUrl: result.coverUrl });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await createBook({
        title: title.trim(),
        author: author.trim(),
        status,
        ...(picked && { googleVolumeId: picked.googleVolumeId }),
        ...(picked?.coverUrl && { coverUrl: picked.coverUrl }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-4 sm:max-w-md">
      <BookSearch onPick={handlePick} />

      <form onSubmit={handleSubmit} aria-label="Add a book" className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span>Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>Author</span>
          <input
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="field"
          />
        </label>

        {picked && (
          <p className="text-sm text-muted">
            Filled in from Google Books. You can edit the title and author.
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BookStatus)}
            className="field"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-danger">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Adding..." : "Add book"}
          </button>
          <button type="button" onClick={onDone} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
