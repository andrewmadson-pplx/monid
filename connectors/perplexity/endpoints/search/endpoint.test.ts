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

const ID = "perplexity#search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} wire form: bearer auth, one usd pool, no consolidate`, async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("perplexity#")
    );
    assertEquals(ids.sort(), ["perplexity#agent/fast", ID]);
    const doc = bundle.endpoints[ID];
    assertEquals(doc.request.method, "POST");
    assertEquals(doc.request.url, "https://api.perplexity.ai/search");
    assertEquals(doc.usage.consolidate, undefined);
    assertEquals(doc.input.toRequest, undefined);
    assertEquals(Object.keys(doc.usage.credits), ["default"]);
    assertEquals(doc.usage.model.kind, "COMPOSITE");
});

Deno.test(`${ID} happy (recorded): web search bills $0.005`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "deno 2 workspace monorepo guide",
                max_results: 2,
                max_tokens_per_page: 256,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.005 },
        evidence: { web: 1 },
    });
    const results = (result.output as { results: Record<string, unknown>[] })
        .results;
    assertEquals(results.length, 2);
    for (const r of results) {
        assertEquals(typeof r.url, "string");
        assertEquals(typeof r.snippet, "string");
    }
});

Deno.test(`${ID} fast (recorded): fast search bills $0.001`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}fast.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "deno 2 workspace monorepo guide",
                max_results: 2,
                search_type: "fast",
                max_tokens_per_page: 256,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { fast: 1 },
    });
});

Deno.test(`${ID} empty (recorded): results [] bills 0`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "zzqxv qqzzv xxqvz no such page 8f3k2",
                max_results: 2,
                search_domain_filter: ["example.com"],
                search_recency_filter: "hour",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { web: 0 } });
    assertEquals((result.output as Record<string, unknown>).results, []);
});

Deno.test(`${ID} provider error (recorded 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} estimate: one search of the requested type`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { body: { query: "q" } }), {
        credits: { default: 0.005 },
        evidence: { web: 1 },
    });
    assertEquals(
        await estimateEndpoint(unit, {
            body: { query: "q", search_type: "fast" },
        }),
        { credits: { default: 0.001 }, evidence: { fast: 1 } },
    );
});

Deno.test(`${ID}: query required; bounds; unpriced search types rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "x", max_results: 0 },
        { query: "x", max_results: 21 },
        { query: "x", search_type: "people" },
        { query: "x", country: "USA" },
        { query: "x", search_language_filter: ["eng"] },
        { query: "x", search_recency_filter: "decade" },
        { query: "x", search_after_date_filter: "2026-03-01" },
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
    // Replay matches method+URL, not body.
    const passing: Json[] = [
        { query: "x", max_results: 1 },
        { query: "x", max_results: 20 },
        { query: "x", search_type: "fast" },
        { query: "x", search_after_date_filter: "3/1/2026" },
        { query: "x", last_updated_before_filter: "03/01/2026" },
        { query: "x", search_domain_filter: ["-pinterest.com"] },
        { query: "x", bogus: 1 },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
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
                body: {
                    query: "deno 2 workspace monorepo guide",
                    max_results: 2,
                    max_tokens_per_page: 128,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["web"]);
        assert(
            Array.isArray((result.output as Record<string, unknown>).results),
        );
    },
});
