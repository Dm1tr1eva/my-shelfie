import { describe, it, expect } from "vitest";
import NextPage from "./page";

describe("/next", () => {
  it("sends the old Next to buy address to the wishlist for good", () => {
    let thrown: unknown;
    try {
      NextPage();
    } catch (error) {
      thrown = error;
    }

    expect((thrown as { digest?: string }).digest).toMatch(
      /^NEXT_REDIRECT;replace;\/wishlist;308;/,
    );
  });
});
