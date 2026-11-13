# Design: add-perplexity-embeddings

## D1: claim the vendor's cost, one card line per model

- Context: Embeddings prices are per input token and differ by model.
  Every 200 reports its own charge in `usage.cost.total_cost` (USD),
  with `prompt_tokens` beside it.
- Decision: `consolidate` claims `total_cost`, as `perplexity#agent/fast`
  does. The card pins each model's price (embeddings quickstart,
  2026-11-13) as its own PER_UNIT token line, the `octen#embedding`
  model-selected shape, so the hold and `usage.mismatch` stay meaningful.
- Consequence: on the recorded fixtures the claim equals the fold
  (6 tokens x $0.004/M = 2.4e-8; 2 x $0.03/M = 6e-8). A gap means a
  repricing and is the re-audit signal.

## D2: strict body, documented models only

- Decision: the body is a `z.strictObject` and `model` is an enum of the
  two documented models. An undocumented model would bill at a rate the
  card does not hold, so it is rejected before spend. `encoding_format`
  omits `float`, which the API rejects. The per-model `dimensions`
  ceiling (1024 for 0.6b, 2560 for 4b) is cross-field and refinements do
  not survive `z.toJSONSchema`, so it lives in the field description and
  the API answers a violation as a 400 (the minimax posture).

## D3: the hold

- Decision: `estimate` counts the UTF-8 bytes of `input` under the
  selected model's line (the `octen#embedding` ceiling). Byte-level
  tokenizers spend at least one byte per token; receipts on 2026-11-13
  read 6 tokens for 32 bytes.

## D4: provider categories

- Decision: the provider lists `embeddings` beside `web-search` and
  `ai-search`, as `add-perplexity-agent-fast` added `ai-search`, so
  provider categories cover every endpoint.
