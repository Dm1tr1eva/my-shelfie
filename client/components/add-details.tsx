"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import {
  SeriesPicker,
  type SeriesChoice,
  type SeriesPickerHandle,
} from "@/components/series-picker";
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
  const { series, isLoading: seriesLoading } = useSeriesList();
  const { updateBook } = useBookActions();
  const { createSeries, updateSeries } = useSeriesActions();

  const initialSeries = params.get("series") ?? book.seriesId;
  const initialNumber = params.get("number");
  const [choice, setChoice] = useState<SeriesChoice>({
    seriesId: initialSeries ?? undefined,
    seriesNumber: initialNumber ? Number(initialNumber) : book.seriesNumber,
  });
  const [pickedGenres, setPickedGenres] = useState<Genre[] | null>(null);
  const [pickedTropes, setPickedTropes] = useState<string[] | null>(null);
  const [rows, setRows] = useState<LinkRow[]>(
    book.links.length > 0 ? book.links : [{ language: "uk", url: "" }],
  );
  const [pending, setPending] = useState(false);
  const [newSeriesPending, setNewSeriesPending] = useState(false);
  const pickerRef = useRef<SeriesPickerHandle>(null);
  const [error, setError] = useState<string | null>(null);

  const tropeCounts = new Map<string, number>();
  for (const item of books) {
    for (const trope of item.tropes) tropeCounts.set(trope, (tropeCounts.get(trope) ?? 0) + 1);
  }
  const suggestions = [...tropeCounts].map(([name, count]) => ({ name, count }));

  const chosenSeries = series.find((item) => item.id === choice.seriesId);
  const seriesGenres = chosenSeries?.genres ?? [];
  const seriesTropes = chosenSeries?.tropes ?? [];
  const genres = pickedGenres ?? (book.genres.length > 0 ? book.genres : seriesGenres);
  const tropes = pickedTropes ?? (book.tropes.length > 0 ? book.tropes : seriesTropes);
  const wanted = book.ownership === "wanted";

  async function save() {
    setPending(true);
    setError(null);
    try {
      const created = await pickerRef.current?.createPending();
      const seriesId = created?.id ?? choice.seriesId;
      const seriesNumber = seriesId ? choice.seriesNumber : undefined;

      await updateBook(book.id, {
        genres,
        tropes,
        ...(wanted && { links: validLinks(rows) }),
        ...(seriesId !== book.seriesId && { seriesId: seriesId ?? null }),
        ...(seriesNumber !== book.seriesNumber && { seriesNumber: seriesNumber ?? null }),
      });
      if (seriesId) {
        const known = created ?? series.find((item) => item.id === seriesId);
        const same = (a: string[], b: string[]) =>
          a.length === b.length && a.every((value) => b.includes(value));

        if (!known || !same(genres, known.genres) || !same(tropes, known.tropes)) {
          await updateSeries(seriesId, { genres, tropes });
        }
      }
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

      {!seriesLoading && (
        <SeriesPicker
          series={series}
          books={books}
          currentBookId={book.id}
          value={choice}
          onChange={setChoice}
          onCreate={createSeries}
          suggestion={choice.seriesId ? undefined : { title: book.title, author: book.author }}
          onPendingChange={setNewSeriesPending}
          ref={pickerRef}
        />
      )}

      <GenreMultiSelect value={genres} onChange={setPickedGenres} />
      <TagInput
        label="Tropes"
        value={tropes}
        onChange={setPickedTropes}
        suggestions={suggestions}
      />
      {wanted && <ShopLinkEditor rows={rows} onChange={setRows} />}

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
          {pending
            ? "Saving..."
            : newSeriesPending
              ? "Save details & create series"
              : "Save details"}
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
