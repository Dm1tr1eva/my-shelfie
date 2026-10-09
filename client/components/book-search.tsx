"use client";

import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { useBookSearch, type BookSearchResult } from "@/lib/book-search";

function describe(result: BookSearchResult) {
  return [result.authors.join(", "), result.year].filter(Boolean).join(" · ");
}

function messageFor(status: "idle" | "loading" | "failed" | "done", count: number) {
  if (status === "loading") return "Searching...";
  if (status === "failed")
    return "Search is unavailable right now. You can still add the book by hand.";
  if (status === "done" && count === 0) return "No books found.";
  return "";
}

export function BookSearch({ onPick }: { onPick: (result: BookSearchResult) => void }) {
  const [text, setText] = useState("");
  const { status, results } = useBookSearch(text);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span>Find a book</span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Title and author"
          className="field"
        />
      </label>

      <p role="status" className="text-sm text-muted">
        {messageFor(status, results.length)}
      </p>

      {results.length > 0 && (
        <ul>
          {results.map((result) => (
            <li key={result.volumeId} className="flex gap-3 border-b py-2">
              <BookCover url={result.coverUrl} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">{result.title}</span>
                <span className="text-sm text-muted">{describe(result)}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <button
                    type="button"
                    aria-label={`Use ${result.title}`}
                    onClick={() => onPick(result)}
                    className="link"
                  >
                    Use this book
                  </button>
                  {result.link && (
                    <a
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                    >
                      View on Google Books
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {status !== "idle" && (
        <div className="w-fit rounded-md bg-paper px-2 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- Google's attribution asset must be shown unaltered, so it is not optimised */}
          <img src="/powered-by-google.png" alt="Powered by Google" width={62} height={30} />
        </div>
      )}
    </div>
  );
}
