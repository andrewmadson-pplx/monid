import { z } from "zod";

/**
 * POST /v1/agent body, `preset: "fast"` subset, from the Agent API reference
 * (https://docs.perplexity.ai/api-reference/agent-post, 2026-11-12).
 * Mirror carries optionality only (D25); `preset` is set in toRequest.
 *
 * `z.strictObject` (the dataforseo posture): `model`, `tools`, `preset`
 * and `stream` would change which rate card applies or how the response
 * arrives, so unknown keys are rejected before any spend.
 */
export const zPerplexityAgentBody = z.strictObject({
    input: z.string().describe(
        "The question or task. The agent searches the web once and answers " +
            "with citations.",
    ),
    instructions: z.string().describe(
        "System instructions for the answer, e.g. 'Answer in one sentence.'",
    ).optional(),
    max_output_tokens: z.number().int().min(1).describe(
        "Maximum tokens in the answer. A response cut off by this cap has " +
            "status 'incomplete' and is still billed.",
    ).optional(),
});
