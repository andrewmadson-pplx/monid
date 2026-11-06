# perplexity-connector (delta)

## ADDED Requirements

### Requirement: Perplexity provider definition
The perplexity provider SHALL declare name `perplexity`,
`request.baseUrl` `https://api.perplexity.ai`, auth
`presets.auth.bearer()`, timeouts 30 s / 30 s, one credit pool `default`
("US dollars"), and NO `usage.consolidate` (responses carry no usage
receipt).

### Requirement: Search endpoint
The connector SHALL provide `POST /search` (`perplexity#search`,
`web-search`). Input SHALL be a loose body: `query` required
(non-empty); `search_type` (`web` default, `fast`), `max_results`
(1-20), `max_tokens` and `max_tokens_per_page` (1-1000000), `country`
(2 characters), `search_language_filter` (up to 20 two-character codes),
`search_domain_filter` (up to 20), `search_recency_filter`
(`hour`/`day`/`week`/`month`/`year`), and the four `MM/DD/YYYY` date
filters optional; unspecified keys SHALL pass through. Usage SHALL be
COMPOSITE: `web` PER_UNIT $0.005, `fast` PER_UNIT $0.001, counted under
the request's `search_type`, 0 for `results: []`.

#### Scenario: A web search bills $0.005
- **WHEN** `POST /search` returns 200 with two results and no
  `search_type`
- **THEN** usage is `{credits: {default: 0.005}, evidence: {web: 1}}`

#### Scenario: A fast search bills $0.001
- **WHEN** `POST /search` with `search_type: "fast"` returns 200 with
  results
- **THEN** usage is `{credits: {default: 0.001}, evidence: {fast: 1}}`

#### Scenario: An empty search is free
- **WHEN** `POST /search` returns 200 with `results: []`
- **THEN** usage is `{credits: {}, evidence: {web: 0}}`

#### Scenario: A 401 is data, zero usage
- **WHEN** the endpoint is called with an invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the vendor envelope
  `{error: {message, type, code}}` rides through

#### Scenario: Unpriced search types are rejected
- **WHEN** `POST /search` is called with `search_type: "people"` or
  `max_results: 21`
- **THEN** the run fails INVALID_INPUT
