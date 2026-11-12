import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPerplexitySearchBody } from "./schema/inputs.ts";

/**
 * POST /search — ranked web results with extracted page text.
 *
 * Price depends on `search_type` (design D2): a COMPOSITE of one
 * component per type, the kling posture of keying the count by the
 * request's price selector. A search that found nothing (`results: []`)
 * bills 0, the keenable and search1api posture (design D3).
 */
export default defineEndpoint({
    meta: {
        displayName: "Perplexity Search",
        summary: "Search the web and get ranked results with extracted " +
            "page text.",
        description: "Search the web with the Perplexity Search API and " +
            "get ranked results with title, URL, publication and " +
            "last-updated dates, and page text extracted into each " +
            "result's snippet. Return 1-20 results (default 10), cap page " +
            "text per result (`max_tokens_per_page`) or across results " +
            "(`max_tokens`), restrict to or exclude domains, filter by " +
            "language, recency, or publication and update dates, and bias " +
            'results by country. Set `search_type: "fast"` for ' +
            "lower-latency results in the same format.",
        docsUrl: "https://docs.perplexity.ai/api-reference/search-post",
        categories: ["web-search"],
        notes: [
            '$0.005 per search with `search_type: "web"` (default), ' +
            '$0.001 with "fast". A search that returns no results is ' +
            "free.",
            "The API also accepts an array of up to 5 queries; this " +
            "connector exposes the single-query form.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            body: zPerplexitySearchBody.extend({
                query: zPerplexitySearchBody.shape.query.min(1),
                search_type: zPerplexitySearchBody.shape.search_type
                    .unwrap().default("web"),
                max_results: zPerplexitySearchBody.shape.max_results
                    .unwrap().min(1).max(20).optional(),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                web: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "web searches with results",
                    description: "$5.00 per 1K web searches",
                    consumes: { credit: "default", amount: 0.005 },
                },
                fast: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "fast searches with results",
                    description: "$1.00 per 1K fast searches",
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        /** The hold promises one search of the requested type. */
        estimate: ({ data }) => ({
            counts: { [data.input.body.search_type]: 1 },
        }),
        /** One search of the requested type, 0 for `results: []` or a
         *  body without a results array. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(data.output, "$.results");
            const n = Array.isArray(results) && results.length > 0 ? 1 : 0;
            return { counts: { [data.input.body.search_type]: n } };
        },
    },
});
