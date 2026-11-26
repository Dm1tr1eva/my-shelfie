"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FilterKey } from "./filters";
import { readLibraryParams, writeLibraryParams, type LibraryParams } from "./library-params";

export function useAddressParams(keys?: FilterKey[]) {
  const searchParams = useSearchParams();
  const [params, setParams] = useState<LibraryParams>(() => readLibraryParams(searchParams, keys));

  function show(next: LibraryParams) {
    setParams(next);
    const search = writeLibraryParams(next.query, next.filters);
    window.history.replaceState(
      null,
      "",
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }

  return [params, show] as const;
}
