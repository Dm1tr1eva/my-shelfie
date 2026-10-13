const BARS: { width: number; height: number; className: string; label?: string }[] = [
  { width: 40, height: 230, className: "bg-burgundy" },
  {
    width: 44,
    height: 248,
    className: "border-2 border-dashed border-beige",
    label: "#2",
  },
  { width: 40, height: 236, className: "bg-burgundy" },
  { width: 42, height: 240, className: "bg-burgundy opacity-45" },
  { width: 34, height: 196, className: "bg-mist" },
  { width: 36, height: 206, className: "bg-mist" },
  { width: 34, height: 214, className: "bg-mist" },
];

export function HeroShelf() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="flex h-[300px] items-end gap-[5px] px-3">
        {BARS.map((bar, index) => (
          <div
            key={index}
            style={{ width: bar.width, height: bar.height }}
            className={`flex items-center justify-center rounded-[3px_5px_5px_3px] ${bar.className} ${
              index === 3 ? "mr-[18px]" : ""
            }`}
          >
            {bar.label && (
              <span className="font-serif text-lg text-beige [writing-mode:vertical-rl]">
                {bar.label}
              </span>
            )}
          </div>
        ))}
        <div
          style={{ width: 46, height: 180 }}
          className="ml-8 origin-bottom-left -rotate-[10deg] rounded-[3px_5px_5px_3px] bg-beige"
        />
      </div>
      <div className="h-4 rounded-t-[3px] bg-slate" />
    </div>
  );
}
