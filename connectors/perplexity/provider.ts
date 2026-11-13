import { defineProvider, presets } from "@shared/core";

/**
 * Perplexity (perplexity.ai) over `https://api.perplexity.ai` with
 * `Authorization: Bearer <key>`: the Search API (ranked web results with
 * page text) and the Agent API (`fast` preset: one web search, then a
 * cited answer) and the Embeddings API (text to base64 int8 or binary
 * vectors).
 *
 * Rate cards (https://docs.perplexity.ai/docs/getting-started/pricing):
 * Search API $5.00 per 1K requests, $1.00 per 1K with `search_type:
 * "fast"`, no token charges, no usage receipt (verified 2026-11-06).
 * Agent API responses report their own USD cost, which the agent
 * endpoint claims (verified 2026-11-12), and so do Embeddings API
 * responses (verified 2026-11-13). The pool is US dollars (the exa posture: pinned vendor
 * unit prices, re-audited on repricing).
 */
export default defineProvider({
    name: "perplexity",
    meta: {
        displayName: "Perplexity",
        summary: "Ranked web search, cited web answers and text embeddings " +
            "for AI agents.",
        description: "The Perplexity Search API returns ranked web results " +
            "as JSON: title, URL, publication and last-updated dates, and " +
            "page text extracted into each result's snippet. Filter by " +
            "domain, language, publication or update date and recency, " +
            "bias results by country, and cap how much page text comes " +
            "back. The Agent API answers a question with one web search and " +
            "inline citations, billed at the cost the response reports. The " +
            "Embeddings API turns text into vectors for search and retrieval.",
        homepageUrl: "https://www.perplexity.ai",
        docsUrl: "https://docs.perplexity.ai",
        categories: ["web-search", "ai-search", "embeddings"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.perplexity.ai" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): Perplexity publishes dollar
         *  prices per request, so the pool is US dollars. */
        credits: { default: { label: "US dollars" } },
    },
});
