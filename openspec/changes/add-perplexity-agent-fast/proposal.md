# Proposal: add-perplexity-agent-fast

## Why

`remove-cloro-copilot-perplexity` removed `cloro#monitor/perplexity`
because cloro can no longer reach Perplexity's answers. The catalog now
has no endpoint that returns a Perplexity answer with cited sources.
Perplexity's own Agent API does this over the same base URL and key as
`perplexity#search`. One synchronous endpoint, no new engine capability.

## What Changes

- **connectors/perplexity/endpoints/agent-fast**: `perplexity#agent/fast`
  (`POST /v1/agent`, `ai-search`). `toRequest` sets `preset: "fast"`: one
  web search, then an answer from `openai/gpt-6-luna` with inline
  citations and the search results it used. Input is a strict body:
  `input` required (non-empty), `instructions` and `max_output_tokens`
  (at least 1) optional.
- **Billing (design D1)**: `usage.consolidate` claims the response's
  `usage.cost.total_cost` (USD) and absorbs `usage.cost` from the output.
  COMPOSITE card: `input_token` $0.10/M, `cached_input_token` $0.01/M,
  `cache_write_token` $0.125/M, `output_token` $0.50/M, `web_search`
  $0.001. `evidence` counts the receipt's tokens and searches.
- **connectors/perplexity/provider.ts**: summary, description and
  categories cover both endpoints. Auth, base URL, timeouts and the
  `default` pool are unchanged.
- Fixtures: happy, incomplete and 401 are all RECORDED (2026-11-12).

## Capabilities

- `perplexity-connector`.

## Non-goals

- Other presets (`low` through `ultra`) and caller-chosen `model` or
  `tools`: each needs its own card and hold, and the longer presets can
  outlast the 30 s timeout.
- Streaming.

## Impact

New endpoint in an existing connector. No schema or engine contract
change: `ENGINE_VERSION` unchanged, no new `Unit`, preset, hook or
category leaf (`ai-search` already exists).
