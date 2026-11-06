import { defineProvider, presets } from "@shared/core";

/**
 * Perplexity (perplexity.ai) — the Search API: ranked web results with
 * page text extracted into each result, over `https://api.perplexity.ai`
 * with `Authorization: Bearer <key>`.
 *
 * Rate card (https://docs.perplexity.ai/docs/getting-started/pricing,
 * verified 2026-11-06): $5.00 per 1K requests, $1.00 per 1K with
 * `search_type: "fast"`, billed per successful request, no token charges.
 * The pool is US dollars (the exa posture: pinned vendor unit prices,
 * re-audited on repricing). Responses carry no usage receipt, so there is
 * no `consolidate` and the derived fold settles (the keenable posture).
 */
export default defineProvider({
    name: "perplexity",
    meta: {
        displayName: "Perplexity",
        summary: "Ranked web search with extracted page text for AI agents.",
        description: "The Perplexity Search API returns ranked web results " +
            "as JSON: title, URL, publication and last-updated dates, and " +
            "page text extracted into each result's snippet. Filter by " +
            "domain, language, publication or update date and recency, " +
            "bias results by country, and cap how much page text comes " +
            "back. No model and no generated answer: the results are the " +
            "output.",
        homepageUrl: "https://www.perplexity.ai",
        docsUrl: "https://docs.perplexity.ai",
        categories: ["web-search"],
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
