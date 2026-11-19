"use client";

import { useT } from "@/lib/i18n";

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
  const t = useT();
  const segments = Math.min(Math.max(total, 1), 40);
  const owned = new Set(ownedNumbers);
  const counts = { owned: ownedCount, total };
  const label =
    ownedNumbers.length > 0
      ? t("library.progress.ownWithBooks", {
          ...counts,
          numbers: ownedNumbers.map((number) => `#${number}`).join(", "),
        })
      : t("library.progress.own", counts);

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
        {t("library.progress.own", counts)}
      </span>
    </div>
  );
}
