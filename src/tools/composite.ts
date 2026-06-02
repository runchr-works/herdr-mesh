import { z } from "zod";
import { runHerdr } from "../herdr.js";
import { type ToolDef, type ToolResult, ok, formatResult, targetSchema } from "./types.js";

/** Recursively find the first `pane_id` value in a parsed herdr JSON response. */
function findPaneId(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPaneId(item);
      if (found) return found;
    }
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.pane_id === "string") return obj.pane_id;
  for (const v of Object.values(obj)) {
    const found = findPaneId(v);
    if (found) return found;
  }
  return undefined;
}

/** Resolve a target (agent name/label/id) to its pane id, needed to send keys.
 * Tries `agent get` first, then `pane get` so a raw pane id also works. */
async function resolvePaneId(target: string): Promise<string> {
  for (const cmd of [["agent", "get", target], ["pane", "get", target]]) {
    try {
      const res = await runHerdr(cmd);
      const paneId = findPaneId(res.json);
      if (paneId) return paneId;
    } catch {
      /* try next resolver */
    }
  }
  throw new Error(`could not resolve pane_id for target "${target}"`);
}

export const compositeTools: ToolDef[] = [
  {
    name: "herdr_relay",
    description:
      "Deliver a message to an agent AND submit it (types the text, then presses Enter). Use this for normal agent-to-agent messaging — it avoids the common mistake of sending text that never gets submitted. Set submit=false to type without Enter.",
    inputSchema: {
      target: targetSchema,
      text: z.string().describe("Message/prompt to deliver to the agent."),
      submit: z
        .boolean()
        .optional()
        .describe("Press Enter after typing (default true)."),
    },
    run: async (a): Promise<ToolResult> => {
      const target = String(a.target);
      const submit = a.submit !== false;
      // Resolve pane first so a bad target fails before we type anything.
      const paneId = submit ? await resolvePaneId(target) : undefined;
      await runHerdr(["agent", "send", target, String(a.text)]);
      if (submit && paneId) await runHerdr(["pane", "send-keys", paneId, "enter"]);
      return ok(
        `Delivered to "${target}"${submit ? " and submitted (Enter)" : " (not submitted)"}.`,
      );
    },
  },
  {
    name: "herdr_handoff",
    description:
      "Hand a task to another agent and wait for its result in one step: deliver the message (with Enter), wait until the agent reaches a status (default idle), then read its output back. Use this for review/fix/verify handoffs so the multi-step chain can't break midway. Returns the target agent's resulting output.",
    inputSchema: {
      target: targetSchema,
      message: z.string().describe("Task/prompt to hand to the agent."),
      wait_status: z
        .enum(["idle", "working", "blocked", "done", "unknown"])
        .optional()
        .describe("Status to wait for before reading back (default: idle)."),
      timeout_ms: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max time to wait for the status (default 120000)."),
      read_lines: z
        .number()
        .int()
        .positive()
        .max(2000)
        .optional()
        .describe("Lines of output to read back (default 200)."),
    },
    timeoutMs: 180_000,
    run: async (a): Promise<ToolResult> => {
      const target = String(a.target);
      const status = (a.wait_status as string) ?? "idle";
      const timeout = (a.timeout_ms as number) ?? 120_000;
      const lines = (a.read_lines as number) ?? 200;

      const paneId = await resolvePaneId(target);
      await runHerdr(["agent", "send", target, String(a.message)]);
      await runHerdr(["pane", "send-keys", paneId, "enter"]);

      let waitNote = `reached ${status}`;
      try {
        await runHerdr(
          ["agent", "wait", target, "--status", status, "--timeout", String(timeout)],
          { timeoutMs: timeout + 10_000 },
        );
      } catch (err) {
        // Don't lose the output if the wait times out — read whatever is there.
        waitNote = `wait did not complete (${err instanceof Error ? err.message : String(err)})`;
      }

      const read = await runHerdr([
        "agent",
        "read",
        target,
        "--source",
        "visible",
        "--lines",
        String(lines),
        "--format",
        "text",
      ]);
      return ok(`# Handoff to "${target}" — ${waitNote}\n\n${formatResult(read)}`);
    },
  },
];
