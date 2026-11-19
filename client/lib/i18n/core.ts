export const LOCALES = ["en", "ru", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
};

export type PluralEn = { one: string; other: string };
export type PluralFull = { one: string; few: string; many: string; other: string };
export type Plural = PluralEn | PluralFull;
export type Message = string | Plural;
export type Tree = { [key: string]: Message | Tree };

export type Localized<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralFull
    : { [K in keyof T]: Localized<T[K]> };

export type Dotted<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends { other: string }
      ? `${Prefix}${K}`
      : Dotted<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function localeFromBrowser(language: string | undefined): Locale {
  const code = language?.slice(0, 2).toLowerCase();
  return code === "uk" ? "uk" : code === "ru" ? "ru" : "en";
}

function find(tree: Tree, key: string): Message | undefined {
  let node: Message | Tree | undefined = tree;

  for (const part of key.split(".")) {
    if (node === undefined || typeof node === "string" || "other" in node) return undefined;
    node = (node as Tree)[part];
  }

  return node as Message | undefined;
}

function fill(text: string, vars: Vars) {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function translate(
  locale: Locale,
  messages: Record<Locale, Tree>,
  key: string,
  vars: Vars = {},
): string {
  const raw = find(messages[locale], key) ?? find(messages.en, key);
  if (raw === undefined) return key;

  if (typeof raw === "string") return fill(raw, vars);

  const count = Number(vars.count ?? 0);
  const form = new Intl.PluralRules(locale).select(count) as keyof PluralFull;
  const text = (raw as Partial<PluralFull>)[form] ?? raw.other;
  return fill(text, vars);
}
