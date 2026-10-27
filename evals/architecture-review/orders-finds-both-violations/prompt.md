---
description: Finds the Nest import in a pure domain rule and the Mongoose model queried from a controller
tags: [architecture-review]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/architecture-review"]
allowed_tools: [Agent, Read, Glob, Grep, Skill]
runs: 3
max_turns: 30
timeout_seconds: 600
---

Use the architecture-review:architecture-reviewer agent on the diff below and show me its review exactly as the agent returned it, without rewording, summarising or adding your own corrections.

Environment notes for the agent: the diff is the complete scope and its files are not on disk, so review the diff text itself. There is no project profile and no project documentation, so the default rules are the engineering-paved-path skills: nestjs-backend-architecture for `server/` (a NestJS API on Mongoose: controller → service → persistence, pure domain functions beside their service) and frontend-architecture for `client/` (an Angular app with `src/app/features/<feature>/` and `src/app/shared/`). List the mechanical checks as not run.

```diff
diff --git a/server/src/orders/can-cancel-order.ts b/server/src/orders/can-cancel-order.ts
new file mode 100644
--- /dev/null
+++ b/server/src/orders/can-cancel-order.ts
@@ -0,0 +1,10 @@
+import { BadRequestException } from '@nestjs/common';
+
+const CANCEL_WINDOW_MS = 30 * 60 * 1000;
+
+export function assertCanCancel(placedAt: Date, now: Date): void {
+  if (now.getTime() - placedAt.getTime() > CANCEL_WINDOW_MS) {
+    throw new BadRequestException('The cancellation window has closed');
+  }
+}
diff --git a/server/src/orders/orders.controller.ts b/server/src/orders/orders.controller.ts
--- a/server/src/orders/orders.controller.ts
+++ b/server/src/orders/orders.controller.ts
@@ -1,12 +1,24 @@
-import { Controller, Get, Param } from '@nestjs/common';
+import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
+import { InjectModel } from '@nestjs/mongoose';
+import { Model } from 'mongoose';
+import { Order } from './order.schema.js';
+import { assertCanCancel } from './can-cancel-order.js';
 import { OrdersService } from './orders.service.js';
 
 @Controller('v1/orders')
 export class OrdersController {
-  constructor(private readonly orders: OrdersService) {}
+  constructor(
+    private readonly orders: OrdersService,
+    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
+  ) {}
 
   @Get(':id')
   findOne(@Param('id') id: string) {
     return this.orders.findOne(id);
   }
+
+  @Post(':id/cancel')
+  async cancel(@Param('id') id: string) {
+    const order = await this.orderModel.findById(id).exec();
+    if (!order) throw new NotFoundException();
+    assertCanCancel(order.placedAt, new Date());
+    await this.orderModel.updateOne({ _id: id }, { status: 'cancelled' }).exec();
+    return { status: 'ok' };
+  }
 }
```
