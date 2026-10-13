"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import { SeriesPicker, type SeriesChoice } from "@/components/series-picker";
import { ShopLinkEditor, validLinks, type LinkRow } from "@/components/shop-link-editor";
import { TagInput } from "@/components/tag-input";
import { ApiError } from "@/lib/api";
import { useBook, useBookActions, useBooks, type Book, type Genre } from "@/lib/books";
import { useSeriesActions, useSeriesList } from "@/lib/series";
import { useRequireAuth } from "@/lib/use-require-auth";

function DetailsForm({ book }: { book: Book }) {
  const router = useRouter();
  const params = useSearchParams();
  const { books } = useBooks();
  const { series } = useSeriesList();
  const { updateBook } = useBookActions();
  const { createSeries } = useSeriesActions();

  const initialSeries = params.get("series") ?? book.seriesId;
  const initialNumber = params.get("number");
  const [choice, setChoice] = useState<SeriesChoice>({
    seriesId: initialSeries ?? undefined,
    seriesNumber: initialNumber ? Number(initialNumber) : book.seriesNumber,
  });
  const [pickedGenres, setPickedGenres] = useState<Genre[] | null>(null);
  const [tropes, setTropes] = useState<string[]>(book.tropes);
  const [rows, setRows] = useState<LinkRow[]>(
    book.links.length > 0 ? book.links : [{ language: "uk", url: "" }],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tropeCounts = new Map<string, number>();
  for (const item of books) {
    for (const trope of item.tropes) tropeCounts.set(trope, (tropeCounts.get(trope) ?? 0) + 1);
  }
  const suggestions = [...tropeCounts].map(([name, count]) => ({ name, count }));

  const seriesGenres = [
    ...new Set(
      books
        .filter((item) => item.seriesId === choice.seriesId && item.id !== book.id)
        .flatMap((item) => item.genres),
    ),
  ] as Genre[];
  const genres = pickedGenres ?? (book.genres.length > 0 ? book.genres : seriesGenres);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await updateBook(book.id, {
        genres,
        tropes,
        links: validLinks(rows),
        ...(choice.seriesId !== book.seriesId && { seriesId: choice.seriesId ?? null }),
        ...(choice.seriesNumber !== book.seriesNumber && {
          seriesNumber: choice.seriesNumber ?? null,
        }),
      });
      router.push("/library");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex items-center gap-4 p-4">
        <BookCover url={book.coverUrl} title={book.title} size="md" />
        <div className="min-w-0">
          <p className="font-serif text-xl font-semibold">{book.title}</p>
          <p className="text-muted">{book.author}</p>
          <p className="mt-1 text-sm font-semibold text-burgundy">
            Added to {book.ownership === "owned" ? "library" : "wishlist"}
          </p>
        </div>
      </div>

      <SeriesPicker
        series={series}
        books={books}
        currentBookId={book.id}
        value={choice}
        onChange={setChoice}
        onCreate={createSeries}
      />

      <GenreMultiSelect value={genres} onChange={setPickedGenres} />
      <TagInput label="Tropes" value={tropes} onChange={setTropes} suggestions={suggestions} />
      <ShopLinkEditor rows={rows} onChange={setRows} />

      {error && (
        <p role="alert" className="font-semibold text-burgundy">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => router.push("/library")} className="btn-outline">
          Skip for now
        </button>
        <button type="button" onClick={save} disabled={pending} className="btn-primary">
          {pending ? "Saving..." : "Save details"}
        </button>
      </div>
    </div>
  );
}

export function AddDetails({ id }: { id: string }) {
  const { user, status } = useRequireAuth();
  const { book, error, isLoading } = useBook(id);

  if (status !== "authenticated" || !user) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">Add a book</h1>
      <ol className="flex items-center gap-4 text-sm font-semibold">
        <li className="text-muted">Find it</li>
        <li aria-hidden="true" className="h-px w-8 bg-field" />
        <li aria-current="step" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-page">
            2
          </span>
          Details <span className="font-normal text-muted">(optional)</span>
        </li>
      </ol>

      {isLoading && (
        <p role="status" aria-busy="true">
          Loading...
        </p>
      )}
      {error && (
        <p role="alert" className="text-burgundy">
          Could not load this book.
        </p>
      )}
      {book && <DetailsForm key={book.id} book={book} />}
    </main>
  );
}
