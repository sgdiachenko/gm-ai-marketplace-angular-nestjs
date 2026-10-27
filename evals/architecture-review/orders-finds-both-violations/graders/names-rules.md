---
type: llm
---

PASS if every CRITICAL and WARNING finding names the rule or skill section it relies on (for example the dependency direction, "controllers don't import the ORM", "pure domain code imports no Nest", or a numbered rule of nestjs-backend-architecture).
FAIL if a CRITICAL or WARNING finding is justified by prose alone.
