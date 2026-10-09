"use client";

import { useState } from "react";

export type ViewMode = "list" | "grid";

const STORAGE_KEY = "my-shelfie:view";

function readStoredMode(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>(() =>
    typeof window === "undefined" ? "list" : readStoredMode(),
  );

  function changeMode(next: ViewMode) {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  }

  return { mode, changeMode };
}
