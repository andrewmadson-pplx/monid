# Tasks: add-perplexity-embeddings

## 1. Endpoint

- [x] 1.1 embeddings schema/inputs.ts: strict body (`input`, `model`,
      `dimensions`, `encoding_format`)
- [x] 1.2 embeddings endpoint.ts: POST /v1/embeddings, COMPOSITE
      per-model token card, estimate from UTF-8 bytes, evidence from the
      receipt, consolidate claims `total_cost` (D1)
- [x] 1.3 provider.ts: summary, description, `embeddings` category

## 2. Fixtures + tests

- [x] 2.1 Recorded happy, binary and 401 (2026-11-13)
- [x] 2.2 Tests: wire form, happy / binary / 401, estimate per model,
      strict-body gates, live gated on PERPLEXITY_API_KEY (nonzero claim
      under the selected line, not amounts)

## 3. Verify

- [x] 3.1 fmt · lint · check · test · double-compile · version:check ·
      catalog smoke
