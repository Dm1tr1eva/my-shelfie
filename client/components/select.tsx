"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";

export type SelectOption = { value: string; label: string; short?: string };

export function Select({
  label,
  hideLabel = false,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}) {
  const labelId = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;

    function close(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openList();
      else setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={root} className={`relative flex flex-col gap-1 ${className}`}>
      {!hideLabel && (
        <span id={labelId} className="text-sm font-semibold">
          {label}
        </span>
      )}

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        {...(hideLabel ? { "aria-label": label } : { "aria-labelledby": labelId })}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="field flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{selected.short ?? selected.label}</span>
        <span className="shrink-0 text-muted">
          <ChevronDownIcon size={18} />
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute left-0 top-full z-30 mt-1 max-h-72 min-w-full overflow-auto rounded-card border border-mist bg-card py-1 shadow-pop"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => choose(index)}
              onMouseEnter={() => setActive(index)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 whitespace-nowrap px-3 ${
                index === active ? "bg-beige" : ""
              } ${option.value === value ? "font-semibold" : ""}`}
            >
              {option.label}
              {option.value === value && <CheckIcon size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
