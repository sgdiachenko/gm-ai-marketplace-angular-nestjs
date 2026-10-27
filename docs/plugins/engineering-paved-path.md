# engineering-paved-path — maintainer notes

Shared practice skills for Angular and NestJS. `architecture-review` and `sdd-engineering` depend on it (`^2.0.0`), so a major release here forces a release of both. Spec: `specs/sdd-engineering.md`.

## Where each skill came from

| Skill | Origin | Changes in this plugin |
|---|---|---|
| `angular-developer` | [angular/skills](https://github.com/angular/skills/tree/46e60f96903fa285de0c0298222931b7175a08ee/angular-developer) at `46e60f9` (2026-10-27), generated from `skills/dev-skills/` in [angular/angular](https://github.com/angular/angular) (`e36a63e20e30`); MIT, Google LLC | none: `SKILL.md` and `references/` are byte-identical; `LICENSE` (the MIT license of `angular/angular`, since `angular/skills` ships none) and `NOTICE.md` added |
| `nestjs-best-practices` | new, 2.0.0 | written for this plugin from the NestJS docs and the 11 → 12 migration guide; no official NestJS skill was found on 2026-10-27 (only community ones, not redistributed) |
| `frontend-architecture` | `sgdiachenko/gm-vocabulary` PR #4 (`harness/agents-md`), `.claude/skills/frontend-architecture/` with `references/placement-matrix.md` and `references/sources.md` | generalized: product name, app paths, `local/folder-boundaries` lint and its npm scripts, Nx libraries and Nx sources, the ddd-conventions glossary and contexts, the required root SignalStore, the `<Name>Container` naming, legacy notes and known-issue ids removed; the `app → features → shared` direction and the delete test kept from the 1.x skill; an MVP / MVVM mapping, severities and a review checklist added |
| `nestjs-backend-architecture` | same PR, `.claude/skills/nestjs-backend-architecture/` with `references/layering-matrix.md` and `references/sources.md` | generalized: product name, `apps/api` paths, Nx test command, lint rule names, pinned model and collection names, the contract spec path, legacy notes removed; Mongoose generalized to "the ORM's Nest integration"; the ddd-conventions link replaced by its two rules that matter here (pure domain functions, no shared persistence across modules); severities, a review checklist and a diagnosis table added |
| `security` | gm-ai-marketplace 1.0.0 (from dev-digest) | stack sections, examples and checklists rewritten for Angular and NestJS; the OWASP structure, confidence gating and severity table kept |
| `engineering-insights` | gm-ai-marketplace 1.0.0 | unchanged |

`ddd-conventions` from the same PR was not taken: its content is the product's glossary and bounded contexts.

Removed in 2.0.0, still in `gm-ai-marketplace`: `react-best-practices`, `next-best-practices`, `fastify-best-practices`, `react-testing-library`, `onion-architecture`. `scripts/check-marketplace.mjs` fails if a plugin names them again (CHANGELOGs excepted).

Before adding a third-party skill: confirm its license allows redistribution, keep its `LICENSE` in the skill folder, add a `NOTICE.md` that names the upstream commit and lists changes, and add a row here.

## Updating `angular-developer`

The skill is vendored, not linked: plugin dependencies can't point at a repository that isn't a Claude Code marketplace, and `angular/skills` isn't one. To take a newer upstream version:

```bash
tmp="$(mktemp -d)"
git clone --depth 1 https://github.com/angular/skills.git "$tmp/skills"
git -C "$tmp/skills" log -1 --format='%H %cI'
rsync -a --delete --exclude LICENSE --exclude NOTICE.md "$tmp/skills/angular-developer/" plugins/engineering-paved-path/skills/angular-developer/
rm -rf "$tmp"
```

Then update the commit and date in the skill's `NOTICE.md` and in the table above, review the diff (a new reference file, a changed description), run `scripts/validate.sh`, bump the plugin's patch version (minor if the skill gained a capability agents rely on) and add a CHANGELOG entry. Never edit the vendored files by hand.

## Context cost

Not measured on this copy yet. Measure with `claude plugin details engineering-paved-path` and record it here: always-on cost (descriptions of six skills) and the largest on-invoke body (`angular-developer` links 43 reference files and loads only the ones a task needs).

## Planned

- An Angular testing skill beyond `angular-developer`'s testing references, if implementers keep testing views instead of controllers or presenters.
- Measured context cost and an `architecture-review` eval run on the new fixtures.
