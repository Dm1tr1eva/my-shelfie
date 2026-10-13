import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolveImport(spec: string, from: string) {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;

  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function isClientModule(file: string) {
  const first = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .find((line) => line.trim() !== "");
  return /^["']use client["']/.test(first?.trim() ?? "");
}

type ValueImport = { spec: string; names: string[] };

function valueImports(source: string): ValueImport[] {
  const found: ValueImport[] = [];
  const pattern = /import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(pattern)) {
    if (match[1]) continue;

    const names = match[2]
      .replace(/[{}]/g, "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "" && !name.startsWith("type "))
      .map((name) => name.split(/\s+as\s+/).pop() as string);

    if (names.length > 0) found.push({ spec: match[3], names });
  }

  return found;
}

function pagesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pagesUnder(full);
    return /^(page|layout)\.tsx$/.test(entry.name) ? [full] : [];
  });
}

describe("server and client module boundary", () => {
  it("only renders components from client lib modules in code a server component runs, never reads their values", () => {
    const violations: string[] = [];
    const visited = new Set<string>();
    const relative = (file: string) => path.relative(ROOT, file).replaceAll("\\", "/");

    function walk(file: string) {
      if (visited.has(file)) return;
      visited.add(file);

      const source = fs.readFileSync(file, "utf8");

      for (const { spec, names } of valueImports(source)) {
        const target = resolveImport(spec, file);
        if (!target) continue;

        if (isClientModule(target)) {
          if (!relative(target).startsWith("lib/")) continue;

          for (const name of names) {
            const usedAsComponent = new RegExp(`<${name}[\\s/>]`).test(source);
            if (!usedAsComponent) {
              violations.push(`${relative(file)} reads ${name} from ${relative(target)}`);
            }
          }
          continue;
        }

        walk(target);
      }
    }

    for (const entry of pagesUnder(path.join(ROOT, "app"))) {
      if (!isClientModule(entry)) walk(entry);
    }

    expect(violations).toEqual([]);
  });
});
