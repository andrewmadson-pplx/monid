import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "perplexity#agent/fast";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} wire form: POST /v1/agent, consolidate claims the receipt`, async () => {
    const bundle = await testBundle();
    const doc = bundle.endpoints[ID];
    assertEquals(doc.request.method, "POST");
    assertEquals(doc.request.url, "https://api.perplexity.ai/v1/agent");
    assert(doc.usage.consolidate !== undefined);
    assert(doc.input.toRequest !== undefined);
    assertEquals(Object.keys(doc.usage.credits), ["default"]);
});

Deno.test(`${ID} happy (recorded): billed at usage.cost.total_cost`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                input:
                    "Who maintains the Deno runtime? Answer in one sentence.",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.00148 });
    assertEquals(result.usage.evidence, {
        input_token: 3,
        cached_input_token: 1780,
        cache_write_token: 3517,
        output_token: 36,
        web_search: 1,
    });
    const output = result.output as {
        output: { type: string }[];
        usage: Record<string, unknown>;
    };
    assertEquals(output.usage.cost, undefined);
    assertEquals(output.usage.output_tokens, 36);
    assert(output.output.some((item) => item.type === "message"));
});

Deno.test(`${ID} incomplete (recorded): a capped answer is still billed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}incomplete.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                input: "Summarize the latest Deno release notes.",
                max_output_tokens: 16,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals((result.output as { status: string }).status, "incomplete");
    assertEquals(result.usage.credits, { default: 0.00159 });
});

Deno.test(`${ID} provider error (recorded 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { input: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} estimate: one search, 8K cache writes, the output cap`, async () => {
    const unit = await testSealedUnit(ID);
    const uncapped = await estimateEndpoint(unit, { body: { input: "q" } });
    assertEquals(uncapped.evidence, {
        web_search: 1,
        cache_write_token: 8000,
        output_token: 2000,
    });
    const capped = await estimateEndpoint(unit, {
        body: { input: "q", max_output_tokens: 100 },
    });
    assertEquals(capped.evidence.output_token, 100);
});

Deno.test(`${ID}: input required; rate-card-changing keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        {},
        { input: "" },
        { input: "x", max_output_tokens: 0 },
        { input: "x", preset: "high" },
        { input: "x", model: "anthropic/claude-opus-5-5" },
        { input: "x", tools: [{ type: "fetch_url" }] },
        { input: "x", stream: true },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const ok = await runEndpoint({
        unit,
        input: {
            body: {
                input: "x",
                instructions: "One sentence.",
                max_output_tokens: 1,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: `${ID} live (gated on PERPLEXITY_API_KEY)`,
    ignore: liveSkip("perplexity"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    input: "Who maintains the Deno runtime?",
                    max_output_tokens: 64,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as { preset: string };
        assert(output.preset.startsWith("fast@"), output.preset);
        assert((result.usage.credits.default ?? 0) > 0);
        assertEquals(result.usage.evidence.web_search, 1);
    },
});
