"use client";

import type { DesireLevel } from "@/lib/catalogue-constants";
import { useT } from "@/lib/i18n";

const LOOKS: Record<DesireLevel, { pill: string; dot: string }> = {
  high: { pill: "border-burgundy bg-burgundy text-card", dot: "bg-card" },
  normal: { pill: "border-burgundy bg-transparent text-burgundy", dot: "bg-burgundy" },
  someday: { pill: "border-mist bg-transparent text-muted", dot: "bg-mist" },
};

export function DesirePill({ desire, onCycle }: { desire: DesireLevel; onCycle: () => void }) {
  const t = useT();
  const level = t(`wishlist.desire.${desire}`);
  const look = LOOKS[desire];

  return (
    <button
      type="button"
      data-desire={desire}
      aria-label={t("wishlist.desire.label", { level })}
      onClick={onCycle}
      className="group inline-flex min-h-11 items-center"
    >
      <span
        className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border pl-2 pr-2.5 text-xs font-semibold md:h-[30px] md:pl-2.5 md:pr-3 md:text-[13px] ${look.pill}`}
      >
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${look.dot}`} />
        {level}
      </span>
    </button>
  );
}
