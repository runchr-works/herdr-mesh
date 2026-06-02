import { z } from "zod";
import { type ToolDef, flag, boolFlag } from "./types.js";

export const tabTools: ToolDef[] = [
  {
    name: "herdr_tab_list",
    description: "List tabs, optionally filtered to a workspace.",
    inputSchema: { workspace: z.string().optional() },
    buildArgs: (a) => {
      const argv = ["tab", "list"];
      flag(argv, "--workspace", a.workspace);
      return argv;
    },
  },
  {
    name: "herdr_tab_create",
    description: "Create a new tab.",
    inputSchema: {
      workspace: z.string().optional(),
      cwd: z.string().optional(),
      label: z.string().optional(),
      focus: z.boolean().optional(),
    },
    buildArgs: (a) => {
      const argv = ["tab", "create"];
      flag(argv, "--workspace", a.workspace);
      flag(argv, "--cwd", a.cwd);
      flag(argv, "--label", a.label);
      boolFlag(argv, "--focus", "--no-focus", a.focus);
      return argv;
    },
  },
  {
    name: "herdr_tab_get",
    description: "Get details for a tab.",
    inputSchema: { tab_id: z.string() },
    buildArgs: (a) => ["tab", "get", String(a.tab_id)],
  },
  {
    name: "herdr_tab_focus",
    description: "Focus a tab.",
    inputSchema: { tab_id: z.string() },
    buildArgs: (a) => ["tab", "focus", String(a.tab_id)],
  },
  {
    name: "herdr_tab_rename",
    description: "Rename a tab.",
    inputSchema: { tab_id: z.string(), label: z.string() },
    buildArgs: (a) => ["tab", "rename", String(a.tab_id), String(a.label)],
  },
  {
    name: "herdr_tab_close",
    description: "Close a tab.",
    inputSchema: { tab_id: z.string() },
    buildArgs: (a) => ["tab", "close", String(a.tab_id)],
  },
];

export const workspaceTools: ToolDef[] = [
  {
    name: "herdr_workspace_list",
    description: "List workspaces.",
    inputSchema: {},
    buildArgs: () => ["workspace", "list"],
  },
  {
    name: "herdr_workspace_create",
    description: "Create a new workspace.",
    inputSchema: {
      cwd: z.string().optional(),
      label: z.string().optional(),
      focus: z.boolean().optional(),
    },
    buildArgs: (a) => {
      const argv = ["workspace", "create"];
      flag(argv, "--cwd", a.cwd);
      flag(argv, "--label", a.label);
      boolFlag(argv, "--focus", "--no-focus", a.focus);
      return argv;
    },
  },
  {
    name: "herdr_workspace_get",
    description: "Get details for a workspace.",
    inputSchema: { workspace_id: z.string() },
    buildArgs: (a) => ["workspace", "get", String(a.workspace_id)],
  },
  {
    name: "herdr_workspace_focus",
    description: "Focus a workspace.",
    inputSchema: { workspace_id: z.string() },
    buildArgs: (a) => ["workspace", "focus", String(a.workspace_id)],
  },
  {
    name: "herdr_workspace_rename",
    description: "Rename a workspace.",
    inputSchema: { workspace_id: z.string(), label: z.string() },
    buildArgs: (a) => ["workspace", "rename", String(a.workspace_id), String(a.label)],
  },
  {
    name: "herdr_workspace_close",
    description: "Close a workspace.",
    inputSchema: { workspace_id: z.string() },
    buildArgs: (a) => ["workspace", "close", String(a.workspace_id)],
  },
];
