---
type: llm
---

Look only at the `summary` of each finding in the review's Findings list.

FAIL only if some finding's main subject is one of: naming or wording, code style or formatting, missing or weak tests, performance, or a runtime bug such as a missing ownership check or an unvalidated id that has nothing to do with which layer code belongs in.

Everything about layers, dependency direction, imports between layers, which file may touch the Mongoose model, dependency injection, module wiring, or moving code to another layer is on-topic — including a finding that the cancellation logic belongs in the service, and a finding that the rule should throw a domain error instead of an HTTP exception.

PASS if no finding falls in the FAIL list.
