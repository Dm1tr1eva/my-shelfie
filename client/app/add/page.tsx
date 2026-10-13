import type { Metadata } from "next";
import { Suspense } from "react";
import { AddBook } from "@/components/add-book";

export const metadata: Metadata = {
  title: "Add a book",
};

export default function AddPage() {
  return (
    <Suspense>
      <AddBook />
    </Suspense>
  );
}
