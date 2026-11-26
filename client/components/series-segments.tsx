"use client";

import { useT } from "@/lib/i18n";
import type { SegmentState } from "@/lib/shelves";

const MAX_SEGMENTS = 10;

const SEGMENT_COLORS: Record<SegmentState, string> = {
  owned: "bg-burgundy",
  wanted: "bg-slate",
  missing: "bg-mist",
};

const CARD_COLORS: Record<SegmentState, string> = {
  owned: "bg-beige",
  wanted: "bg-slate",
  missing: "bg-page/25",
};

export function SeriesSegments({
  states,
  card = false,
}: {
  states: SegmentState[];
  card?: boolean;
}) {
  const t = useT();
  const owned = states.filter((state) => state === "owned").length;
  const shown = states.slice(0, MAX_SEGMENTS);
  const rest = states.length - shown.length;

  return (
    <span
      role="img"
      aria-label={t("library.progress.own", { owned, total: states.length })}
      className={`items-center gap-[3px] ${card ? "flex min-w-0 flex-1" : "inline-flex shrink-0"}`}
    >
      {shown.map((state, index) => (
        <span
          key={index}
          data-state={state}
          className={
            card
              ? `h-1.5 min-w-2 max-w-10 flex-1 rounded-[2px] ${CARD_COLORS[state]}`
              : `h-1.5 w-3 rounded-[2px] md:w-4 ${SEGMENT_COLORS[state]}`
          }
        />
      ))}
      {rest > 0 && (
        <span className={`ml-1 text-xs leading-none ${card ? "text-mist" : "text-muted"}`}>
          +{rest}
        </span>
      )}
    </span>
  );
}
