import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const TAILWIND_ANIMATIONS = ["spin", "ping", "pulse", "bounce"];

const root = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(root, "app", "globals.css"), "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = [...sources(path.join(root, "components")), ...sources(path.join(root, "app"))].map(
  (file) => ({ file: path.relative(root, file), text: readFileSync(file, "utf8") }),
);

describe("motion rules", () => {
  it("turns transitions and animations off for readers who ask for reduced motion", () => {
    const block =
      css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(block).toMatch(/transition-duration:\s*1ms !important/);
    expect(block).toMatch(/animation-duration:\s*1ms !important/);
  });

  it("takes every duration and easing from the motion tokens, never a hand-picked value", () => {
    const magic = files.flatMap(({ file, text }) =>
      [
        ...text.matchAll(/(?:duration|ease|delay)-\[[^\]]*\]|transition-\[[^\]]*\d+m?s[^\]]*\]/g),
      ].map((match) => `${file}: ${match[0]}`),
    );

    expect(magic).toEqual([]);
  });

  it("uses only the animations defined as tokens or built into Tailwind", () => {
    const defined = new Set([
      ...[...css.matchAll(/--animate-([\w-]+):/g)].map((match) => match[1]),
      ...TAILWIND_ANIMATIONS,
    ]);
    const used = files.flatMap(({ file, text }) =>
      [...text.matchAll(/(?<![\w-])animate-([\w-]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== "none" && !defined.has(name))
        .map((name) => `${file}: animate-${name}`),
    );

    expect(used).toEqual([]);
  });
});
