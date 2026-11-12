# Design: add-perplexity-agent-fast

## D1: claim the vendor's cost, pin the card for the hold

- Context: Agent API prices are per token and per tool call, and the
  model behind a preset can change. Every 200 reports its own charge in
  `usage.cost.total_cost` (USD), with token and tool counts beside it.
- Decision: `consolidate` claims `total_cost` (the exa `costDollars` and
  dataforseo `cost` posture), so the bill is the vendor's charge. The
  card pins the `fast` preset's prices (presets and models pages,
  2026-11-12) so the hold and `usage.mismatch` stay meaningful. Cache
  writes are $0.125 per million: the models page does not list them, and
  the rate is derived from 2026-11-12 receipts (`cache_creation_cost`
  / `cache_creation_input_tokens`).
- Consequence: receipts are rounded to $0.00001, so `usage.mismatch`
  carries the unrounded fold on most runs (happy fixture: claim 0.00148,
  derived 0.001475725). A gap beyond that rounding means a repricing or a
  preset model change and is the re-audit signal.

## D2: strict body, one preset per endpoint

- Decision: the body is a `z.strictObject` (the dataforseo posture) and
  `toRequest` sets `preset: "fast"`. A caller-supplied `model`, `tools`
  or `preset` would change the card and the hold, so each is rejected
  before spend. Other presets become their own endpoints
  (`perplexity#agent/<preset>`), the openai one-endpoint-per-model shape.

## D3: the hold

- Decision: `estimate` counts one web search, 8,000 cache-write tokens
  and `max_output_tokens` (2,000 when absent). Receipts on 2026-11-12
  read 3,586 to 6,244 input tokens; pricing all of them at the
  cache-write rate keeps the hold above the claim.
