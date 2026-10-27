---
description: Approves a behaviour-preserving rename without inventing violations
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
diff --git a/server/src/reports/score.ts b/server/src/reports/score.ts
--- a/server/src/reports/score.ts
+++ b/server/src/reports/score.ts
@@ -1,10 +1,11 @@
 export interface ScoreRow {
   id: string;
   score: number;
 }

-export function summarize(rows: ScoreRow[]) {
-  return rows.map((r) => ({ id: r.id, score: r.score }));
+// Renamed locals for readability; behaviour unchanged.
+export function summarize(rows: ScoreRow[]) {
+  return rows.map((row) => ({ id: row.id, score: row.score }));
 }
```
