---
type: llm
---

PASS if the review reports `import { BadRequestException } from '@nestjs/common';` in server/src/orders/can-cancel-order.ts as a CRITICAL or WARNING violation because a pure domain rule must not depend on Nest (or on HTTP exceptions).
FAIL if this import is not reported, or is reported only as a SUGGESTION.
