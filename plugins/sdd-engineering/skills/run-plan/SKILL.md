---
name: run-plan
description: "Runs the implementation half of the Spec-Driven Development flow from an approved Implementation Plan: implementer waves, full checks, plan-verifier, architecture review and code review with a bounded fix loop, closing the spec, and the commit/PR gate. Keeps state in a file so it resumes in a fresh chat."
argument-hint: "<plan path | slug> [spec ID | spec path] [--from implement|verify|review|close|pr] [extra instructions]"
disable-model-invocation: true
---

# /run-plan — implement an approved plan, spec-driven

You (the **main session**) orchestrate. The spec (`sdd-engineering:spec-creator`) and the plan (`sdd-engineering:implementation-planner`) already exist — the user runs those by hand; this skill never invokes either. Subagents can't ask the user anything, so every launch, question and hand-off goes through you. The agents' own files define *what* each one does; this skill defines only the **order, the gates, the hand-offs and the loops**.

Arguments: `$ARGUMENTS`

## Principles

1. **Paths, not pastes.** Agents get file paths, never a pasted plan, spec or report.
2. **Decisions are the user's.** Waivers, disputed findings, plan or spec problems and the PR are asked with your question tool — never assumed.
3. **Fresh agents, small prompts.** Never resume an implementer with a large context; a resumed agent re-reads everything it saw and is the most expensive call in the flow. Start a fresh one with a path instead.
4. **Small fixes in the main session.** ≤3 files and no new port, module or contract → edit here and re-run only the touched module's checks. After 5 implementer launches in one run, a fix beyond that bound needs the user's explicit yes first; say which files and why.
5. **One shared brief.** Write the paths every agent needs (profile, spec, plan, reports, state file) once to `<plans>/<slug>.brief.md`. Prompts then carry the brief path plus the task, not the same paths again.
6. **Bounded loops** — each has a maximum number of rounds and an exit to the user.
7. **Check the agent really ran.** A completion with implausibly few tool uses for the task (for example 0) means it did nothing: send it again with "execute now, synchronously".
8. **Line ranges, not whole shared files.** Give each agent the plan section or the exact `file:line` ranges it needs. Many agents re-reading the same large file is the largest avoidable cost.
9. **Short prompts.** The prompt carries the question and the paths. The standing rules (report formats, write scopes) live in the agent files, not in every launch.

## Phase 0 — Intake

1. **Profile.** Read `docs/sdd-profile.md` (or the path the user names). It gives `<specs>`, `<plans>` (defaults `docs/specs/`, `docs/plans/`), the check commands per module, skill lanes, architecture rules and guardrails. When it is missing, use the default paths for now.
2. **Parse `$ARGUMENTS`:**
   - plan: a path, or a slug → `<plans>/<slug>.md`. Required. No plan → stop and say: run `sdd-engineering:implementation-planner` first.
   - spec: a spec ID (`YYYY-MM-DD-<slug>`) or a path, or the one the plan names under *Decisions → Spec*. If it isn't `Status: approved`, ask whether to go on.
   - `--from <phase>` or an existing `<plans>/<slug>.impl.md` → resume: report the recorded phase in two lines and continue from it.
   - remaining text → extra instructions for this run (recorded in the state file).
3. **Complete the profile.** No profile → offer to draft it from the repository (`AGENTS.md` / `CLAUDE.md`, package scripts, CI config) using [profile-template.md](profile-template.md), and save it only after the user approves. Without check commands for a module the plan touches, ask the user for them before Phase 1.
4. **Sanity-check the plan** (don't re-plan): every step has `files`, `skills`, `done-when`; multi-agent → `W#` with non-overlapping `owns:` per wave; with a spec → every AC/EC/NFR is `covers:`-ed or out of scope; every `depends-on` points to a step or package in an **earlier** wave. A gap → stop and name it (it's the planner's to fix), unless the user says go.
   - **Design.** If the request, spec or plan mentions a mock-up or screenshot, the plan must list the image files under *Context → Design*. A design that exists only in chat → before any implementer starts, save each image under the profile's design path (ask the user for the files if they aren't on disk) and add the paths to the plan. Implementers get the image path, not a description.
   - **Live checks.** If *Review handoff → Manual verification* needs a paid or credentialed service, ask once now whether it is configured and what spend is acceptable, and record the answer in the state file. Never ask for, read or print a secret.
