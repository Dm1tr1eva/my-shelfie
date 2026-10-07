"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditBookForm } from "@/components/edit-book-form";
import { ApiError } from "@/lib/api";
import { useBook } from "@/lib/books";
import { useRequireAuth } from "@/lib/use-require-auth";

export function BookEditor({ id }: { id: string }) {
  const router = useRouter();
  const { user, status } = useRequireAuth();
  const { book, error, isLoading } = useBook(id);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <Link href="/dashboard" className="w-fit underline-offset-2 hover:underline">
        ← Back to my shelf
      </Link>

      {isLoading && <p>Loading...</p>}
      {notFound && <p>Book not found.</p>}
      {error && !notFound && <p className="text-red-600">Could not load this book.</p>}

      {book && (
        <>
          <h1 className="text-xl font-semibold">{book.title}</h1>
          <EditBookForm key={book.id} book={book} onDeleted={() => router.push("/dashboard")} />
        </>
      )}
    </main>
  );
}
