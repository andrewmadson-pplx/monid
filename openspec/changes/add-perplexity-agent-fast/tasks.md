# Tasks: add-perplexity-agent-fast

## 1. Endpoint

- [x] 1.1 agent-fast schema/inputs.ts: strict body (`input`,
      `instructions`, `max_output_tokens`)
- [x] 1.2 agent-fast endpoint.ts: POST /v1/agent, `preset: "fast"` in
      toRequest, COMPOSITE token and search card, evidence from the
      receipt, consolidate claims `total_cost` (D1)
- [x] 1.3 provider.ts: summary, description, `ai-search` category

## 2. Fixtures + tests

- [x] 2.1 Recorded happy, incomplete and 401 (2026-11-12)
- [x] 2.2 Tests: wire form, happy / incomplete / 401, estimate with and
      without the cap, strict-body gates, live gated on
      PERPLEXITY_API_KEY (preset and nonzero claim, not amounts)

## 3. Verify

- [x] 3.1 fmt · lint · check · test · double-compile · version:check ·
      catalog smoke
