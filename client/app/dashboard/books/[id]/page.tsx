import type { Metadata } from "next";
import { BookEditor } from "@/components/book-editor";

export const metadata: Metadata = {
  title: "Edit book",
};

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookEditor id={id} />;
}
