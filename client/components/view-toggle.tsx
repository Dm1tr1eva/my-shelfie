import { GridIcon, ListIcon } from "@/components/icons";
import type { ViewMode } from "@/lib/use-view-mode";

const OPTIONS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "grid", label: "Grid", icon: <GridIcon size={18} /> },
  { value: "list", label: "List", icon: <ListIcon size={18} /> },
];

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div role="group" aria-label="View" className="flex rounded-control border border-field p-0.5">
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
          {option.label}
        </button>
      ))}
    </div>
  );
}
