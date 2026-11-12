import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPerplexityAgentBody } from "./schema/inputs.ts";

/**
 * POST /v1/agent with `preset: "fast"`: one web search, then a cited
 * answer from `openai/gpt-6-luna` (presets page, 2026-11-12).
 *
 * Billing (design D1): every 200 carries `usage.cost.total_cost` in USD,
 * which `consolidate` claims (the exa / dataforseo posture). The rate
 * card pins the model's token prices and the fast web-search price;
 * `evidence` counts the receipt's tokens and searches, so a repricing
 * shows up as `usage.mismatch`. The vendor rounds receipts to $0.00001,
 * so a mismatch within that rounding is expected.
 */
export default defineEndpoint({
    meta: {
        displayName: "Perplexity Agent (fast)",
        summary: "Answer a question with one web search and cited sources.",
        description: "Ask the Perplexity Agent API a question with the " +
            "`fast` preset: it runs one web search, then answers with " +
            "`openai/gpt-6-luna`. Returns the answer message with inline " +
            "citations and the search results it used. Set `instructions` " +
            "to shape the answer and `max_output_tokens` to cap its length.",
        docsUrl: "https://docs.perplexity.ai/api-reference/agent-post",
        categories: ["ai-search"],
        notes: [
            "Billed at the exact USD the response reports in " +
            "`usage.cost.total_cost`: model tokens at $0.10 per million " +
            "input, $0.01 per million cached input, $0.125 per million " +
            "cache write and $0.50 per million output, plus $0.001 per " +
            "web search. A typical answer costs about $0.0015.",
            "A response cut off by `max_output_tokens` has status " +
            "`incomplete` and is still billed.",
        ],
    },
    endpoint: "/agent/fast",
    request: { method: "POST", path: "/v1/agent" },
    input: {
        schema: {
            body: zPerplexityAgentBody.extend({
                input: zPerplexityAgentBody.shape.input.min(1),
            }),
        },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { preset: "fast" }),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                input_token: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "input tokens",
                    description: "$0.10 per million input tokens",
                    consumes: { credit: "default", amount: 0.0000001 },
                },
                cached_input_token: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "cached input tokens",
                    description: "$0.01 per million cached input tokens",
                    consumes: { credit: "default", amount: 0.00000001 },
                },
                cache_write_token: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "cache write tokens",
                    description: "$0.125 per million cache write tokens",
                    consumes: { credit: "default", amount: 0.000000125 },
                },
                output_token: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "output tokens",
                    description: "$0.50 per million output tokens",
                    consumes: { credit: "default", amount: 0.0000005 },
                },
                web_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "web searches",
                    description: "$1.00 per 1K fast web searches",
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        /** The hold: one search, the search-result context the preset
         *  reads (3.6K-6.2K input tokens on 2026-11-12 receipts, mostly
         *  cache writes) priced at the cache-write rate, and the output
         *  cap or 2K tokens. */
        estimate: ({ data }) => ({
            counts: {
                web_search: 1,
                cache_write_token: 8_000,
                output_token: data.input.body.max_output_tokens ?? 2_000,
            },
        }),
        /** Token and search counts from the receipt. `input_tokens`
         *  includes cache reads and cache writes. */
        evidence: ({ data, utils }) => {
            const num = (path: string) =>
                utils.json.optionalNum(data.output, path) ?? 0;
            const read = num(
                "$.usage.input_tokens_details.cache_read_input_tokens",
            );
            const write = num(
                "$.usage.input_tokens_details.cache_creation_input_tokens",
            );
            return {
                counts: {
                    input_token: num("$.usage.input_tokens") - read - write,
                    cached_input_token: read,
                    cache_write_token: write,
                    output_token: num("$.usage.output_tokens"),
                    web_search: num(
                        "$.usage.tool_calls_details.search_web.invocation",
                    ),
                },
            };
        },
        /** THE vendor's meter: `usage.cost.total_cost` is the USD charged
         *  for this response. The cost block is absorbed; token counts
         *  stay in the output. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.usage.cost",
            );
            const total = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.total_cost");
            return {
                credits: { ...(total !== undefined ? { default: total } : {}) },
                output: rest,
            };
        },
    },
});
