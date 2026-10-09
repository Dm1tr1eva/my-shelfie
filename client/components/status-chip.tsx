import { STATUS_LABELS, type BookStatus } from "@/lib/books";

export function StatusChip({ status }: { status: BookStatus }) {
  return <span className={`chip chip-${status}`}>{STATUS_LABELS[status]}</span>;
}
