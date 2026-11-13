import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPerplexityEmbeddingsBody } from "./schema/inputs.ts";

/**
 * POST /v1/embeddings: text embeddings from `pplx-embed-v1-0.6b` or
 * `pplx-embed-v1-4b`, returned as base64 int8 or binary vectors.
 *
 * Billing (design D1): every 200 carries `usage.cost.total_cost` in USD,
 * which `consolidate` claims, as on `perplexity#agent/fast`. The card
 * pins each model's per-token price (embeddings quickstart, 2026-11-13);
 * `evidence` keys the receipt's `prompt_tokens` under the selected
 * model's line, so a repricing shows up as `usage.mismatch`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Perplexity Embeddings",
        summary: "Text to embedding vectors, two model sizes.",
        description: "Convert up to 512 texts into vectors for search and " +
            "retrieval with `pplx-embed-v1-0.6b` (1024 dimensions) or " +
            "`pplx-embed-v1-4b` (2560). Set `dimensions` to truncate " +
            "(128 up to the model's maximum) and `encoding_format` to " +
            "choose base64 int8 (default) or base64 binary vectors.",
        docsUrl: "https://docs.perplexity.ai/api-reference/embeddings-post",
        categories: ["embeddings"],
        notes: [
            "Billed at the exact USD the response reports in " +
            "`usage.cost.total_cost`: $0.004 per million input tokens " +
            "for pplx-embed-v1-0.6b and $0.03 per million for " +
            "pplx-embed-v1-4b.",
            "Vectors are base64 strings, not float arrays: decode int8 " +
            "with signed bytes and binary with one bit per dimension.",
        ],
    },
    endpoint: "/embeddings",
    request: { method: "POST", path: "/v1/embeddings" },
    input: { schema: { body: zPerplexityEmbeddingsBody } },
    usage: {
        /** MODEL-SELECTED rates (the octen#embedding shape): each model
         *  is its own linear per-token line; the fns populate only the
         *  selected model's key. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                embed_v1_0_6b: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens (0.6b)",
                    description: "$0.004 per million input tokens",
                    consumes: { credit: "default", amount: 0.000000004 },
                },
                embed_v1_4b: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens (4b)",
                    description: "$0.03 per million input tokens",
                    consumes: { credit: "default", amount: 0.00000003 },
                },
            },
        },
        /** The hold: the UTF-8 byte count of the inputs, the octen
         *  ceiling (byte-level BPE spends at least one byte per token;
         *  2026-11-13 receipts read 1 token for "x" and 6 for 32 bytes). */
        estimate: ({ data }) => {
            let bytes = 0;
            const { input } = data.input.body;
            for (const text of typeof input === "string" ? [input] : input) {
                for (const ch of text) {
                    const cp = ch.codePointAt(0) ?? 0;
                    bytes += cp <= 0x7f
                        ? 1
                        : cp <= 0x7ff
                        ? 2
                        : cp <= 0xffff
                        ? 3
                        : 4;
                }
            }
            const key = data.input.body.model === "pplx-embed-v1-4b"
                ? "embed_v1_4b"
                : "embed_v1_0_6b";
            return { counts: { [key]: bytes } };
        },
        evidence: ({ data, utils }) => {
            const tokens = utils.json.optionalNum(
                data.output,
                "$.usage.prompt_tokens",
            ) ?? 0;
            const key = data.input.body.model === "pplx-embed-v1-4b"
                ? "embed_v1_4b"
                : "embed_v1_0_6b";
            return { counts: { [key]: tokens } };
        },
        /** THE vendor's meter: `usage.cost.total_cost` is the USD charged
         *  for this request. The cost block is absorbed; token counts
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
