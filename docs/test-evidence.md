# Verification evidence

Verified on 2026-09-30 against the installed skill and Model Router 0.5.1. Only harmless synthetic source notes and a synthetic local web surface were used. No private user chats, credentials or raw personal runtime logs are included here.

## Automated checks

- Skill creator validator passed.
- 21 runtime tests passed against the installed copy. Coverage includes approved snapshots, symlink/secret rejection, malformed and low-confidence decisions, dependencies, stale handoffs, same-worker review rejection, independent review failure, stale/conflicting memory, exact source quotes, Router completion/error handling, absent drivers, fresh UI state and approval-required actions.
- 11 black-box forward-test checks passed after installation into a fresh isolated temporary project with an empty HOME. Separate CLI invocations exercised discovery, missing-auth messages, manual handoff, resumption/replay rejection, two distinct fixture worker processes, memory persistence and absent driver handling. These are **offline QA**, not live provider results.
- Installed files matched the validated source files.

## Actual live workflow

1. A direct TypeSafe Jev readiness check returned the observed decision model `jev-1.13.0`.
2. Initial routing genuinely abstained because candidate metadata had no task execution evidence. A sanitized diagnostic returned abstain at confidence 0.73, with probabilities 0.87 abstain / 0.13 candidate. This was not a parsing mismatch. The 0.65 routing gate remained unchanged.
3. Harness-selected bootstrap probes explicitly bypassed Jev, tested one synthetic source extraction/checklist case, and passed through `opencode-go/deepseek-v4.1-flash` and `zai-coding/glm-5.3`. Their evidence was labeled bounded; no general-quality claim was inferred.
4. With that evidence, Jev selected `zai-coding/glm-5.3` for a minimal checklist draft at confidence 0.74. The actual observed resolved ID was `zai-coding-glm-5-3`. A separate CLI worker completed and the host wrote the local draft artifact.
5. Jev selected `opencode-go/deepseek-v4.1-flash` for independent review at confidence 0.66. Its observed resolved ID was `opencode-go-deepseek-v4-1-flash`. A different worker process passed review against the approved snapshots and exact TODO evidence; both tasks reached completed.
6. Live Jev selected a host write of an evidence-backed note and later retrieval of that durable local version-1 record. More explicit action descriptions/source evidence resolved ambiguity in the initial bare memory candidates; the confidence gate remained unchanged.
7. Current Codex cua_repl observed a local synthetic page with pending state and one enabled button. The installed Jev Computer Use tool returned `jev-autopilot-fast-v1`, selected `verify_local_check` at confidence 0.96, and reported eligible true. Codex refreshed/revalidated the target, executed the click through the existing driver, and observed verified state with the button disabled. This was **selection, actual execution and postcondition verification**, not a fixture or selection-only result. Only a minimized synthetic text summary went to the decision provider. The page/tab and temporary server were cleaned up.

## Limits and preserved failures

One larger DeepSeek drafting request did not provide an explicitly confirmed completion; its task remained failed in a separate run. Small bootstrap probes do not guarantee longer tasks. Some initial memory choices abstained, correctly applying no action. Native subscription-sharing settings were unchanged; already configured non-GPT provider routes worked without that additional grant.

These observations establish a small working setup, not universal model quality, every browser/desktop capability, production reliability, or a private Dots runtime integration. Router/adapter versions, provider access and task scope can change the result. The actual host retains private durable run records locally; they are not committed to this repository.
