# perplexity-connector (delta)

## ADDED Requirements

### Requirement: Agent fast endpoint
The connector SHALL provide `perplexity#agent/fast` (`POST /v1/agent`,
`ai-search`). `toRequest` SHALL set `preset: "fast"`. Input SHALL be a
strict body: `input` required (non-empty), `instructions` and
`max_output_tokens` (at least 1) optional; any other key SHALL fail
INVALID_INPUT. `usage.consolidate` SHALL claim `usage.cost.total_cost`
into the `default` pool and remove `usage.cost` from the output.

#### Scenario: An answer bills the reported cost
- **WHEN** `POST /v1/agent` returns 200 with `usage.cost.total_cost`
  0.00148
- **THEN** usage credits are `{default: 0.00148}`, evidence counts the
  receipt's input, cached input, cache write and output tokens and its
  web searches, and the output has no `usage.cost`

#### Scenario: A capped answer is still billed
- **WHEN** `max_output_tokens` cuts the answer off and the response has
  status `incomplete`
- **THEN** the run completes and bills the reported cost

#### Scenario: A 401 is data, zero usage
- **WHEN** the endpoint is called with an invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`

#### Scenario: Rate-card-changing keys are rejected
- **WHEN** the body carries `model`, `tools`, `preset` or `stream`
- **THEN** the run fails INVALID_INPUT

## MODIFIED Requirements

### Requirement: Perplexity provider definition
The perplexity provider SHALL declare name `perplexity`,
`request.baseUrl` `https://api.perplexity.ai`, auth
`presets.auth.bearer()`, timeouts 30 s / 30 s, one credit pool `default`
("US dollars"), categories `web-search` and `ai-search`, and NO
provider-level `usage.consolidate` (the Search API carries no usage
receipt; the agent endpoint declares its own).
