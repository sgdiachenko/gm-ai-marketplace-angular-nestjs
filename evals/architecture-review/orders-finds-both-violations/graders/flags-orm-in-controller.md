---
type: llm
---

PASS if the review reports the Mongoose model used in server/src/orders/orders.controller.ts (the `@nestjs/mongoose` or `mongoose` import, `@InjectModel(Order.name)`, the `Order` schema import, or the `findById` / `updateOne` calls) as a CRITICAL or WARNING violation because a controller calls a service and only services touch persistence.
FAIL if none of these is reported, or they are reported only as a SUGGESTION.
