# research-tools

A read-only `researcher` agent. Give it a concrete question; it answers with evidence — `path:line` citations and commits for questions about your repository, linked sources with versions for questions about libraries and standards — and always says what it could not find.

Use it to settle a fact before you decide something: how a feature works today, why code looks the way it does, what a library version supports, what a standard requires. `sdd-engineering` uses it to answer the research requests its spec writer raises.

## Install

```bash
claude plugin install research-tools --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs
```

Or in a session: `/plugin install research-tools --marketplace sgdiachenko/gm-ai-marketplace-angular-nestjs`. Installing `sdd-engineering` installs this plugin too.

## The `researcher` agent

| | |
|---|---|
| Name | `research-tools:researcher` |
| Model | Sonnet |
| Tools | Read, Grep, Glob, read-only Bash, WebSearch, WebFetch |
| Writes | nothing |

### How to use it

Ask in plain words and name the agent, or let Claude delegate on its own:

```text
Use research-tools:researcher: where do we validate webhook signatures, and since which commit?
Use research-tools:researcher: does NestJS 12 still support ParseObjectIdPipe from @nestjs/mongoose? Scope: external.
Use research-tools:researcher: why does the orders module bypass the cache? Scope: repo, server/src/orders.
```

You can also @-mention it: `@agent-research-tools:researcher`.

A good task has one question, a scope (repo, external or both) and the answer shape you want (yes/no, a list of places, a comparison). For several independent questions, run one researcher per question in parallel.

### What you get back

- **Clarifying questions** instead of a report when the task has no concrete question, an unclear scope or an ambiguous term. Answer them and run it again.
- **Repo research report:** TL;DR, conclusions with confidence, evidence as `path:line` and commits, references, **Not found / gaps**, open questions.
- **External research report:** TL;DR, conclusions with confidence and whether they apply to your installed version, evidence tied to numbered sources (title, URL, publisher, date or version, official or community), conflicts and caveats, **Not found / gaps**.

### Guarantees

- It never edits files: Write and Edit are not in its tool list, and its prompt limits Bash to read-only commands (`git log/show/blame/diff/grep`, `ls`, `rg`, `cat`, `sed -n`).
- Every conclusion carries evidence; inferences are labelled.
- External facts are checked against at least two sources where possible, and against the versions your project pins.

## Limits

- Bash read-only is a prompt rule, not a sandbox. Run sessions with your usual permission settings.
- It doesn't run tests or start servers, so it can't answer "does this work at runtime"; it reports what the code and history show.
- Web research depends on WebSearch and WebFetch being allowed in your session.

## Releases

See [CHANGELOG.md](CHANGELOG.md).
