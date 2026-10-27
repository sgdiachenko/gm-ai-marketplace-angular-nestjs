---
type: llm
---

PASS if the review reports the `HttpClient` injected or called in the StatusBadge component (a shared presentational component) as a WARNING or CRITICAL finding, because HTTP calls belong in an API service and shared UI holds no data access.
FAIL if neither the `HttpClient` import, its injection nor the `this.http.get` call is reported, or it is reported only as a SUGGESTION.
