const Anthropic = require("@anthropic-ai/sdk");
const { HttpError } = require("../../errors/httpError");
const { buildSystemPrompt, buildUserMessage } = require("./prompt");
const { parseAnswer } = require("./answer");

const MAX_TOKENS = 8000;
const MAX_SEARCHES = 5;
const MAX_CONTINUATIONS = 1;
const TIMEOUT_MS = 45000;
const ANTHROPIC_API_URL = "https://api.anthropic.com";
const EFFORT = "medium";
const TOLERATED_SEARCH_ERRORS = new Set(["max_uses_exceeded"]);

const WEB_SEARCH_TOOL = {
  type: "web_search_20260318",
  name: "web_search",
  max_uses: MAX_SEARCHES,
  allowed_callers: ["direct"],
};

class SeriesLookupUnavailableError extends HttpError {
  constructor() {
    super(502, "Series lookup is unavailable right now");
    this.name = "SeriesLookupUnavailableError";
  }
}

function assertAnthropicConfigured() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError(503, "Series lookup is not configured");
  }
}

function createDefaultClient() {
  assertAnthropicConfigured();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return new Anthropic({ apiKey, baseURL: ANTHROPIC_API_URL, maxRetries: 0, timeout: TIMEOUT_MS });
}

function searchResultBlocks(content) {
  return content.filter((block) => block.type === "web_search_tool_result");
}

function collectSearchedUrls(content, searchedUrls) {
  for (const block of searchResultBlocks(content)) {
    if (Array.isArray(block.content)) {
      for (const result of block.content) {
        if (typeof result.url === "string") searchedUrls.add(result.url);
      }
    }
  }
}

function hasFailedSearch(content) {
  return searchResultBlocks(content).some(
    (block) =>
      !Array.isArray(block.content) && !TOLERATED_SEARCH_ERRORS.has(block.content?.error_code),
  );
}

function finalText(content) {
  let lastToolBlock = -1;
  content.forEach((block, index) => {
    if (block.type === "server_tool_use" || block.type === "web_search_tool_result") {
      lastToolBlock = index;
    }
  });

  return content
    .slice(lastToolBlock + 1)
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

function addUsage(total, usage) {
  total.requests += 1;
  total.inputTokens += usage?.input_tokens ?? 0;
  total.outputTokens += usage?.output_tokens ?? 0;
  total.searches += usage?.server_tool_use?.web_search_requests ?? 0;
}

function reasonForStop(stopReason) {
  if (stopReason === "refusal") return "refusal";
  if (stopReason === "max_tokens") return "max_tokens";
  if (stopReason === "pause_turn") return "paused";
  return null;
}

function createAnthropicAdapter({ model, client }) {
  async function send(params) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        console.error(
          `Series lookup provider failed: ${err.name} ${err.status ?? "no status"}`,
          err.message,
        );
        throw new SeriesLookupUnavailableError();
      }
      throw err;
    }
  }

  async function lookUp(query, today = new Date()) {
    const system = buildSystemPrompt(today);
    const messages = [{ role: "user", content: buildUserMessage(query) }];
    const usage = { requests: 0, inputTokens: 0, outputTokens: 0, searches: 0 };
    const searchedUrls = new Set();
    let failedSearch = false;
    let response;

    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt += 1) {
      response = await send({
        model,
        max_tokens: MAX_TOKENS,
        output_config: { effort: EFFORT },
        system,
        tools: [WEB_SEARCH_TOOL],
        messages,
      });
      addUsage(usage, response.usage);
      collectSearchedUrls(response.content, searchedUrls);
      failedSearch = failedSearch || hasFailedSearch(response.content);

      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }

    const stopped = reasonForStop(response.stop_reason);
    if (stopped) return { answer: null, reason: stopped, usage };
    if (failedSearch) return { answer: null, reason: "search_error", usage };

    const answer = parseAnswer(finalText(response.content), searchedUrls);
    if (!answer) return { answer: null, reason: "invalid_answer", usage };

    return { answer, reason: null, usage };
  }

  return { lookUp };
}

function createAnthropicLookup({ model }) {
  return createAnthropicAdapter({ model, client: createDefaultClient() });
}

module.exports = {
  assertAnthropicConfigured,
  createAnthropicAdapter,
  createAnthropicLookup,
  SeriesLookupUnavailableError,
};
