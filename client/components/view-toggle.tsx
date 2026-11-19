"use client";

import { GridIcon, ListIcon } from "@/components/icons";
import { useT, type MessageKey } from "@/lib/i18n";
import type { ViewMode } from "@/lib/use-view-mode";

const OPTIONS: { value: ViewMode; label: MessageKey; icon: React.ReactNode }[] = [
  { value: "grid", label: "library.view.grid", icon: <GridIcon size={18} /> },
  { value: "list", label: "library.view.list", icon: <ListIcon size={18} /> },
];

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t("library.view.label")}
      className="flex rounded-control border border-field p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-[6px] px-3 text-sm font-semibold ${
            mode === option.value ? "bg-navy text-page" : "hover:bg-beige"
          }`}
        >
          {option.icon}
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}
