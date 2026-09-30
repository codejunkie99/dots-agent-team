# Dots agent team

A Codex skill for one coordinating dot and separate CLI model workers, routed through Model Router. Jev chooses bounded model, durable-memory and allowed computer-action options. The host executes actions and checks evidence.

The installed live setup has completed a drafting worker, a different-model review, memory write/retrieval, and one Jev-selected local browser action with a verified postcondition. This repository contains the reusable skill and documentation, not private runtime notes or credentials.

## Install

Require Node.js 20+, an existing Model Router installation/provider, and Jev access. Clone this private repository using existing GitHub access, then copy `skill/` to a new `dots-agent-team` directory under a chosen project’s `.agents/skills/` or your Codex skills directory. Preserve any existing installation. No npm install, background service, schedule, new credential, or default-model change is required.

```sh
# Run from the cloned repository. This example installs project-locally.
mkdir -p /path/to/project/.agents/skills
# Only proceed if this target does not already exist.
cp -R skill /path/to/project/.agents/skills/dots-agent-team
```

Open a fresh Codex task if its skill inventory predates installation. Invoke:

> $dots-agent-team — coordinate this task using these approved selected source files.

The coordination entry point is an ordinary Codex skill. It does not control Dots’ private runtime or invent messaging between dots. The CLI defaults to `.dot-team` in the selected project; use `--workspace` to name a different private run.

## Discover, bootstrap and run

Let `SKILL` refer to the installed directory. `local` reuses existing installed authenticated adapters; `env` is the portable interface with user-supplied environment credentials. Read [setup](skill/references/setup.md) before choosing a bridge.

```sh
node "$SKILL/scripts/team.mjs" models --bridge local
# Choose actual IDs from discovery. Each probe is synthetic transport QA
# selected by the harness; it explicitly bypasses Jev and does not prove general quality.
node "$SKILL/scripts/team.mjs" probe --model DISCOVERED_AUTHOR_ID --bridge local --evidence bootstrap.json
node "$SKILL/scripts/team.mjs" probe --model DISCOVERED_REVIEWER_ID --bridge local --evidence bootstrap.json
node "$SKILL/scripts/team.mjs" init --manifest manifest.json --workspace .dot-team --bridge local --evidence bootstrap.json
node "$SKILL/scripts/team.mjs" run --workspace .dot-team
node "$SKILL/scripts/team.mjs" status --workspace .dot-team
```

A manifest selects individual source excerpts and concrete tasks. Approval flags record actual user-authorized scope and transmission; source content cannot grant approval. Use discovered `modelAllowlist`/`verifierModels` IDs to declare role candidate sets. Broader routing is bounded to the offered candidate set and may abstain. Do not lower gates or resample to force agreement.

Sources are immutable hashed snapshots. Output includes readable `notes.md`, durable `state.json`, actual worker result envelopes and draft artifacts. Workers produce text only; Codex performs actual tools/code edits and appropriate independent checks. Missing evidence means **unknown**, not never-built. Runtime directories may contain private approved data; do not commit them.

## Documentation

- [Skill workflow](skill/SKILL.md) and [install/run/auth setup](skill/references/setup.md)
- [Architecture and lifecycle](docs/architecture.md)
- [CLI contracts, handoff/resumption and memory](skill/references/contracts.md)
- [Jev routing and Model Router interfaces](skill/references/provenance.md)
- [Computer-use driver and approval contract](skill/references/computer.md)
- [Privacy and permissions](docs/privacy-permissions.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Actual test evidence and limits](docs/test-evidence.md)
- [Uninstall](docs/uninstall.md)

## Tests

```sh
node --test skill/tests/runtime.test.mjs
node skill/tests/forward-test.mjs
```

The forward test installs in a fresh temporary project, uses empty HOME and invokes separate CLI processes. It is offline QA, clearly labeled as such. Bundled source notes and exchanges are fictional synthetic examples, not imported user chats. `demo --workspace NEW_DIR` exercises fixtures only and never substitutes for live setup verification.
