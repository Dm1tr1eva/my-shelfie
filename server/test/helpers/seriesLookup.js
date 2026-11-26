const SOURCE = "https://en.wikipedia.org/wiki/Six_of_Crows";
const OTHER_SOURCE = "https://www.goodreads.com/series/151563-six-of-crows";

const SIX_OF_CROWS = {
  series: "Шестерка воронов",
  seriesOriginal: "Six of Crows",
  number: 1,
  books: [
    { number: 2, title: "Продажное королевство", released: true, expectedYear: null },
    { number: 1, title: "Шестерка воронов", released: true, expectedYear: null },
  ],
  status: "complete",
  confidence: "high",
  sources: [SOURCE, OTHER_SOURCE],
};

const STANDALONE = {
  series: null,
  seriesOriginal: null,
  number: null,
  books: [],
  status: "unknown",
  confidence: "medium",
  sources: [SOURCE],
};

function searchBlocks(urls, id = "srvtoolu_1") {
  return [
    { type: "server_tool_use", id, name: "web_search", input: { query: "series" } },
    {
      type: "web_search_tool_result",
      tool_use_id: id,
      content: urls.map((url) => ({
        type: "web_search_result",
        url,
        title: "A page",
        encrypted_content: "opaque",
      })),
    },
  ];
}

function searchErrorBlocks(errorCode, id = "srvtoolu_err") {
  return [
    { type: "server_tool_use", id, name: "web_search", input: { query: "series" } },
    {
      type: "web_search_tool_result",
      tool_use_id: id,
      content: { type: "web_search_tool_result_error", error_code: errorCode },
    },
  ];
}

function modelReply({
  answer = SIX_OF_CROWS,
  text,
  urls = [SOURCE, OTHER_SOURCE],
  before = [],
  stop = "end_turn",
} = {}) {
  return {
    stop_reason: stop,
    content: [
      { type: "thinking", thinking: "", signature: "opaque" },
      ...before,
      ...searchBlocks(urls),
      { type: "text", text: text ?? JSON.stringify(answer) },
    ],
    usage: { input_tokens: 1000, output_tokens: 200, server_tool_use: { web_search_requests: 1 } },
  };
}

function fakeClient(replies) {
  const calls = [];
  const queue = [...replies];
  return {
    calls,
    messages: {
      create: async (params) => {
        calls.push(structuredClone(params));
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
}

module.exports = {
  SOURCE,
  OTHER_SOURCE,
  SIX_OF_CROWS,
  STANDALONE,
  searchBlocks,
  searchErrorBlocks,
  modelReply,
  fakeClient,
};
