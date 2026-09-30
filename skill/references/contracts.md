# CLI and durable contracts

All options have explicit values. Use `--workspace` to identify one private run; bridge is persisted at initialization. No persistent daemon is created.

| Command | Purpose |
| --- | --- |
| `models --bridge env|local|fixture` | Discover actual catalog IDs; catalog presence is not successful execution |
| `probe --model ID --bridge BRIDGE --evidence FILE` | Run one explicitly bypass-labeled live synthetic bootstrap check; no fixture evidence |
| `init --manifest FILE --workspace DIR --bridge BRIDGE` | Snapshot individually approved UTF-8 files and initialize tasks |
| `run --workspace DIR` | Process up to 12 author/verifier jobs sequentially |
| `next --workspace DIR` | Process one ready job |
| `status --workspace DIR` | Show mode, route, task state, lease and memory versions |
| `handoff --workspace DIR` | Reserve one ready job and write its job file |
| `worker --job FILE --bridge BRIDGE` | Run a leased text worker in a separate CLI and print its result envelope |
| `accept --workspace DIR --task ID --lease ID --result FILE` | Accept the actual matching worker envelope |
| `fail-lease --workspace DIR --task ID --lease ID --reason TEXT` | Record observed failure after ensuring no worker remains running |
| `memory --workspace DIR --input FILE` | Ask Jev to choose a bounded host memory action |
| `computer --input FILE --driver MODULE --bridge BRIDGE` | Use an explicitly supplied driver contract; absent driver fails |

Manual process handoff:

```sh
node /path/to/team.mjs handoff --workspace .dot-team
node /path/to/team.mjs worker --job /absolute/job.json --bridge local > worker-result.json
node /path/to/team.mjs accept --workspace .dot-team --task ACTUAL_ID --lease ACTUAL_LEASE --result worker-result.json
node /path/to/team.mjs run --workspace .dot-team
```

Use actual values returned by `handoff`. Do not change a lease, worker ID, bridge or selected model. A lost result is unresolved work, not completion. A confirmed error can be recorded, but the command cannot prove an external process has stopped; the coordinating host must inspect/stop it first. The runtime’s task guidance is not an OS sandbox.

`analyze` and `draft` worker JSON contains `summary` and `findings` with `title`, `status` (`built`, `unfinished`, `unknown`), `idea`, and `evidence:[{sourceId,quote}]`. Draft tasks add `draft`. Sources retain content hashes. Source excerpts can support factual status; proposed ideas are suggestions. A verifier receives the author result and independent approved snapshots, returning `{passed,summary,issues}`. Same-worker verification is rejected; different-model verification is preferred whenever another permitted candidate exists.

Memory input example:

```json
{"query":"Recall the label task","note":{"id":"label","text":"Label is pending in selected notes.","evidence":[{"sourceId":"note","quote":"Exact approved source excerpt here."}]},"ttlDays":7}
```

Omit `note` for retrieval. For updates include the actual `expectedVersion`. Conflicted/expired notes are excluded from retrieval; Jev cannot resolve version conflicts or fabricate replacement facts. Retrieve decisions return a local note; each model job receives at most one Jev-selected fresh memory record. The offline sample uses `fixtureChoice` only for deterministic QA; live Jev does not obey it as a permission or routing instruction.
