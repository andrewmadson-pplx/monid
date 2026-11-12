import { z } from "zod";

const DATE_FORMAT = "MM/DD/YYYY, e.g. '3/1/2026' or '03/01/2026'.";
const zDate = z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/);

/**
 * POST /search body — Search API reference
 * (https://docs.perplexity.ai/api-reference/search-post, 2026-11-06).
 * Mirror carries optionality only (D25); the price selector default and
 * the web-search result cap live at the binding in endpoint.ts.
 *
 * `z.looseObject`: unspecified vendor-forward keys ride through.
 * `search_type: "people"` is left out: it has no published Search API
 * price (design D2).
 */
export const zPerplexitySearchBody = z.looseObject({
    query: z.string().describe(
        "The search query. Natural language works best.",
    ),
    search_type: z.enum(["web", "fast"]).describe(
        "'web' (default) for general web search, 'fast' for lower-latency " +
            "results in the same format at a lower price.",
    ).optional(),
    max_results: z.number().int().describe(
        "Maximum number of results (1-20). When omitted, 10 are returned.",
    ).optional(),
    max_tokens: z.number().int().min(1).max(1_000_000).describe(
        "Maximum total page-content tokens across all results.",
    ).optional(),
    max_tokens_per_page: z.number().int().min(1).max(1_000_000).describe(
        "Maximum page-content tokens extracted from each result.",
    ).optional(),
    country: z.string().length(2).describe(
        "ISO 3166-1 alpha-2 country code to bias results, e.g. 'US'.",
    ).optional(),
    search_language_filter: z.array(z.string().length(2)).max(20).describe(
        "ISO 639-1 language codes to restrict results to (max 20), " +
            "e.g. ['en', 'fr'].",
    ).optional(),
    search_domain_filter: z.array(z.string().max(253)).max(20).describe(
        "Domains to restrict results to (max 20). Prefix a domain with " +
            "'-' to exclude it instead, e.g. ['-pinterest.com'].",
    ).optional(),
    search_recency_filter: z.enum(["hour", "day", "week", "month", "year"])
        .describe("Only return results published within this window.")
        .optional(),
    search_after_date_filter: zDate.describe(
        "Only return results published after this date. " + DATE_FORMAT,
    ).optional(),
    search_before_date_filter: zDate.describe(
        "Only return results published before this date. " + DATE_FORMAT,
    ).optional(),
    last_updated_after_filter: zDate.describe(
        "Only return results last updated after this date. " + DATE_FORMAT,
    ).optional(),
    last_updated_before_filter: zDate.describe(
        "Only return results last updated before this date. " + DATE_FORMAT,
    ).optional(),
});
