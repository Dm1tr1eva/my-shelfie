import type { Locale, Tree } from "../core";
import { en } from "./en";
import { ru } from "./ru";
import { uk } from "./uk";

export type Messages = typeof en;

export const messages: Record<Locale, Tree> = {
  en: en as unknown as Tree,
  ru: ru as unknown as Tree,
  uk: uk as unknown as Tree,
};

export { en };
