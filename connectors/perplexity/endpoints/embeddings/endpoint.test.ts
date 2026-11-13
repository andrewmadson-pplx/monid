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

const ID = "perplexity#embeddings";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} wire form: POST /v1/embeddings, consolidate claims the receipt`, async () => {
    const bundle = await testBundle();
    const doc = bundle.endpoints[ID];
    assertEquals(doc.request.method, "POST");
    assertEquals(doc.request.url, "https://api.perplexity.ai/v1/embeddings");
    assert(doc.usage.consolidate !== undefined);
    assertEquals(Object.keys(doc.usage.credits), ["default"]);
});

Deno.test(`${ID} happy (recorded): 0.6b tokens billed at usage.cost.total_cost`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                input: ["hello world", "Perplexity embeddings"],
                model: "pplx-embed-v1-0.6b",
                dimensions: 128,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 2.4e-8 });
    assertEquals(result.usage.evidence, { embed_v1_0_6b: 6 });
    const output = result.output as {
        data: { embedding: string; index: number }[];
        usage: Record<string, unknown>;
    };
    assertEquals(output.usage.cost, undefined);
    assertEquals(output.usage.prompt_tokens, 6);
    assertEquals(output.data.map((d) => d.index), [0, 1]);
    // base64 int8: one byte per requested dimension
    assertEquals(atob(output.data[0].embedding).length, 128);
});

Deno.test(`${ID} binary (recorded): 4b tokens land under the 4b line`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}binary.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                input: ["hello world"],
                model: "pplx-embed-v1-4b",
                dimensions: 256,
                encoding_format: "base64_binary",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage.credits, { default: 6e-8 });
    assertEquals(result.usage.evidence, { embed_v1_4b: 2 });
    const output = result.output as { data: { embedding: string }[] };
    // base64 binary: one bit per requested dimension
    assertEquals(atob(output.data[0].embedding).length, 256 / 8);
});

Deno.test(`${ID} provider error (recorded 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { input: ["anything"], model: "pplx-embed-v1-0.6b" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} estimate: UTF-8 bytes under the selected model's line`, async () => {
    const unit = await testSealedUnit(ID);
    const small = await estimateEndpoint(unit, {
        body: { input: ["hello", "é"], model: "pplx-embed-v1-0.6b" },
    });
    assertEquals(small.evidence, { embed_v1_0_6b: 7 });
    const large = await estimateEndpoint(unit, {
        body: { input: ["日本", "🙂"], model: "pplx-embed-v1-4b" },
    });
    assertEquals(large.evidence, { embed_v1_4b: 10 });
    const single = await estimateEndpoint(unit, {
        body: { input: "hello", model: "pplx-embed-v1-0.6b" },
    });
    assertEquals(single.evidence, { embed_v1_0_6b: 5 });
});

Deno.test(`${ID}: model and non-empty input required; unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        { input: ["x"] },
        { input: [], model: "pplx-embed-v1-0.6b" },
        { input: [""], model: "pplx-embed-v1-0.6b" },
        { input: "", model: "pplx-embed-v1-0.6b" },
        { input: ["x"], model: "pplx-embed-context-v1-0.6b" },
        { input: ["x"], model: "pplx-embed-v1-0.6b", dimensions: 127 },
        { input: ["x"], model: "pplx-embed-v1-0.6b", encoding_format: "float" },
        { input: ["x"], model: "pplx-embed-v1-0.6b", user: "u" },
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
});

Deno.test({
    name: `${ID} live (gated on PERPLEXITY_API_KEY)`,
    ignore: liveSkip("perplexity"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: { input: ["hello world"], model: "pplx-embed-v1-0.6b" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert((result.usage.credits.default ?? 0) > 0);
        assertEquals(Object.keys(result.usage.evidence), ["embed_v1_0_6b"]);
    },
});
