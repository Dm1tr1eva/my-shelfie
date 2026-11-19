import { describe, it, expect } from "vitest";
import { makeDomain } from "./domain";
import { translator } from "./index";

describe("the names of an audiobook and an audio link", () => {
  it.each([
    ["en", "Audiobook", "Audio"],
    ["ru", "Аудиокнига", "Аудио"],
    ["uk", "Аудіокнига", "Аудіо"],
  ] as const)("are named in %s", (locale, book, link) => {
    const domain = makeDomain(translator(locale));

    expect(domain.format("audio")).toBe(book);
    expect(domain.formatBook("audio")).toBe(book);
    expect(domain.linkKind("audio")).toBe(link);
    expect(domain.linkKindShort("audio")).toBe(link);
  });
});
