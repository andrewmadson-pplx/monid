import { z } from "zod";

/**
 * POST /v1/embeddings body, from the Embeddings API reference
 * (https://docs.perplexity.ai/api-reference/embeddings-post, 2026-11-13).
 * Mirror carries optionality only (D25). The API has no default model.
 *
 * `z.strictObject` (the dataforseo posture): an unknown key could change
 * the model and so the rate card, so it is rejected before any spend.
 * The per-model `dimensions` ceiling is cross-field; refinements do not
 * survive `z.toJSONSchema`, so it is stated in the description and the
 * API answers a violation as a 400 (error-as-data, the minimax posture).
 */
export const zPerplexityEmbeddingsBody = z.strictObject({
    input: z.union([
        z.string().min(1),
        z.array(z.string().min(1)).min(1).max(512),
    ]).describe(
        "Text or texts to embed: up to 512 per request and 120,000 tokens " +
            "in total.",
    ),
    model: z.enum(["pplx-embed-v1-0.6b", "pplx-embed-v1-4b"]).describe(
        "pplx-embed-v1-0.6b (1024 dimensions) or pplx-embed-v1-4b (2560).",
    ),
    dimensions: z.number().int().min(128).max(2560).describe(
        "Output dimensions (Matryoshka): 128 up to 1024 for " +
            "pplx-embed-v1-0.6b or 2560 for pplx-embed-v1-4b.",
    ).optional(),
    encoding_format: z.enum(["base64_int8", "base64_binary"]).describe(
        "base64_int8 (default, one signed byte per dimension) or " +
            "base64_binary (one bit per dimension).",
    ).optional(),
});
