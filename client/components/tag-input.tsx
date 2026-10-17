"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { XIcon } from "@/components/icons";

export type TagSuggestion = { name: string; count: number };

type Option = { kind: "existing"; name: string; count: number } | { kind: "create"; name: string };

const MAX_LENGTH = 60;
const MAX_TAGS = 30;
const SHOW_COUNTER_FROM = MAX_LENGTH - 10;

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
  const field = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const typed = text.trim();
  const taken = new Set(value.map((tag) => tag.toLowerCase()));
  const duplicate =
    typed === "" ? undefined : value.find((tag) => tag.toLowerCase() === typed.toLowerCase());
  const full = value.length >= MAX_TAGS;

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

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    if (element.scrollHeight > 0) element.style.height = `${element.scrollHeight}px`;
  }, [text]);

  function add(name: string) {
    const clean = name.trim();
    if (!clean || taken.has(clean.toLowerCase()) || full) return;

    onChange([...value, clean]);
    setText("");
    setActive(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
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

  const showList = open && options.length > 0 && !full;
  const remaining = MAX_LENGTH - text.length;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-semibold">
        {label}
      </label>

      <div className="relative">
        <div className="field flex flex-wrap items-center gap-2 py-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className={`chip gap-2 border border-slate bg-card py-0.5 pr-1 text-ink ${
                tag === duplicate ? "ring-2 ring-burgundy ring-offset-2 ring-offset-card" : ""
              }`}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-beige hover:bg-mist"
              >
                <XIcon size={12} />
              </button>
            </span>
          ))}
          <textarea
            ref={field}
            id={inputId}
            rows={1}
            maxLength={MAX_LENGTH}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            aria-invalid={duplicate !== undefined}
            value={text}
            onChange={(event) => {
              setText(event.target.value.replace(/\s*\n\s*/g, " "));
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            className={`resize-none overflow-hidden bg-transparent py-1 leading-snug outline-none ${
              text.length > 14 ? "basis-full" : "min-w-24 flex-1"
            }`}
          />
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
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

      {duplicate !== undefined ? (
        <p role="status" className="text-sm font-semibold text-burgundy">
          Already added
        </p>
      ) : full ? (
        <p role="status" className="text-sm font-semibold text-burgundy">
          A book can have up to {MAX_TAGS} tropes.
        </p>
      ) : text.length >= SHOW_COUNTER_FROM ? (
        <p role="status" className="text-sm text-muted">
          {remaining} {remaining === 1 ? "character" : "characters"} left
        </p>
      ) : (
        <p className="text-sm text-muted">Free text. Enter or comma adds a tag.</p>
      )}
    </div>
  );
}
