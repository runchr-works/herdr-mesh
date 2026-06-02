import { z } from "zod";
import { type ToolDef, sourceSchema, flag, boolFlag } from "./types.js";

export const paneTools: ToolDef[] = [
  {
    name: "herdr_pane_list",
    description: "List panes, optionally filtered to a workspace.",
    inputSchema: {
      workspace: z.string().optional().describe("Workspace id filter."),
    },
    buildArgs: (a) => {
      const argv = ["pane", "list"];
      flag(argv, "--workspace", a.workspace);
      return argv;
    },
  },
  {
    name: "herdr_pane_get",
    description: "Get details for a pane.",
    inputSchema: { pane_id: z.string() },
    buildArgs: (a) => ["pane", "get", String(a.pane_id)],
  },
  {
    name: "herdr_pane_read",
    description:
      "Read a pane's terminal output. Keep `lines` small to avoid flooding context.",
    inputSchema: {
      pane_id: z.string(),
      source: sourceSchema,
      lines: z.number().int().positive().max(2000).optional(),
    },
    buildArgs: (a) => {
      const argv = ["pane", "read", String(a.pane_id)];
      flag(argv, "--source", a.source);
      flag(argv, "--lines", a.lines ?? 200);
      argv.push("--format", "text");
      return argv;
    },
  },
  {
    name: "herdr_pane_split",
    description: "Split a pane to create a new one (direction right or down).",
    inputSchema: {
      pane_id: z.string(),
      direction: z.enum(["right", "down"]),
      cwd: z.string().optional(),
      focus: z.boolean().optional(),
    },
    buildArgs: (a) => {
      const argv = ["pane", "split", String(a.pane_id), "--direction", String(a.direction)];
      flag(argv, "--cwd", a.cwd);
      boolFlag(argv, "--focus", "--no-focus", a.focus);
      return argv;
    },
  },
  {
    name: "herdr_pane_run",
    description:
      "Run a command in a pane: writes the command text AND presses Enter. Use this (not herdr_agent_send) when you want to execute a shell command.",
    inputSchema: {
      pane_id: z.string(),
      command: z.string().describe("Command to type and submit."),
    },
    buildArgs: (a) => ["pane", "run", String(a.pane_id), String(a.command)],
  },
  {
    name: "herdr_pane_send_text",
    description: "Send literal text to a pane without pressing Enter.",
    inputSchema: { pane_id: z.string(), text: z.string() },
    buildArgs: (a) => ["pane", "send-text", String(a.pane_id), String(a.text)],
  },
  {
    name: "herdr_pane_send_keys",
    description:
      "Send one or more key names to a pane (e.g. 'enter', 'ctrl-c', 'escape').",
    inputSchema: {
      pane_id: z.string(),
      keys: z.array(z.string()).min(1).describe("Key names to send in order."),
    },
    buildArgs: (a) => ["pane", "send-keys", String(a.pane_id), ...(a.keys as string[])],
  },
  {
    name: "herdr_pane_close",
    description: "Close a pane.",
    inputSchema: { pane_id: z.string() },
    buildArgs: (a) => ["pane", "close", String(a.pane_id)],
  },
  {
    name: "herdr_pane_rename",
    description: "Rename a pane label (or clear with clear=true).",
    inputSchema: {
      pane_id: z.string(),
      label: z.string().optional(),
      clear: z.boolean().optional(),
    },
    buildArgs: (a) => {
      const argv = ["pane", "rename", String(a.pane_id)];
      if (a.clear) argv.push("--clear");
      else argv.push(String(a.label));
      return argv;
    },
  },
];
