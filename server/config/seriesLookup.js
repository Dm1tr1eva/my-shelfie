const { z } = require("zod");

const SERIES_LOOKUP_PROVIDERS = ["anthropic"];
const DEFAULT_MODEL = "claude-haiku-5-5";
const DEFAULT_DAILY_LIMIT = 30;

function unsetWhenEmpty(schema) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}

const envSchema = z.object({
  SERIES_LOOKUP_PROVIDER: unsetWhenEmpty(z.enum(SERIES_LOOKUP_PROVIDERS).default("anthropic")),
  SERIES_LOOKUP_MODEL: unsetWhenEmpty(z.string().trim().min(1).max(100).default(DEFAULT_MODEL)),
  SERIES_LOOKUP_DAILY_LIMIT: unsetWhenEmpty(
    z.coerce.number().int().min(0).max(1000).default(DEFAULT_DAILY_LIMIT),
  ),
});

function readSeriesLookupConfig(env = process.env) {
  const parsed = envSchema.safeParse({
    SERIES_LOOKUP_PROVIDER: env.SERIES_LOOKUP_PROVIDER,
    SERIES_LOOKUP_MODEL: env.SERIES_LOOKUP_MODEL,
    SERIES_LOOKUP_DAILY_LIMIT: env.SERIES_LOOKUP_DAILY_LIMIT,
  });

  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid series lookup configuration: ${problems.join("; ")}`);
  }

  return {
    provider: parsed.data.SERIES_LOOKUP_PROVIDER,
    model: parsed.data.SERIES_LOOKUP_MODEL,
    dailyLimit: parsed.data.SERIES_LOOKUP_DAILY_LIMIT,
  };
}

module.exports = { readSeriesLookupConfig, SERIES_LOOKUP_PROVIDERS };
