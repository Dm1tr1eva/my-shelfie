export type Section = "library" | "wishlist";

const INNER_PREFIXES = ["/series/", "/books/", "/add/"];

export function activeSection(pathname: string): Section | null {
  if (pathname === "/library" || pathname.startsWith("/series/")) return "library";
  if (pathname === "/wishlist") return "wishlist";
  return null;
}

export function isInnerPage(pathname: string): boolean {
  return pathname === "/add" || INNER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
