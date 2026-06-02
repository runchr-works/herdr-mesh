import { z } from "zod";
import {
  type ToolDef,
  targetSchema,
  sourceSchema,
  flag,
  boolFlag,
} from "./types.js";

export const agentTools: ToolDef[] = [
  {
    name: "herdr_agent_list",
    description:
      "List all agents herdr currently recognizes — any supported agent type (pi, omp, claude, codex, opencode, hermes, qodercli, …) — with semantic state (idle/working/blocked/done), cwd, pane/tab/workspace ids. Use this first to discover targets for other agent tools.",
    inputSchema: {},
    buildArgs: () => ["agent", "list"],
  },
  {
    name: "herdr_agent_get",
    description:
      "Get details for a single agent (state, pane id, workspace, agent session).",
    inputSchema: { target: targetSchema },
    buildArgs: (a) => ["agent", "get", String(a.target)],
  },
  {
    name: "herdr_agent_read",
    description:
      "Read another agent's terminal output to gather context (contextual handoff). Returns recent pane text. Keep `lines` small to avoid flooding context.",
    inputSchema: {
      target: targetSchema,
      source: sourceSchema,
      lines: z
        .number()
        .int()
        .positive()
        .max(2000)
        .optional()
        .describe("Number of trailing lines to read (default 200)."),
    },
    buildArgs: (a) => {
      const argv = ["agent", "read", String(a.target)];
      flag(argv, "--source", a.source);
      flag(argv, "--lines", a.lines ?? 200);
      argv.push("--format", "text");
      return argv;
    },
  },
  {
    name: "herdr_agent_send",
    description:
      "Send literal text to an agent (e.g. a message or prompt). Writes the text WITHOUT a trailing Enter — use herdr_pane_run if you need to submit a command. Core primitive for agent-to-agent messaging.",
    inputSchema: {
      target: targetSchema,
      text: z.string().describe("Literal text to deliver to the agent."),
    },
    buildArgs: (a) => ["agent", "send", String(a.target), String(a.text)],
  },
  {
    name: "herdr_agent_wait",
    description:
      "Block until an agent reaches a given status. Useful to synchronize a handoff (wait for the other agent to become idle/done before sending the next step).",
    inputSchema: {
      target: targetSchema,
      status: z
        .enum(["idle", "working", "blocked", "done", "unknown"])
        .describe("Status to wait for."),
      timeout_ms: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max time to wait in milliseconds."),
    },
    // Allow the subprocess to outlive the requested CLI timeout.
    timeoutMs: 120_000,
    buildArgs: (a) => {
      const argv = ["agent", "wait", String(a.target), "--status", String(a.status)];
      flag(argv, "--timeout", a.timeout_ms);
      return argv;
    },
  },
  {
    name: "herdr_wait_output",
    description:
      "Block until a pane's output matches given text (or regex). Useful to wait for a build/command to finish in another agent's pane.",
    inputSchema: {
      pane_id: z.string().describe("Pane id to watch."),
      match: z.string().describe("Text (or regex if `regex` is true) to wait for."),
      regex: z.boolean().optional().describe("Treat `match` as a regex."),
      source: sourceSchema,
      timeout_ms: z.number().int().positive().optional(),
    },
    timeoutMs: 120_000,
    buildArgs: (a) => {
      const argv = ["wait", "output", String(a.pane_id), "--match", String(a.match)];
      boolFlag(argv, "--regex", undefined, a.regex);
      flag(argv, "--source", a.source);
      flag(argv, "--timeout", a.timeout_ms);
      return argv;
    },
  },
  {
    name: "herdr_agent_start",
    description:
      "Start a new agent in a fresh terminal. Works with any agent herdr supports (pi, omp, claude, codex, opencode, hermes, qodercli, …). Provide the agent's launch command/argv. Optionally place it in a workspace/tab or split from the current pane.",
    inputSchema: {
      name: z.string().describe("Name/label for the new agent terminal."),
      argv: z
        .array(z.string())
        .min(1)
        .describe(
          "Command and arguments to launch the agent, e.g. ['claude'], ['codex'], ['opencode'].",
        ),
      cwd: z.string().optional().describe("Working directory for the new agent."),
      workspace: z.string().optional().describe("Workspace id to place the agent in."),
      tab: z.string().optional().describe("Tab id to place the agent in."),
      split: z
        .enum(["right", "down"])
        .optional()
        .describe("Split direction from the current pane."),
      focus: z.boolean().optional().describe("Focus the new agent (default: focus)."),
    },
    buildArgs: (a) => {
      const argv = ["agent", "start", String(a.name)];
      flag(argv, "--cwd", a.cwd);
      flag(argv, "--workspace", a.workspace);
      flag(argv, "--tab", a.tab);
      flag(argv, "--split", a.split);
      boolFlag(argv, "--focus", "--no-focus", a.focus);
      argv.push("--", ...(a.argv as string[]));
      return argv;
    },
  },
  {
    name: "herdr_agent_rename",
    description: "Rename an agent (or clear its name with clear=true).",
    inputSchema: {
      target: targetSchema,
      name: z.string().optional().describe("New name. Omit and set clear=true to clear."),
      clear: z.boolean().optional(),
    },
    buildArgs: (a) => {
      const argv = ["agent", "rename", String(a.target)];
      if (a.clear) argv.push("--clear");
      else argv.push(String(a.name));
      return argv;
    },
  },
  {
    name: "herdr_agent_focus",
    description: "Focus an agent's pane in the herdr UI.",
    inputSchema: { target: targetSchema },
    buildArgs: (a) => ["agent", "focus", String(a.target)],
  },
];
