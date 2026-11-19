import { describe, it, expect } from "vitest";
import { localeFromBrowser, translate, type Tree } from "./core";

const tree = (value: Tree) => value;

const messages = {
  en: tree({
    greeting: "Hello, {name}!",
    only: "Only in English",
    books: { one: "{count} book", other: "{count} books" },
    nested: { deep: { key: "Deep" } },
  }),
  ru: tree({
    greeting: "Привет, {name}!",
    books: {
      one: "{count} книга",
      few: "{count} книги",
      many: "{count} книг",
      other: "{count} книги",
    },
    nested: { deep: { key: "Глубоко" } },
  }),
  uk: tree({
    greeting: "Привіт, {name}!",
    books: {
      one: "{count} книга",
      few: "{count} книги",
      many: "{count} книг",
      other: "{count} книги",
    },
  }),
};

describe("translate", () => {
  it("fills the placeholders of the chosen language", () => {
    expect(translate("ru", messages, "greeting", { name: "Дарина" })).toBe("Привет, Дарина!");
    expect(translate("en", messages, "greeting", { name: "Daryna" })).toBe("Hello, Daryna!");
  });

  it("leaves a placeholder that was not given as it is", () => {
    expect(translate("en", messages, "greeting")).toBe("Hello, {name}!");
  });

  it("walks nested keys", () => {
    expect(translate("ru", messages, "nested.deep.key")).toBe("Глубоко");
  });

  it("falls back to English for a missing translation, and to the key for an unknown one", () => {
    expect(translate("uk", messages, "only")).toBe("Only in English");
    expect(translate("uk", messages, "nested.deep.key")).toBe("Deep");
    expect(translate("ru", messages, "nothing.here")).toBe("nothing.here");
  });

  it("picks the English plural form by count", () => {
    expect(translate("en", messages, "books", { count: 1 })).toBe("1 book");
    expect(translate("en", messages, "books", { count: 0 })).toBe("0 books");
    expect(translate("en", messages, "books", { count: 5 })).toBe("5 books");
  });

  it("picks the Russian and Ukrainian plural forms, which have four", () => {
    const forms = (locale: "ru" | "uk") =>
      [1, 2, 4, 5, 11, 12, 21, 22, 25, 101].map((count) =>
        translate(locale, messages, "books", { count }),
      );

    const expected = [
      "1 книга",
      "2 книги",
      "4 книги",
      "5 книг",
      "11 книг",
      "12 книг",
      "21 книга",
      "22 книги",
      "25 книг",
      "101 книга",
    ];

    expect(forms("ru")).toEqual(expected);
    expect(forms("uk")).toEqual(expected);
  });
});

describe("localeFromBrowser", () => {
  it("reads the language code of the browser and defaults to English", () => {
    expect(localeFromBrowser("uk-UA")).toBe("uk");
    expect(localeFromBrowser("ru")).toBe("ru");
    expect(localeFromBrowser("RU-ru")).toBe("ru");
    expect(localeFromBrowser("de-DE")).toBe("en");
    expect(localeFromBrowser(undefined)).toBe("en");
  });
});
