"use client";

import { GoalBlock } from "@/components/dashboard/goal";
import {
  Genres,
  NewOnShelf,
  QuoteOfTheDay,
  VeryMuch,
  WaitingForContinuation,
} from "@/components/dashboard/lists";
import { MonthsChart } from "@/components/dashboard/months";
import { CurrentlyReading } from "@/components/dashboard/reading";
import { StatTiles } from "@/components/dashboard/tiles";
import { ErrorState } from "@/components/error-state";
import { useT } from "@/lib/i18n";
import { translateError } from "@/lib/i18n/server-errors";
import { useHomeStats } from "@/lib/stats";
import { useRequireAuth } from "@/lib/use-require-auth";

function Placeholder({ className }: { className: string }) {
  return <div aria-hidden="true" className={`card ${className}`} />;
}

function HomeSkeleton() {
  const t = useT();

  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p role="status" className="text-muted">
        {t("dashboard.loading")}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Placeholder key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Placeholder className="h-60" />
        <Placeholder className="h-60" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const t = useT();
  const auth = useRequireAuth();
  const { stats, error, reload } = useHomeStats();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-8 lg:gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] font-semibold leading-tight sm:text-[40px]">
          {t("dashboard.greeting")}
        </h1>
        <p className="text-muted">{t("dashboard.lead")}</p>
      </header>

      {error ? (
        <ErrorState
          title={t("dashboard.loadFailed")}
          text={translateError(error, t)}
          onRetry={reload}
        />
      ) : !stats || auth.status !== "authenticated" ? (
        <HomeSkeleton />
      ) : (
        <>
          <StatTiles stats={stats} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
            <CurrentlyReading books={stats.currentlyReading} />
            <GoalBlock year={stats.year} goal={stats.yearGoal} done={stats.readCount} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
            <MonthsChart stats={stats} />
            <Genres genres={stats.genres} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <WaitingForContinuation items={stats.waitingForContinuation} />
            <VeryMuch items={stats.veryMuch} />
            <QuoteOfTheDay quote={stats.quoteOfTheDay} />
          </div>
          <NewOnShelf books={stats.newOnShelf} />
        </>
      )}
    </main>
  );
}
