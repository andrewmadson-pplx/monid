# Proposal: add-connector-perplexity

## Why

The Perplexity Search API is a web search provider in the same class as
Exa, Keenable, Search1API, and TinyFish: ranked results with page text
extracted into each result, one API key, REST. The catalog reaches
Perplexity today only through a reseller (`dataforseo#ai/perplexity-*`),
not through the vendor's own search API.
One synchronous endpoint, no new engine capability.

## What Changes

- **connectors/perplexity** — 1 endpoint, bearer auth, 30 s timeouts:
  - `perplexity#search` (`POST /search`): ranked results with title, URL,
    snippet (extracted page text), publication and last-updated dates;
    result count (1-20, default 10), page-text caps, domain allow/deny,
    language, country, recency and date filters; `search_type` `web`
    (default) or `fast`.
- **One credit pool** `default` ("US dollars"). COMPOSITE model with one
  PER_UNIT component per search type: `web` $0.005, `fast` $0.001
  (vendor rate card, 2026-11-06). An empty result bills 0. No
  `usage.consolidate`: responses carry no usage receipt.
- Fixtures: happy, fast, empty, and 401 are all RECORDED (2026-11-06).

## Capabilities

- `perplexity-connector`.

## Non-goals

- `search_type: "people"` (no published Search API price).
- The multi-query array form of `query` (up to 5 queries, one billing
  unit); the single-query form covers the same capability.
- Perplexity's Agent API (`/v1/responses`) and Embeddings API
  (`/v1/embeddings`), each its own change.

## Impact

New connector tree. No schema/engine contract change: `ENGINE_VERSION`
unchanged, no new `Unit`, no new preset, no new hook, no new category
leaf (`web-search` already exists).
