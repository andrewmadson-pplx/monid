# Design: add-connector-perplexity

Decision record for the Perplexity connector (new; not a v1 port). Only
the choices the declarative model forced are recorded; the input schema
mirrors the Search API reference
(https://docs.perplexity.ai/api-reference/search-post, 2026-11-06).

## D1 — Search API only

`POST https://api.perplexity.ai/search` with `Authorization: Bearer`.
Identity is inferred from `request.path` (design D22):
`perplexity#search`. No authored `endpoint:` pin.

## D2 — Dollar pool, price keyed by `search_type`

Rate card (https://docs.perplexity.ai/docs/getting-started/pricing,
2026-11-06): $5.00 per 1K requests, $1.00 per 1K with
`search_type: "fast"`, "for each successful `POST /search` request",
"no additional token-based charges". The vendor publishes dollar
prices, so the pool is US dollars (the exa posture).

The price depends on one request field, so the model is a COMPOSITE of
one PER_UNIT component per type (`web` 0.005, `fast` 0.001), counted
under the request's `search_type` (the kling posture of keying counts by
the price selector). `search_type` defaults to `web` at the binding so
estimate and evidence always have a key. `people` is not exposed: the
rate card lists no Search API price for it.

`max_results` is capped at 20 at the binding: the vendor allows up to 50
only for `people`.

## D3 — No consolidate; empty search bills 0

Responses are `{id, results}` (plus `server_time` per the reference)
with no usage object, so there is no vendor claim to pluck and the
derived fold settles (the keenable posture). A 200 with `results: []`
still counts as a successful request on the vendor's rate card, but
bills 0 to the buyer, the keenable and search1api posture. Every non-2xx settles as
a provider error with zero usage.

## D4 — Loose body

`z.looseObject`, as keenable: newer vendor parameters ride through.
Dates are `MM/DD/YYYY` strings with one- or two-digit month and day
(both drilled 2026-11-06), enforced by `pattern`.
