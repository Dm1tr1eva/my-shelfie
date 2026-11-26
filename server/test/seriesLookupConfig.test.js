const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { readSeriesLookupConfig } = require("../config/seriesLookup");

describe("series lookup configuration", () => {
  it("defaults to Anthropic, Claude Haiku 5.5 and thirty lookups a day", () => {
    assert.deepEqual(readSeriesLookupConfig({}), {
      provider: "anthropic",
      model: "claude-haiku-5-5",
      dailyLimit: 30,
    });
  });

  it("treats empty values as unset", () => {
    assert.deepEqual(
      readSeriesLookupConfig({
        SERIES_LOOKUP_PROVIDER: "",
        SERIES_LOOKUP_MODEL: "",
        SERIES_LOOKUP_DAILY_LIMIT: "",
      }),
      readSeriesLookupConfig({}),
    );
  });

  it("takes the model and limit from the environment, zero included", () => {
    const config = readSeriesLookupConfig({
      SERIES_LOOKUP_MODEL: "claude-sonnet-5-5",
      SERIES_LOOKUP_DAILY_LIMIT: "0",
    });

    assert.equal(config.model, "claude-sonnet-5-5");
    assert.equal(config.dailyLimit, 0);
  });

  it("refuses an unknown provider and a limit that is not a whole number", () => {
    assert.throws(
      () => readSeriesLookupConfig({ SERIES_LOOKUP_PROVIDER: "gemini" }),
      /SERIES_LOOKUP_PROVIDER/,
    );
    assert.throws(
      () => readSeriesLookupConfig({ SERIES_LOOKUP_DAILY_LIMIT: "ten" }),
      /SERIES_LOOKUP_DAILY_LIMIT/,
    );
    assert.throws(
      () => readSeriesLookupConfig({ SERIES_LOOKUP_DAILY_LIMIT: "2.5" }),
      /SERIES_LOOKUP_DAILY_LIMIT/,
    );
  });

  it("does not read the API key, so it can never appear in the config", () => {
    const config = readSeriesLookupConfig({ ANTHROPIC_API_KEY: "sk-ant-secret" });

    assert.ok(!JSON.stringify(config).includes("sk-ant-secret"));
  });
});
