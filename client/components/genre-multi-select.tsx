"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GenreChip } from "@/components/chips";
import { ChevronDownIcon } from "@/components/icons";
import { GENRES, type Genre } from "@/lib/books";

export function GenreMultiSelect({
  value,
  onChange,
}: {
  value: Genre[];
  onChange: (genres: Genre[]) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function toggle(genre: Genre) {
    onChange(value.includes(genre) ? value.filter((item) => item !== genre) : [...value, genre]);
  }

  return (
    <div ref={root} className="relative flex flex-col gap-1">
      <span className="font-semibold">Genres</span>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="field flex flex-wrap items-center gap-2 py-1.5 text-left"
      >
        {value.length === 0 ? (
          <span className="text-muted">Choose genres</span>
        ) : (
          value.map((genre) => <GenreChip key={genre} genre={genre} />)
        )}
        <span className="ml-auto text-muted">
          <ChevronDownIcon size={18} />
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Genres"
          className="absolute left-0 right-0 top-full z-20 mt-1 grid grid-cols-1 gap-x-4 rounded-card border border-mist bg-card p-3 shadow-pop sm:grid-cols-2"
        >
          {GENRES.map((genre) => (
            <label key={genre} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={value.includes(genre)}
                onChange={() => toggle(genre)}
                className="h-5 w-5 accent-burgundy"
              />
              {genre}
            </label>
          ))}
        </div>
      )}

      <p className="text-sm text-muted">Pick from the fixed list.</p>
    </div>
  );
}
