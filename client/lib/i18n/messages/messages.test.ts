import { describe, it, expect } from "vitest";
import type { Message, Tree } from "../core";
import { messages } from "./index";

function leaves(tree: Tree, prefix = ""): [string, Message][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix + key;
    if (typeof value === "string" || "other" in value) return [[path, value as Message]];
    return leaves(value as Tree, `${path}.`);
  });
}

function texts(message: Message) {
  return typeof message === "string" ? [message] : Object.values(message);
}

function placeholders(message: Message) {
  return [...new Set(texts(message).flatMap((text) => text.match(/\{\w+\}/g) ?? []))].sort();
}

const english = leaves(messages.en);

describe.each(["ru", "uk"] as const)("the %s messages", (locale) => {
  const translated = new Map(leaves(messages[locale]));

  it("have exactly the keys of the English ones", () => {
    expect([...translated.keys()].sort()).toEqual(english.map(([key]) => key).sort());
  });

  it("are all filled in", () => {
    for (const [key, message] of translated) {
      for (const text of texts(message)) {
        expect(text.trim(), key).not.toBe("");
      }
    }
  });

  it("use the same placeholders as the English ones", () => {
    for (const [key, message] of english) {
      const other = translated.get(key);
      const wanted = placeholders(message);
      expect(other && placeholders(other).filter((name) => wanted.includes(name)), key).toEqual(
        wanted,
      );
    }
  });

  it("give every plural all four forms", () => {
    for (const [key, message] of translated) {
      if (typeof message === "string") continue;
      expect(Object.keys(message).sort(), key).toEqual(["few", "many", "one", "other"]);
    }
  });
});
