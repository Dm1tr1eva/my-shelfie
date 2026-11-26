const { readSeriesLookupConfig } = require("../../config/seriesLookup");
const { createAnthropicLookup } = require("./anthropicAdapter");

const ADAPTERS = new Map([["anthropic", createAnthropicLookup]]);

function lookUpSeries(query) {
  const { provider, model } = readSeriesLookupConfig();
  const createLookup = ADAPTERS.get(provider);
  return createLookup({ model }).lookUp(query);
}

module.exports = { lookUpSeries };
