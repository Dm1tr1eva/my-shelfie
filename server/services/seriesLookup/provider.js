const { readSeriesLookupConfig } = require("../../config/seriesLookup");
const { assertAnthropicConfigured, createAnthropicLookup } = require("./anthropicAdapter");

const ADAPTERS = new Map([
  ["anthropic", { assertConfigured: assertAnthropicConfigured, create: createAnthropicLookup }],
]);

function adapterInUse() {
  const { provider, model } = readSeriesLookupConfig();
  return { adapter: ADAPTERS.get(provider), model };
}

function assertConfigured() {
  adapterInUse().adapter.assertConfigured();
}

function lookUpSeries(query) {
  const { adapter, model } = adapterInUse();
  return adapter.create({ model }).lookUp(query);
}

module.exports = { assertConfigured, lookUpSeries };
