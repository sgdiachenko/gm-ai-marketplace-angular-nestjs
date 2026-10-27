---
description: A NestJS layering question loads a paved-path skill by its namespaced name
tags: [namespaces]
plugins: ["../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review", "../../../plugins/sdd-engineering"]
allowed_tools: [Skill, Read, Glob, Grep]
runs: 1
max_turns: 20
timeout_seconds: 600
---

In a NestJS API on Mongoose, I want to add a rule that an order can be cancelled only within 30 minutes of being placed. Should the rule live in the controller, the service or somewhere else, and may that file import the Mongoose model? Answer in at most six lines.
