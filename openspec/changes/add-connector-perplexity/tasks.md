# Tasks: add-connector-perplexity

## 1. Provider + schema

- [x] 1.1 provider.ts: bearer auth, baseUrl, 30 s timeouts, one
      `default` usd pool (no consolidate)
- [x] 1.2 search schema/inputs.ts: Search API body mirror, loose

## 2. Endpoint (1)

- [x] 2.1 search: POST /search, web-search; COMPOSITE `web` / `fast`
      keyed by `search_type` (D2), empty result bills 0 (D3)

## 3. Fixtures + tests

- [x] 3.1 Recorded happy (web), fast, empty, and 401 (2026-11-06)
- [x] 3.2 Tests: wire form + pool, happy / fast / empty / 401, estimate
      per type, schema gates (bounds, people rejected, date pattern,
      deny prefix accepted), live gated on PERPLEXITY_API_KEY (shape,
      not amounts)

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / design / spec
- [x] 4.2 Verify: fmt · lint · check · test · double-compile ·
      version:check · catalog smoke
