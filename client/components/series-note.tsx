"use client";

import { useCallback, useId, useRef, useState } from "react";
import { AutoTextarea } from "@/components/auto-textarea";
import { EditIcon } from "@/components/icons";
import type { ToastMessage } from "@/components/toast";
import { ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { translateServerError } from "@/lib/i18n/server-errors";
import { useSeriesActions, type Series } from "@/lib/series";
import { useDraft } from "@/lib/use-book-autosave";

type Show = (message: Omit<ToastMessage, "id">) => void;

export function SeriesNote({ series, show }: { series: Series; show: Show }) {
  const t = useT();
  const areaId = useId();
  const { updateSeries } = useSeriesActions();
  const [editing, setEditing] = useState(false);
  const pencil = useRef<HTMLButtonElement>(null);

  const send = useCallback(
    async function send(note: string | null, undo: string | null | undefined): Promise<boolean> {
      try {
        await updateSeries(series.id, { note });
        show(
          undo === undefined
            ? { tone: "done", text: t("series.page.note.undone") }
            : {
                tone: "done",
                text: t("series.page.note.saved"),
                onUndo: () => void send(undo, undefined),
              },
        );
        return true;
      } catch (error) {
        show({
          tone: "error",
          text:
            error instanceof ApiError && error.status < 500
              ? translateServerError(error.message, t)
              : t("series.page.note.failed"),
          onRetry: () => void send(note, undo),
        });
        return false;
      }
    },
    [series.id, show, t, updateSeries],
  );

  const commit = useCallback(
    (text: string) => send(text.trim() === "" ? null : text, series.note ?? null),
    [send, series.note],
  );
  const draft = useDraft("series-note", series.note ?? "", commit);

  function open() {
    draft.reset();
    setEditing(true);
  }

  async function finish() {
    draft.setEditing(false);
    const ok = await draft.flush();
    if (ok) setEditing(false);
  }

  return (
    <section
      aria-labelledby={`${areaId}-label`}
      className="flex flex-col gap-1.5 rounded-r-control border-l-[3px] border-burgundy bg-note px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={`${areaId}-label`}
          className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-burgundy"
        >
          {editing ? (
            <label htmlFor={areaId}>{t("series.page.note.label")}</label>
          ) : (
            t("series.page.note.label")
          )}
        </h2>
        {!editing && series.note && (
          <button
            ref={pencil}
            type="button"
            aria-label={t("series.page.note.edit")}
            onClick={open}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-burgundy hover:bg-beige"
          >
            <EditIcon size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <AutoTextarea
          id={areaId}
          autoFocus
          maxLength={2000}
          value={draft.value}
          placeholder={t("series.page.note.placeholder")}
          onChange={(event) => draft.setValue(event.target.value)}
          onFocus={() => draft.setEditing(true)}
          onBlur={() => void finish()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              draft.reset();
              setEditing(false);
              window.setTimeout(() => pencil.current?.focus());
            }
          }}
          className="rounded-control border border-mist bg-card px-3 py-2 text-[15px] leading-relaxed"
        />
      ) : series.note ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{series.note}</p>
      ) : (
        <button type="button" onClick={open} className="self-start text-sm font-semibold text-navy">
          {t("series.page.note.add")}
        </button>
      )}
    </section>
  );
}
