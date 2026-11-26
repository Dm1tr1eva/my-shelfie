import { describe, it, expect, afterEach } from "vitest";
import { localDate } from "./stats";

const originalZone = process.env.TZ;

describe("localDate", () => {
  afterEach(() => {
    process.env.TZ = originalZone;
  });

  it("gives the reader's calendar day, not the UTC one, on either side of midnight", () => {
    process.env.TZ = "Pacific/Kiritimati";
    expect(localDate(new Date("2026-12-31T11:30:00Z"))).toBe("2027-01-01");

    process.env.TZ = "America/Los_Angeles";
    expect(localDate(new Date("2027-01-01T05:00:00Z"))).toBe("2026-12-31");
  });
});
