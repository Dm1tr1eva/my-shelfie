import type { Metadata } from "next";
import { Suspense } from "react";
import { BookPanel } from "@/components/book-panel";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Book",
};

export default async function BookRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Suspense>
        <Library />
      </Suspense>
      <BookPanel id={id} closeBy="library" />
    </>
  );
}
