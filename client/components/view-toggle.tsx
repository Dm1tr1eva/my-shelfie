import type { ViewMode } from "@/lib/use-view-mode";

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "list", label: "List" },
  { value: "grid", label: "Grid" },
];

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className="flex rounded-lg border border-border-strong p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1 text-sm ${
            mode === option.value ? "bg-accent text-accent-foreground" : "hover:bg-surface-alt"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
