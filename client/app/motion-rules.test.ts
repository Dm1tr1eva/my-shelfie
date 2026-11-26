import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const TAILWIND_ANIMATIONS = ["spin", "ping", "pulse", "bounce"];
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

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

function block(text: string, opening: string) {
  const start = text.indexOf(opening);
  if (start === -1) return { start: -1, end: -1, body: "" };
  let depth = 0;
  for (let index = text.indexOf("{", start); index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;
    if (depth === 0) {
      return { start, end: index + 1, body: text.slice(text.indexOf("{", start) + 1, index) };
    }
  }
  return { start, end: text.length, body: text.slice(start) };
}

function without(text: string, opening: string) {
  const found = block(text, opening);
  return found.start === -1 ? text : text.slice(0, found.start) + text.slice(found.end);
}

function hits(pattern: RegExp) {
  return files.flatMap(({ file, text }) =>
    [...text.matchAll(pattern)].map((match) => `${file}: ${match[0]}`),
  );
}

describe("motion rules", () => {
  it("makes every transition and animation of every element instant for reduced motion", () => {
    const { body } = block(css, REDUCED_MOTION);
    const selector = body.slice(0, body.indexOf("{")).replace(/\s+/g, " ").trim();

    expect(selector).toBe("*, ::before, ::after");
    expect(body).toMatch(/transition-duration:\s*1ms !important/);
    expect(body).toMatch(/animation-duration:\s*1ms !important/);
  });

  it("uses no Tailwind duration, delay or easing that is not a motion token", () => {
    expect(
      hits(
        /(?<![\w-])(?:duration|ease|delay)-\[[^\]]*\]|(?<![\w-])(?:duration|delay)-\d+|(?<![\w-])ease-(?:in-out|in|out|linear)(?![\w-])|transition-\[[^\]]*\d+m?s[^\]]*\]/g,
      ),
    ).toEqual([]);
  });

  it("sets no transition or animation in an inline style", () => {
    expect(hits(/style=\{\{[^}]*\b(?:transition|animation)\w*\s*:/g)).toEqual([]);
  });

  it("writes times and curves in globals.css only as tokens", () => {
    const outside = without(without(css, "@theme {"), REDUCED_MOTION);

    expect(outside.match(/\b\d+(?:\.\d+)?m?s\b|cubic-bezier\(/g) ?? []).toEqual([]);
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
