"use client";

import { useLocale, useT } from "@/lib/i18n";
import type { HomeStats } from "@/lib/stats";

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <li className="card flex min-w-0 flex-col gap-1 px-4 py-3 sm:px-5 sm:py-4">
      <span className="font-serif text-[28px] font-semibold leading-tight sm:text-[34px]">
        {value}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </li>
  );
}

export function StatTiles({ stats }: { stats: HomeStats }) {
  const t = useT();
  const number = new Intl.NumberFormat(useLocale());

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <Tile
        value={number.format(stats.readCount)}
        label={t("dashboard.tiles.read", { year: stats.year })}
      />
      <Tile value={number.format(stats.pagesRead)} label={t("dashboard.tiles.pages")} />
      <Tile value={number.format(stats.waitingOnShelf)} label={t("dashboard.tiles.waiting")} />
      <Tile
        value={t("dashboard.tiles.seriesValue", {
          complete: number.format(stats.seriesComplete.complete),
          of: number.format(stats.seriesComplete.of),
        })}
        label={t("dashboard.tiles.series")}
      />
    </ul>
  );
}
