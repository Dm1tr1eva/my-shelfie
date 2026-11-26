import { BookPanel } from "@/components/book-panel";

export default async function BookPanelOverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookPanel id={id} closeBy="back" />;
}
