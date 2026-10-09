const SPINES = [
  { height: "h-28", width: "w-5", color: "bg-read" },
  { height: "h-36", width: "w-7", color: "bg-reading" },
  { height: "h-24", width: "w-4", color: "bg-border-strong" },
  { height: "h-32", width: "w-6", color: "bg-want" },
  { height: "h-40", width: "w-5", color: "bg-foreground" },
  { height: "h-28", width: "w-8", color: "bg-dropped" },
  { height: "h-36", width: "w-5", color: "bg-read" },
  { height: "h-24", width: "w-6", color: "bg-reading" },
  { height: "h-32", width: "w-4", color: "bg-want" },
  { height: "h-28", width: "w-7", color: "bg-border-strong" },
];

export function BookSpines() {
  return (
    <div
      aria-hidden="true"
      className="flex max-w-md items-end gap-1 border-b-4 border-border-strong px-3"
    >
      {SPINES.map((spine, index) => (
        <span
          key={index}
          className={`${spine.height} ${spine.width} ${spine.color} rounded-t-sm border border-border`}
        />
      ))}
    </div>
  );
}
