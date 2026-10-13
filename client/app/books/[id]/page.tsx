import type { Metadata } from "next";
import { BookPage } from "@/components/book-page";

export const metadata: Metadata = {
  title: "Book",
};

export default async function BookRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookPage id={id} />;
}
