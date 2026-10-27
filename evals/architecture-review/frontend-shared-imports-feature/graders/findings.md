---
type: llm
---

PASS if the review flags `import { OrderStatus } from '../../../features/orders/models/order-status';` in client/src/app/shared/ui/status-badge/status-badge.ts as a CRITICAL or WARNING violation because `shared/` must not import a feature (dependency direction app shell → features → shared), quotes that line verbatim, and ends with `request_changes` or `comment` consistent with its own severities (any CRITICAL → request_changes).
FAIL otherwise.
