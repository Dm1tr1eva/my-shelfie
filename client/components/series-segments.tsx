"use client";

import { useT } from "@/lib/i18n";
import type { SegmentState } from "@/lib/shelves";

const MAX_SEGMENTS = 10;

const SEGMENT_COLORS: Record<SegmentState, string> = {
  owned: "bg-burgundy",
  wanted: "bg-slate",
  missing: "bg-mist",
};

export function SeriesSegments({ states }: { states: SegmentState[] }) {
  const t = useT();
  const owned = states.filter((state) => state === "owned").length;
  const shown = states.slice(0, MAX_SEGMENTS);
  const rest = states.length - shown.length;

  return (
    <span
      role="img"
      aria-label={t("library.progress.own", { owned, total: states.length })}
      className="inline-flex shrink-0 items-center gap-[3px]"
    >
      {shown.map((state, index) => (
        <span
          key={index}
          data-state={state}
          className={`h-1.5 w-3 rounded-[2px] md:w-4 ${SEGMENT_COLORS[state]}`}
        />
      ))}
      {rest > 0 && <span className="ml-1 text-xs leading-none text-muted">+{rest}</span>}
    </span>
  );
}
