export function OwnProgress({
  ownedNumbers,
  ownedCount,
  total,
  onDark = false,
}: {
  ownedNumbers: number[];
  ownedCount: number;
  total: number;
  onDark?: boolean;
}) {
  const segments = Math.min(Math.max(total, 1), 40);
  const owned = new Set(ownedNumbers);
  const label =
    ownedNumbers.length > 0
      ? `Own ${ownedCount} of ${total}: books ${ownedNumbers.map((number) => `#${number}`).join(", ")}`
      : `Own ${ownedCount} of ${total}`;

  return (
    <div className="flex items-center gap-3">
      <div role="img" aria-label={label} className="flex flex-1 gap-1">
        {Array.from({ length: segments }, (_, index) => {
          const number = index + 1;
          const filled = owned.has(number);
          const empty = onDark ? "bg-mist/30" : "bg-mist";
          const full = onDark ? "bg-beige" : "bg-burgundy";
          return (
            <span key={number} className={`h-2 flex-1 rounded-full ${filled ? full : empty}`} />
          );
        })}
      </div>
      <span
        className={`whitespace-nowrap text-sm font-semibold ${onDark ? "text-page" : "text-ink"}`}
      >
        Own {ownedCount} of {total}
      </span>
    </div>
  );
}
