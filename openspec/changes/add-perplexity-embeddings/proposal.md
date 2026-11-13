# Proposal: add-perplexity-embeddings

## Why

The catalog's only embeddings endpoint is `octen#embedding`. Perplexity's
Embeddings API returns retrieval vectors over the same base URL and key
as `perplexity#search` and `perplexity#agent/fast`. One synchronous
endpoint, no new engine capability.

## What Changes

- **connectors/perplexity/endpoints/embeddings**: `perplexity#embeddings`
  (`POST /v1/embeddings`, `embeddings`). Input is a strict body: `input`
  (a non-empty string or 1 to 512 non-empty strings) and `model` (`pplx-embed-v1-0.6b` or
  `pplx-embed-v1-4b`) required, `dimensions` (128 to 2560) and
  `encoding_format` (`base64_int8` or `base64_binary`) optional.
- **Billing (design D1)**: `usage.consolidate` claims the response's
  `usage.cost.total_cost` (USD) and absorbs `usage.cost` from the output.
  COMPOSITE card, one per-token line per model: `embed_v1_0_6b` $0.004/M,
  `embed_v1_4b` $0.03/M. `evidence` keys `usage.prompt_tokens` under the
  selected model's line.
- **connectors/perplexity/provider.ts**: summary, description and
  categories cover all three endpoints. Auth, base URL, timeouts and the
  `default` pool are unchanged.
- Fixtures: happy (0.6b, int8), binary (4b) and 401 are all RECORDED
  (2026-11-13).

## Capabilities

- `perplexity-connector`.

## Non-goals

- Contextualized embeddings (`POST /v1/contextualizedembeddings`): a
  different body shape (documents of chunks) and response nesting; it
  becomes its own endpoint.
- Decoding vectors to floats: the output carries the vendor's base64
  strings unchanged.

## Impact

New endpoint in an existing connector. No schema or engine contract
change: `ENGINE_VERSION` unchanged, no new `Unit`, preset, hook or
category leaf (`embeddings` already exists).
