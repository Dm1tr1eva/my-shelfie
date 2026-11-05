"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GenreChip } from "@/components/chips";
import { ChevronDownIcon } from "@/components/icons";
import { MAX_GENRE_LENGTH, MAX_GENRES, useBooks, type Genre } from "@/lib/books";
import { knownGenres } from "@/lib/genres";
import { useSeriesList } from "@/lib/series";

export function GenreMultiSelect({
  value,
  onChange,
}: {
  value: Genre[];
  onChange: (genres: Genre[]) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [already, setAlready] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { books } = useBooks();
  const { series } = useSeriesList();

  const options = knownGenres(books, series, value);
  const full = value.length >= MAX_GENRES;
  const has = (name: Genre) => value.some((item) => item.toLowerCase() === name.toLowerCase());

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

  function addOwn() {
    const name = text.trim();
    if (!name || full) return;

    const existing = options.find((option) => option.toLowerCase() === name.toLowerCase());
    const chosen = existing ?? name;

    if (has(chosen)) {
      setAlready(true);
      return;
    }

    onChange([...value, chosen]);
    setText("");
    setAlready(false);
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
          className="absolute left-0 right-0 top-full z-20 mt-1 flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-card border border-mist bg-card p-3 shadow-pop"
        >
          <div className="flex flex-col gap-1 border-b border-mist pb-3">
            <div className="flex gap-2">
              <input
                aria-label="Add your own genre"
                placeholder="Add your own genre"
                maxLength={MAX_GENRE_LENGTH}
                disabled={full}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setAlready(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOwn();
                  }
                }}
                aria-invalid={already}
                className="field min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={addOwn}
                disabled={full || text.trim() === ""}
                className="btn-outline"
              >
                Add
              </button>
            </div>
            {already && (
              <p role="status" className="text-sm font-semibold text-burgundy">
                Already added
              </p>
            )}
            {full && (
              <p role="status" className="text-sm font-semibold text-burgundy">
                Up to {MAX_GENRES} genres.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {options.map((genre) => (
              <label key={genre} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={value.includes(genre)}
                  disabled={full && !value.includes(genre)}
                  onChange={() => toggle(genre)}
                  className="h-5 w-5 accent-burgundy"
                />
                {genre}
              </label>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted">Pick from the list or add your own.</p>
    </div>
  );
}
