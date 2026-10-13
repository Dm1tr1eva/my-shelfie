"use client";

import { useId, useState } from "react";
import { TropeChip } from "@/components/chips";
import { XIcon } from "@/components/icons";

export type TagSuggestion = { name: string; count: number };

type Option = { kind: "existing"; name: string; count: number } | { kind: "create"; name: string };

export function TagInput({
  label,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: TagSuggestion[];
}) {
  const inputId = useId();
  const listId = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const typed = text.trim();
  const taken = new Set(value.map((tag) => tag.toLowerCase()));
  const options: Option[] = suggestions
    .filter(
      (item) =>
        !taken.has(item.name.toLowerCase()) &&
        item.name.toLowerCase().includes(typed.toLowerCase()),
    )
    .slice(0, 6)
    .map((item) => ({ kind: "existing" as const, name: item.name, count: item.count }));

  const exact =
    typed === "" ||
    taken.has(typed.toLowerCase()) ||
    suggestions.some((item) => item.name.toLowerCase() === typed.toLowerCase());
  if (!exact) options.push({ kind: "create", name: typed });

  function add(name: string) {
    const clean = name.trim();
    if (clean && !taken.has(clean.toLowerCase())) {
      onChange([...value, clean]);
    }
    setText("");
    setActive(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const chosen = open && options[active] ? options[active].name : typed;
      add(chosen);
    } else if (event.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && options.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-semibold">
        {label}
      </label>

      <div className="relative">
        <div className="field flex flex-wrap items-center gap-2 py-1.5">
          {value.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1">
              <TropeChip trope={tag} />
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-beige"
              >
                <XIcon size={14} />
              </button>
            </span>
          ))}
          <input
            id={inputId}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            className="min-w-24 flex-1 bg-transparent py-1 outline-none"
          />
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-card border border-mist bg-card shadow-pop"
          >
            {options.map((option, index) => (
              <li
                key={`${option.kind}-${option.name}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(option.name);
                }}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 ${
                  index === active ? "bg-beige" : ""
                }`}
              >
                {option.kind === "create" ? (
                  <span>Create “{option.name}”</span>
                ) : (
                  <>
                    <span>{option.name}</span>
                    <span className="text-sm text-muted">
                      used in {option.count} {option.count === 1 ? "book" : "books"}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-sm text-muted">Free text. Enter or comma adds a tag.</p>
    </div>
  );
}
