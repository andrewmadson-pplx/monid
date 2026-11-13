# perplexity-connector (delta)

## ADDED Requirements

### Requirement: Embeddings endpoint
The connector SHALL provide `perplexity#embeddings`
(`POST /v1/embeddings`, `embeddings`). Input SHALL be a strict body:
`input` (a non-empty string or 1 to 512 non-empty strings) and `model` (`pplx-embed-v1-0.6b`
or `pplx-embed-v1-4b`) required, `dimensions` (integer, 128 to 2560) and
`encoding_format` (`base64_int8` or `base64_binary`) optional; any other
key or value SHALL fail INVALID_INPUT. `usage.consolidate` SHALL claim
`usage.cost.total_cost` into the `default` pool and remove `usage.cost`
from the output.

#### Scenario: Vectors bill the reported cost
- **WHEN** `POST /v1/embeddings` with `pplx-embed-v1-0.6b` returns 200
  with `usage.cost.total_cost` 2.4e-8 and `prompt_tokens` 6
- **THEN** usage credits are `{default: 2.4e-8}`, evidence is
  `{embed_v1_0_6b: 6}`, and the output has no `usage.cost`

#### Scenario: The 4b model bills under its own line
- **WHEN** the request selects `pplx-embed-v1-4b`
- **THEN** evidence counts `prompt_tokens` under `embed_v1_4b`

#### Scenario: A 401 is data, zero usage
- **WHEN** the endpoint is called with an invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`

#### Scenario: Undocumented models and unknown keys are rejected
- **WHEN** the body omits `model`, names another model, sets
  `encoding_format: "float"`, `dimensions` below 128, or an unknown key
- **THEN** the run fails INVALID_INPUT

## MODIFIED Requirements

### Requirement: Perplexity provider definition
The perplexity provider SHALL declare name `perplexity`,
`request.baseUrl` `https://api.perplexity.ai`, auth
`presets.auth.bearer()`, timeouts 30 s / 30 s, one credit pool `default`
("US dollars"), categories `web-search`, `ai-search` and `embeddings`,
and NO provider-level `usage.consolidate` (the Search API carries no
usage receipt; the agent and embeddings endpoints declare their own).
