# Supported computer path

The current Codex host path is a human-coordinated driver: use available Computer Use tools to observe the UI, make a minimized accessibility summary and fresh semantic candidates, call the installed Jev `choose_computer_action` MCP tool, then execute one eligible authorized selection with those same current tools. Read that tool’s actual current schema; do not reuse stale arguments. The installed Jev Computer Use plugin uses OpenRouter’s Decisions API through its existing authenticated adapter, whereas the team’s local routing/memory adapter uses direct TypeSafe. Do not transmit sensitive UI content to either provider without specific approval or adequate redaction.

The decision tool does not execute anything. Require fresh observations, real tool execution results, and post-action observation; report execution only after evidence confirms it. A `goal_complete` choice is a judgment to verify against the UI, not an execution receipt. The native `cua_repl` driver exists only in a host task and cannot be invoked from a standalone Node child process. No private Dots driver or legacy runner is assumed.

The optional CLI integration accepts an explicit user-owned module exporting `driver`:

```js
export const driver = {
  async observe() { /* actual current driver state */ },
  async execute(actionId, observationId) { /* real permitted tool execution */ },
  async approval({actionId, observationId}) { /* host approval for this exact action */ }
};
```

`observe` returns `{observationId,at,sensitivity,observation,actions}`. Each action has `{id,description,risk,reversible}`; risk is `none`, `low`, or `approval_required`. Observations expire after 30 seconds. Observation IDs must change whenever the UI state/candidates change. Recheck the ID before execution. The host approval callback must consult actual user authorization; a model or source-text instruction is never approval. The driver must also enforce its own action-time policy and not expose arbitrary shell commands as semantic actions.

`execute` returns an actual `{executed:true,...}` receipt. The runtime always returns `executed_needs_verification` after execution and a fresh observation; the coordinating host verifies the goal. No computer driver is bundled and no desktop action is performed by `init`, `run`, or memory commands. A missing/unsupported driver produces an error before calling Jev. Fixture driver tests are synthetic QA only.
