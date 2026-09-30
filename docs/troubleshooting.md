# Troubleshooting

| Symptom | Meaning and action |
| --- | --- |
| Missing CODEX_ROUTER_CALLER_KEY or TYPESAFE_API_KEY | Portable bridge has no privately supplied existing access. Configure through normal owner controls; never paste values into this repository or assistant messages. |
| Installed adapters unavailable | `local` needs Model Router plus the existing jev-native-agents runtime. Use documented installation-location environment overrides, or the portable bridge. |
| Catalog entry but HTTP401/502 | Catalog availability is not credential/execution proof. Check existing provider status. Native GPT local clients may require explicitly approved subscription sharing even while Codex itself is signed in. |
| Jev route abstention | Preserve choice/confidence. Missing execution evidence can cause a genuine abstention. Run one explicitly labeled bounded bootstrap probe for a declared candidate; do not lower thresholds or cherry-pick retries. |
| Probe succeeds but a larger response has no confirmed completion | The larger request may exceed output limits, fail upstream, or expose adapter differences. Preserve the failed run; inspect current provider behavior. A tiny probe is not a guarantee. |
| Unresolved task lease | Recover the actual worker result or ensure the worker has stopped and record its observed failure. Never automatically replay the job. |
| Workspace lock | Inspect the recorded PID and active worker. Remove only an abandoned lock after verifying that no mutation is running. |
| Quote/source hash mismatch | The snapshot or result changed. Create a newly approved run; do not silently replace provenance. |
| Verification failed | Dependent tasks remain blocked. Inspect actual issues and produce a separately scoped correction/run. |
| Memory version conflict/expiry | Use current expectedVersion and fresh evidence. Conflicts require explicit reconciliation, not silent replacement. |
| Memory abstention | Inspect the concrete candidates/evidence and actual confidence. Opaque action labels or missing evidence can be ambiguous. No memory action is applied below the gate. |
| Missing computer driver | The standalone CLI has no desktop connection. Use current Codex Computer Use tools with the installed chooser, or an explicitly supplied driver. Never report selection as execution. |
| Changed or stale computer observation | Discard the choice, observe current state and rebuild candidates. Do not replay old indexes. |
| Skill absent in an existing task | Its inventory may predate installation. Open a new task and invoke `$dots-agent-team`. |

The runtime makes no automatic provider retry or uncertain-lease replay. Tests and diagnostics must identify when they bypass Jev or use fixtures. The documented thresholds are policy over concentration-based decision confidence, not a calibrated probability of task success.
