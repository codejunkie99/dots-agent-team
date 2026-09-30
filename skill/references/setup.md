# Setup and run

No dependencies beyond Node.js 20+. Extract the ZIP; copy its `dots-agent-team` directory to `.agents/skills/dots-agent-team` in a chosen project, or `${CODEX_HOME:-$HOME/.codex}/skills/dots-agent-team` for the current user. If that directory already exists, stop and compare versions. Restart/reopen the Codex task if its skill inventory was loaded before installation. Invoke `$dots-agent-team` and describe the task and selected sources.

## Existing local adapters

`--bridge local` expects Model Router under `~/.local/share/codex-router` and installed `jev-native-agents/scripts/runtime/src` under the user’s Codex skills directory. It reads `merged-models.json` and `enabled-providers.json` plus the safe subscription-sharing status projection. It imports existing `askJev` and `callModel` functions as authenticated capabilities. It does not extract keys, create new grants, or run global synchronization/migrations. Override installation locations with `CODEX_ROUTER_CHECKOUT`, `CODEX_ROUTER_STATE`, or `JEV_RUNTIME_ROOT` if the operator already uses another location. Paths are not credentials.

The bridge excludes OpenRouter worker routes because the reused worker adapter explicitly disallows that provider. Jev goes directly to TypeSafe. It excludes native GPT routes until the Router’s safe status says subscription sharing is enabled and the session usable. Other already configured provider routes can work independently. A catalog entry can still fail authentication, throttling, or inference; preserve the actual failure.

## Portable environment adapter

`--bridge env` uses the real authenticated Router `GET /v1/models` and `POST /v1/responses` on loopback port 4202. Supply `CODEX_ROUTER_CALLER_KEY` with an existing Router caller capability and `TYPESAFE_API_KEY` privately in the process environment. The skill reads no credential files. `CODEX_ROUTER_PORT` changes only the process target; `JEV_MODEL` can pin a documented Jev version (default `jev-latest`). Do not paste values into Codex messages, CLI arguments, shell history, state, or packages. Obtain/configure keys through the providers’ normal private controls; this skill does not do it for the user.

Do not enable ChatGPT subscription sharing merely to bypass HTTP401. Explain that it allows other local Router clients to spend subscription allowance; require the user’s action-time approval and let the Router own that transaction. A valid sign-in with disabled sharing does not need a login refresh. No driver, login, API key, or grant is created by installation.

## Workspace example

Copy only selected excerpts into `sources/`. Put `manifest.json` in the project root:

```json
{
  "sourceRoot":"sources",
  "sources":[{"id":"note","path":"selected-note.md","approved":true,"transmissionApproved":true}],
  "tasks":[{"id":"check","kind":"draft","prompt":"Draft acceptance checks for the explicitly pending task. Explain uninspected implementation as unknown."}]
}
```

Set approval flags only for actually authorized content and transmission. Put optional discovered model IDs in the manifest’s `modelAllowlist`, or task-level `modelAllowlist` and `verifierModels` for declared role scopes.

```sh
node /path/to/dots-agent-team/scripts/team.mjs models --bridge env
node /path/to/dots-agent-team/scripts/team.mjs init --manifest manifest.json --workspace .dot-team --bridge env
node /path/to/dots-agent-team/scripts/team.mjs run --workspace .dot-team
```

Output files: `state.json` (durable leases, snapshots, tasks and local memory), `notes.md` (readable handoff), `TASK.result.json` (actual result envelope), and `TASK.draft.md` for drafts. They can contain approved private source data; do not share runtime workspaces by default. File modes are 600 and workspace directories 700. State does not include authentication values.

Missing credentials and unavailable adapters fail with explicit errors. `fixture` uses no live service. For offline QA:

```sh
node /path/to/dots-agent-team/scripts/team.mjs demo --workspace /tmp/new-dot-qa
```

## Bootstrap without pretending a fixture is live

Jev may abstain when a discovered model has no task-relevant execution evidence. Test the actual provider first, with a harness-selected catalog ID. This diagnostic intentionally bypasses Jev and makes one bounded live synthetic extraction/checklist request:

```sh
node /path/to/team.mjs probe --model DISCOVERED_ID --bridge local --evidence bootstrap.json
```

For distinct drafting/reviewer role candidates, probe each intended discovered model once. `probe` rejects the fixture adapter, writes actual requested/resolved model information and acceptance results, and labels `bypassedJev:true`. It establishes only one tiny extraction/checklist case, not architecture, general reasoning, UI reliability or production quality. Failed probes seed no positive evidence. Do not repeat probes to cherry-pick a desired route.

Then supply those records at initialization:

```sh
node /path/to/team.mjs init --manifest manifest.json --workspace .dot-team --bridge local --evidence bootstrap.json
node /path/to/team.mjs run --workspace .dot-team
```

Fresh successful probe records (under seven days) become bounded candidate evidence. Jev can still abstain. Preserve the decision gate and report the observed choice/confidence; do not lower thresholds or silently narrow candidates to make setup appear successful.
