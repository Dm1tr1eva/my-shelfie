"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  isLocale,
  localeFromBrowser,
  translate,
  type Dotted,
  type Locale,
  type Vars,
} from "./core";
import { messages, type Messages } from "./messages";

export { LOCALES, LOCALE_NAMES } from "./core";
export type { Locale } from "./core";

export type MessageKey = Dotted<Messages>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

const STORAGE_KEY = "my-shelfie:locale";
const listeners = new Set<() => void>();
let current: Locale | null = null;

function detect(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {}

  return localeFromBrowser(navigator.language);
}

function getSnapshot(): Locale {
  if (current === null) current = detect();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLocale(locale: Locale) {
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
  listeners.forEach((listener) => listener());
}

export function resetLocale() {
  current = null;
  listeners.forEach((listener) => listener());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, () => "en");
}

export function translator(locale: Locale): Translate {
  return (key, vars) => translate(locale, messages, key, vars);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
