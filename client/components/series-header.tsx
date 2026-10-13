import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { OwnProgress } from "@/components/own-progress";
import { SeriesStatusChip } from "@/components/chips";
import type { SeriesGroup } from "@/lib/catalogue";

export function SeriesHeader({ group }: { group: SeriesGroup }) {
  const { series } = group;

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold">{series.title}</h2>
          <SeriesStatusChip status={series.status} />
        </div>
        {(series.author || series.note) && (
          <p className="text-sm text-muted">
            {series.author}
            {series.author && series.note ? " · " : ""}
            {series.note && <em>{series.note}</em>}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:w-72">
        <OwnProgress
          ownedNumbers={group.ownedNumbers}
          ownedCount={group.ownedCount}
          total={group.total}
        />
        <Link
          href={`/series/${series.id}`}
          className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-navy underline underline-offset-2 md:self-end"
        >
          Open series
          <ChevronRightIcon size={16} />
        </Link>
      </div>
    </header>
  );
}
