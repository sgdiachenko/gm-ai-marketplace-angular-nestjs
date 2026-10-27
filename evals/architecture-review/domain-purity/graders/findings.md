---
type: llm
---

PASS if the review flags `import { readFileSync } from 'node:fs';` (and the read in priceWithDiscount, or its `process.env` access) in server/src/orders/price-with-discount.ts as a violation because a pure domain function does no I/O and reads no configuration — it should receive the rules from its service — quotes a changed line verbatim, rates it CRITICAL or WARNING, and ends with `request_changes` or `comment` consistent with its own severities (any CRITICAL → request_changes).
FAIL otherwise.
