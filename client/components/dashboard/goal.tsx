"use client";

import { useId, useState } from "react";
import { Muted, Section } from "@/components/dashboard/section";
import { PlusIcon } from "@/components/icons";
import { Popover } from "@/components/popover";
import { useT } from "@/lib/i18n";
import { translateError } from "@/lib/i18n/server-errors";
import { useHomeActions, type YearGoal } from "@/lib/stats";

const QUICK = [12, 24, 36, 52];
const MIN_BOOKS = 1;
const MAX_BOOKS = 1000;
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DEFAULT_TARGET = 24;

function Ring({ goal }: { goal: YearGoal }) {
  const t = useT();
  const filled = (CIRCUMFERENCE * Math.min(goal.percent, 100)) / 100;

  return (
    <svg
      viewBox="0 0 150 150"
      width="150"
      height="150"
      role="img"
      aria-label={t("dashboard.goal.ring", {
        year: goal.year,
        done: goal.done,
        target: goal.target,
        percent: goal.percent,
      })}
    >
      <circle cx="75" cy="75" r={RADIUS} fill="none" strokeWidth="14" className="stroke-beige" />
      <circle
        cx="75"
        cy="75"
        r={RADIUS}
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
        transform="rotate(-90 75 75)"
        className="stroke-navy"
      />
      <text
        x="75"
        y="80"
        textAnchor="middle"
        className="fill-ink font-serif text-[34px] font-semibold"
      >
        {goal.done}
      </text>
      <text x="75" y="102" textAnchor="middle" className="fill-muted text-[13px]">
        {t("dashboard.goal.of", { count: goal.target })}
      </text>
    </svg>
  );
}

function GoalEditor({
  year,
  goal,
  done,
  onClose,
}: {
  year: number;
  goal: YearGoal | null;
  done: number;
  onClose: () => void;
}) {
  const t = useT();
  const { saveGoal } = useHomeActions();
  const [books, setBooks] = useState(goal?.target ?? DEFAULT_TARGET);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const left = Math.max(0, books - done);

  function change(next: number) {
    if (Number.isFinite(next)) setBooks(Math.min(MAX_BOOKS, Math.max(MIN_BOOKS, Math.round(next))));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveGoal(year, books);
      onClose();
    } catch (failure) {
      setError(translateError(failure, t));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label={t("dashboard.goal.fewer")}
          disabled={books <= MIN_BOOKS}
          onClick={() => change(books - 1)}
          className="btn-round text-xl"
        >
          −
        </button>
        <label htmlFor={fieldId} className="sr-only">
          {t("dashboard.goal.books", { year })}
        </label>
        <input
          id={fieldId}
          type="number"
          inputMode="numeric"
          min={MIN_BOOKS}
          max={MAX_BOOKS}
          value={books}
          onChange={(event) => change(Number(event.target.value))}
          className="field num w-24 bg-input-strong text-center text-2xl"
        />
        <button
          type="button"
          aria-label={t("dashboard.goal.more")}
          disabled={books >= MAX_BOOKS}
          onClick={() => change(books + 1)}
          className="btn-round"
        >
          <PlusIcon />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{t("dashboard.goal.quick")}</p>
        <div className="flex gap-2">
          {QUICK.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={books === value}
              onClick={() => setBooks(value)}
              className={`num min-h-10 flex-1 rounded-pill text-sm ${
                books === value
                  ? "bg-navy text-page"
                  : "border border-mist text-navy hover:bg-beige"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {goal && (
        <p className="text-sm text-ink-soft">
          {left === 0
            ? t("dashboard.goal.reached")
            : t("dashboard.goal.left", {
                count: left,
                weeks: t("dashboard.goal.weeks", { count: goal.weeksLeft }),
                perWeek: Math.ceil(left / Math.max(1, goal.weeksLeft)),
              })}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-outline border-transparent">
          {t("dashboard.goal.cancel")}
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {t("dashboard.goal.save")}
        </button>
      </div>
    </form>
  );
}

export function GoalBlock({
  year,
  goal,
  done,
}: {
  year: number;
  goal: YearGoal | null;
  done: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <Section id="home-goal" title={t("dashboard.goal.title", { year })}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {goal ? (
          <>
            <Ring goal={goal} />
            <p className="text-sm text-muted">
              {goal.percent}% · {t("dashboard.goal.weeksLeft", { count: goal.weeksLeft })}
            </p>
          </>
        ) : (
          <Muted>{t("dashboard.goal.empty", { year })}</Muted>
        )}
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? popoverId : undefined}
            onClick={() => setOpen((value) => !value)}
            className="btn-outline"
          >
            {t(goal ? "dashboard.goal.change" : "dashboard.goal.set")}
          </button>
          {open && (
            <Popover
              id={popoverId}
              label={t("dashboard.goal.title", { year })}
              align="center"
              onClose={() => setOpen(false)}
            >
              <GoalEditor year={year} goal={goal} done={done} onClose={() => setOpen(false)} />
            </Popover>
          )}
        </div>
      </div>
    </Section>
  );
}
