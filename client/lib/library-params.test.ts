import { describe, it, expect } from "vitest";
import { NO_FILTERS } from "./filters";
import { readLibraryParams, writeLibraryParams } from "./library-params";

const read = (search: string) => readLibraryParams(new URLSearchParams(search));

describe("library URL parameters", () => {
  it("reads the search text and every filter group, several values a group", () => {
    expect(read("q=ash&genre=Fantasy&genre=Romance&have=wanted&age=18&status=standalone")).toEqual({
      query: "ash",
      filters: {
        ...NO_FILTERS,
        genre: ["Fantasy", "Romance"],
        have: ["wanted"],
        age: ["18"],
        status: ["standalone"],
      },
    });
  });

  it("ignores unknown parameters, unknown values of fixed groups, empty and repeated values", () => {
    expect(
      read("have=maybe&age=99&rating=7&format=scroll&nonsense=1&genre=&genre=A&genre=A&q=%20"),
    ).toEqual({ query: "", filters: { ...NO_FILTERS, genre: ["A"] } });
  });

  it("ignores a free value longer than any the server accepts", () => {
    expect(read(`author=${"x".repeat(201)}`).filters.author).toEqual([]);
  });

  it("writes only what is set, the search first and the groups in the panel's order", () => {
    expect(
      writeLibraryParams("ash", {
        ...NO_FILTERS,
        rating: ["5"],
        genre: ["Fantasy"],
        have: ["owned"],
      }),
    ).toBe("q=ash&have=owned&genre=Fantasy&rating=5");
    expect(writeLibraryParams(" ", NO_FILTERS)).toBe("");
  });

  it("reads back what it writes", () => {
    const state = { query: "Сага & co", filters: { ...NO_FILTERS, trope: ["Found family"] } };

    expect(read(writeLibraryParams(state.query, state.filters))).toEqual(state);
  });
});
