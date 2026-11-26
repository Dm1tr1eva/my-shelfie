"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import type { ToastMessage } from "@/components/toast";
import { apiFetch } from "./api";
import { bookKey, isLibraryKey, type Book, type BookChanges } from "./books";
import { useT } from "./i18n";
import { failureText } from "./i18n/server-errors";

type Flush = () => Promise<boolean>;
type Register = (key: string, flush: Flush | null) => void;

function withChanges(book: Book, changes: BookChanges): Book {
  const next: Record<string, unknown> = { ...book };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next as Book;
}

function valuesBefore(book: Book, changes: BookChanges): BookChanges {
  const fields = book as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(changes).map((key) => [key, fields[key] === undefined ? null : fields[key]]),
  ) as BookChanges;
}

type SaveOptions = { optimistic?: boolean; undo?: boolean };

export type SaveBook = (changes: BookChanges, options?: SaveOptions) => Promise<boolean>;

export function useBookAutosave(id: string) {
  const t = useT();
  const { cache, mutate } = useSWRConfig();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef<BookChanges[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: Omit<ToastMessage, "id">) => {
    counter.current += 1;
    setToast({ ...message, id: counter.current });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  const save = useCallback(
    function save(changes: BookChanges, options: SaveOptions = {}): Promise<boolean> {
      const { optimistic = true, undo = false } = options;
      const key = bookKey(id);
      const current = cache.get(key)?.data as Book | undefined;
      if (!current) return Promise.resolve(false);

      const before = valuesBefore(current, changes);
      if (optimistic) {
        pending.current.push(changes);
        void mutate(key, withChanges(current, changes), { revalidate: false });
      }

      const reapply = (book: Book) =>
        pending.current.reduce<Book>((result, later) => withChanges(result, later), book);

      const run = queue.current.then(async () => {
        try {
          const updated = await apiFetch<Book>(key, {
            method: "PATCH",
            body: JSON.stringify(changes),
          });
          pending.current = pending.current.filter((item) => item !== changes);
          await mutate(key, reapply(updated), { revalidate: false });
          void mutate((other) => isLibraryKey(other) && other !== key);
          show(
            undo
              ? { tone: "done", text: t("book.panel.undone") }
              : {
                  tone: "done",
                  text: t("book.panel.saved"),
                  onUndo: () => void save(before, { undo: true }),
                },
          );
          return true;
        } catch (error) {
          pending.current = pending.current.filter((item) => item !== changes);
          if (optimistic) {
            await mutate(key, (latest?: Book) => latest && reapply(withChanges(latest, before)), {
              revalidate: false,
            });
          }
          show({
            tone: "error",
            text: failureText(error, t, t("book.panel.saveFailed")),
            onRetry: () => void save(changes, options),
          });
          return false;
        }
      });

      queue.current = run;
      return run;
    },
    [cache, id, mutate, show, t],
  );

  return { save, toast, show, dismiss };
}

export function useFlushRegistry() {
  const flushes = useRef(new Map<string, Flush>());

  const register = useCallback<Register>((key, flush) => {
    if (flush) flushes.current.set(key, flush);
    else flushes.current.delete(key);
  }, []);

  const flushAll = useCallback(async () => {
    const results = await Promise.all([...flushes.current.values()].map((flush) => flush()));
    return results.every(Boolean);
  }, []);

  return { register, flushAll };
}

export const FlushContext = createContext<Register>(() => {});

export function useDraft(
  key: string,
  serverValue: string,
  commit: (value: string) => Promise<boolean>,
) {
  const register = useContext(FlushContext);
  const [value, setValue] = useState(serverValue);
  const [seen, setSeen] = useState(serverValue);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);
  const sent = useRef<{ value: string; version: number; done: Promise<boolean> } | null>(null);
  const latest = useRef<Flush>(() => Promise.resolve(true));
  const discarded = useRef(false);

  if (serverValue !== seen) {
    setSeen(serverValue);
    setVersion(version + 1);
    if (!editing) setValue(serverValue);
  }

  const flush = useCallback((): Promise<boolean> => {
    if (value === serverValue) return Promise.resolve(true);
    if (sent.current?.value === value && sent.current.version === version) {
      return sent.current.done;
    }
    const done = commit(value);
    const attempt = { value, version, done };
    sent.current = attempt;
    void done.then((ok) => {
      if (!ok && sent.current === attempt) sent.current = null;
    });
    return done;
  }, [commit, serverValue, value, version]);

  useEffect(() => {
    latest.current = flush;
    register(key, flush);
  }, [flush, key, register]);

  useEffect(
    () => () => {
      register(key, null);
      if (!discarded.current) void latest.current();
    },
    [key, register],
  );

  const reset = useCallback(() => {
    setValue(serverValue);
    setEditing(false);
  }, [serverValue]);

  const discard = useCallback(() => {
    discarded.current = true;
  }, []);

  return { value, setValue, editing, setEditing, flush, reset, discard };
}
