import { describe, it, expect } from "vitest";
import manifest from "./manifest";

describe("the web app manifest", () => {
  it("opens the installed app on Home, inside the whole site", () => {
    const { start_url, scope } = manifest();

    expect(start_url).toBe("/dashboard");
    expect(scope).toBe("/");
  });
});
