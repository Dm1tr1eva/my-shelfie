"use client";

import type { BookStatus } from "@/lib/books";
import { useDomain } from "@/lib/i18n/domain";

export function StatusChip({ status }: { status: BookStatus }) {
  const domain = useDomain();

  return <span className={`chip chip-${status}`}>{domain.status(status)}</span>;
}