5. **State.** Create or refresh `<plans>/<slug>.impl.md` (below) and show the route in ≤5 lines: mode, waves, modules, what will be skipped.

### State file `<plans>/<slug>.impl.md`

```markdown
# impl: <feature>
Plan: <plans>/<slug>.md (multi-agent, waves: 1✔ 2…)   Spec: <spec ID>
Phase: review   Verify round: 1/2   Review round: 2/3
Extra instructions: <one line or none>

## Checks
Fingerprint: <value> — <full check table with exit codes>

## Waived / manual-only
- waived by user: <test or finding — reason>   (e.g. red on a clean HEAD)
- manual-only rows: <AC/NFR IDs and the exact manual step>

## Log
- <date> wave 1 done, checks green

## Review ledger
| F# | Source | Sev | file:line | Summary | Status | Round |
|---|---|---|---|---|---|---|
```

Reports go to `<plans>/<slug>.reports.md` (appended, one `##` per report).

## Phase 1 — Implement

- **Single-agent:** one `sdd-engineering:implementer`; prompt = brief path + plan path.
- **Multi-agent:** per wave, one `sdd-engineering:implementer` per `W#` of the wave, **all in one message**. Prompt = brief path + plan path + `W#` + "read the Constraints, your W# row and its steps, and load every skill those steps name (your agent file's rule)". Don't write "read only": it contradicts the agent file, and agents then skip the skills.
- A parallel batch that fails to launch is retried once as it was; if it fails again, launch the same agents in smaller groups. Record the failure in the state file.
- After each wave:
  1. Append the Implementation Reports to `<slug>.reports.md`.
  2. Run the **full** check table (below) once for the modules the wave touched — implementers in a wave only ran targeted checks.
  3. Failures: small and inside one `W#`'s files → fix here; larger → one **fresh** implementer with the failing lines + `W#` + plan path. At most 2 rounds per wave, then ask the user.
  4. **Infrastructure tests** (the profile's tests that need a database, a browser, …): on a red result, run the same files on a clean `git worktree` of `HEAD` first. Red there too → pre-existing: show it to the user to waive or fix as its own change (record it under *Waived*), not as a `W#` fix.
  5. A `blocked` report is a plan problem → show it; the user re-runs the planner or decides.

## Phase 2 — Verify (at most 2 rounds)

1. `sdd-engineering:plan-verifier` with the brief path (plan, spec, `<slug>.reports.md`), `Checks already run:` (the last full check table with exit codes) and the fingerprint, and the state file path for its *Waived / manual-only* section. It **writes the report itself** to `<plans>/<slug>.verification.md` and replies with the verdict, the open rows and the path; never retype or re-paste the matrix. This first pass is the one full matrix.
2. `verified` → Phase 3. `unmet` / `partial` rows → fix (small → here, else a fresh implementer with only those rows as its steps; a row that lacks a test gets the test written the same way).
3. Re-run the verifier with `Rows to re-check: <IDs>` and `Changed files: <paths>` only — it rewrites the same file. A second full matrix only once, right before Phase 6, and only if code changed since the last full pass. Still unmet after round 2 → ask: fix more / accept as partial (recorded) / stop.
4. `not-verifiable — plan ↔ requirement conflict` is never fixed in code — it's the user's call (re-plan, or a superseding spec).

## Phase 3 — Review + review-fix loop (at most 3 rounds)

**Round 1 — full review, one message, in parallel:**

- `architecture-review:architecture-reviewer` with the plan path (for *Review handoff → Architecture*) and `<slug>.reports.md`;
- built-in `/code-review` (the `code-review` skill, level `medium`) for correctness bugs, which the architecture reviewer doesn't look for;
- built-in `/security-review` when the plan's *Review handoff → Security* is not "none", or the diff touches input handling, authentication, secrets, queries or process spawns. If it isn't available in the session, say so in the summary.

**Ledger.** Merge all findings into the *Review ledger* as `F#`; dedupe the same file:line + issue across sources (highest severity, both sources listed).

**Triage** — show the ledger, then:

- `CRITICAL` / `WARNING` → `fixed`, or `waived by user: <reason>`. Never silently dropped.
- `SUGGESTION` → one multi-select question: which to apply, each with a one-line user-visible impact. A rule the user set up front (for example "fix only CRITICAL/WARNING") skips the question but not the list: show the suggestions and their impact in the round summary. A suggestion whose impact is wrong or missing data in a `must` flow is a `WARNING`, whatever the reviewer labelled it.
- A finding whose evidence doesn't hold, that is pre-existing code, or that contradicts the approved plan or spec → `disputed` with the reason; the user decides.
- A finding meaning the **plan or spec** is wrong → not a code fix; stop and hand it to the user.

**Fix.**

- ≤3 files, local, no new port, module or contract → fix here.
- Otherwise → **fresh** implementers, one per disjoint file group (in parallel when groups don't overlap); prompt = the `F#` rows as steps (`files`, the rule, `done-when: finding no longer applies`) + plan path for the Constraints. Never resume an earlier implementer.
- Record the files the round changed; run targeted, then full checks for the touched modules. If a fix changed behaviour an AC covers → the verifier on just those rows.

**Round 2+ — delta re-review.** Only the reviewers that still have open findings: the architecture reviewer with `Re-check: <its F#>` and `Fix files: <files changed this round>` (its delta mode); `/code-review` on this round's fix **diff** only, with "changed lines only" in its prompt — handed whole files it reviews them whole and returns findings in code this round never touched. New findings join the ledger with the round number.

**Exit** when no `CRITICAL` / `WARNING` is `open`. After round 3 with open ones, or a round that added more findings than it closed → ask: another round / waive (with reason) / stop.

## Phase 4 — Manual verification (only if the plan asks)

The plan's *Review handoff → Manual verification* isn't "none" → run the app (the profile's run command, the `run` skill, or a browser tool) and check the listed behaviour live. A regression → a new `F#` (source: manual) → Phase 3 fix step.

Browser automation tips: prefer one-shot page probes and separate wait steps over long polling loops inside one call; take a screenshot only after the page settles, since one taken right after navigation can show a stale frame; if a browser tool fails 3 times, stop and record what couldn't be verified instead of retrying. Sign in from a separate browser profile or a private window, or sign out afterwards: cookies are per host, not per port, so signing in to the app on one `localhost` port replaces the user's own session on every other port.

## Phase 5 — Close the spec

When a spec drives the run and verification passed:

1. In the spec, change `Status: approved` to `Status: implemented`, and the same in its row in `<specs>/README.md`.
2. The run added or changed a command (dev server, seed, full-stack start, a test script) → update the profile's *Modules* and *Live checks* in the same change and say so in the summary. Later runs trust the profile, not the README.
3. Append an `## Implementation` section to the spec — append only; never edit the requirements above it:

   ```markdown
   ## Implementation
   Plan: <plans>/<slug>.md · Verification: <plans>/<slug>.verification.md · Date: <YYYY-MM-DD>

   | ID | Evidence | Verdict |
   |---|---|---|
   | AC-1 | `path/to/test.ts:42` | met |
   ```

4. The plan's *Review handoff → Docs* isn't "none" → list the docs work in the summary and ask whether to write it now (in the main session) or leave it for later.

## Phase 6 — Commit / PR gate

1. Run the full check table for every module the run touched, record the fingerprint.
2. List what nobody ran (infrastructure tests, end-to-end suites, manual-only rows); offer to run them or leave them to CI.
3. Show the summary and ask: commit / open PR / stop. Commits and `gh pr create` only on an explicit yes. The PR body links `<plans>/<slug>.verification.md` (and the retro, if one was run).

## Check table

The commands come from the profile's *Modules* (full checks) and *Architecture rules* (checks) — the commands CI runs. A mirrored-contract sync check applies when the run changed a mirrored contract.

Run each as `cmd >"$TMPDIR/<name>.txt" 2>&1; echo "exit=$?"`; read the output only on a non-zero exit, and then only the failing lines. After a full green run, record the fingerprint next to the table in the state file:

```sh
"${CLAUDE_SKILL_DIR}/scripts/fingerprint.sh" --exclude <plans>
```

## Summary (at the end, and whenever you stop to ask)

```
## run-plan — <feature>  (<plans>/<slug>.impl.md)
Plan: <mode>, <n> steps, <w> waves — done | <which not>
Checks: green @ <fingerprint> | failing: <commands>
Verification: verified | with gaps (<rows>)
Review: <rounds> rounds — fixed n, waived n (<F#>), disputed n
Spec: implemented | not closed (<why>)
Not run: <infrastructure / e2e / manual>
Next: <the one decision the user has to make>
```
