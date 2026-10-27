---
description: Flags a shared UI component that imports a feature, and HTTP called from a component
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
diff --git a/client/src/app/shared/ui/status-badge/status-badge.ts b/client/src/app/shared/ui/status-badge/status-badge.ts
new file mode 100644
--- /dev/null
+++ b/client/src/app/shared/ui/status-badge/status-badge.ts
@@ -0,0 +1,19 @@
+import { Component, computed, inject, input } from '@angular/core';
+import { HttpClient } from '@angular/common/http';
+import { OrderStatus } from '../../../features/orders/models/order-status';
+
+@Component({
+  selector: 'app-status-badge',
+  template: `<span [class]="tone()">{{ label() }}</span>`,
+})
+export class StatusBadge {
+  private readonly http = inject(HttpClient);
+  readonly status = input.required<OrderStatus>();
+  protected readonly label = computed(() => this.status().toUpperCase());
+  protected readonly tone = computed(() => (this.status() === 'cancelled' ? 'muted' : 'active'));
+
+  refresh(id: string) {
+    return this.http.get(`/api/orders/${id}/status`);
+  }
+}
```
