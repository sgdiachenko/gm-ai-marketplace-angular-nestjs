---
description: Flags filesystem and environment access added to a pure domain rule
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
diff --git a/server/src/orders/price-with-discount.ts b/server/src/orders/price-with-discount.ts
--- a/server/src/orders/price-with-discount.ts
+++ b/server/src/orders/price-with-discount.ts
@@ -1,8 +1,11 @@
+import { readFileSync } from 'node:fs';
 import type { DiscountRules } from './discount-rules.js';
 
-export function priceWithDiscount(total: number, tier: string, rules: DiscountRules): number {
+export function priceWithDiscount(total: number, tier: string): number {
+  const rules: DiscountRules = JSON.parse(readFileSync(process.env.DISCOUNT_RULES_PATH ?? 'rules.json', 'utf8'));
   const rate = rules.byTier[tier] ?? 0;
   return Math.round(total * (1 - rate) * 100) / 100;
 }
```
