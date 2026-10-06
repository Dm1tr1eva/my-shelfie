"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { STATUS_LABELS, STATUSES, useBookActions, type Book, type BookStatus } from "@/lib/books";

export function EditBookForm({ book, onDeleted }: { book: Book; onDeleted: () => void }) {
  const { updateBook, deleteBook } = useBookActions();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [status, setStatus] = useState<BookStatus>(book.status);
  const [rating, setRating] = useState(book.rating ? String(book.rating) : "");
  const [review, setReview] = useState(book.review ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      await updateBook(book.id, {
        title: title.trim(),
        author: author.trim(),
        status,
        rating: rating === "" ? null : Number(rating),
        review: review.trim() === "" ? null : review.trim(),
      });
      setMessage("Saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;

    setError(null);
    setPending(true);

    try {
      await deleteBook(book.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      aria-label="Edit book"
      className="flex flex-col gap-3 sm:max-w-lg"
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

      <label className="flex flex-col gap-1">
        <span>Rating</span>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {"★".repeat(value)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span>Review</span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={5}
          className="rounded border px-3 py-2"
        />
      </label>

      {error && <p className="text-red-600">{error}</p>}
      {message && <p className="text-green-700">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded border border-red-600 px-4 py-2 text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
