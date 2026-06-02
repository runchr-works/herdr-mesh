import { z, type ZodRawShape } from "zod";
import { runHerdr, HerdrError } from "../herdr.js";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
  /** Build the herdr CLI argv from validated args. */
  buildArgs: (args: Record<string, unknown>) => string[];
  /** Optional per-tool timeout (ms); falls back to runHerdr default. */
  timeoutMs?: number;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/** Execute a ToolDef: build argv, run herdr, format result as MCP content. */
export async function execTool(
  tool: ToolDef,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const argv = tool.buildArgs(args);
    const result = await runHerdr(argv, { timeoutMs: tool.timeoutMs });
    // Prefer parsed JSON (pretty-printed) so the agent gets structured output;
    // fall back to raw stdout for plain-text commands like `status`.
    const text =
      result.json !== undefined
        ? JSON.stringify(result.json, null, 2)
        : result.stdout.trim() || "(no output)";
    return { content: [{ type: "text", text }] };
  } catch (err) {
    const message = err instanceof HerdrError ? err.message : String(err);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

/** Common reusable schema fragments. */
export const targetSchema = z
  .string()
  .describe(
    "Agent target: terminal id, unique agent name, detected/reported agent label, or legacy pane id.",
  );

export const sourceSchema = z
  .enum(["visible", "recent", "recent-unwrapped"])
  .optional()
  .describe("Which portion of the pane buffer to read (default: visible).");

/** Append `--flag value` when value is defined. */
export function flag(
  argv: string[],
  name: string,
  value: unknown,
): void {
  if (value !== undefined && value !== null && value !== "") {
    argv.push(name, String(value));
  }
}

/** Append a boolean `--flag` / `--no-flag` pair when defined. */
export function boolFlag(
  argv: string[],
  onFlag: string,
  offFlag: string | undefined,
  value: unknown,
): void {
  if (value === true) argv.push(onFlag);
  else if (value === false && offFlag) argv.push(offFlag);
}
