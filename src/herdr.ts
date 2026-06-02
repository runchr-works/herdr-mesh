import { execFile } from "node:child_process";

const HERDR_BIN = process.env.HERDR_BIN ?? "herdr";
const DEFAULT_TIMEOUT_MS = 30_000;
// herdr read/wait commands can block; give them generous headroom over the CLI's own --timeout.
const MAX_BUFFER = 8 * 1024 * 1024;

export interface HerdrResult {
  /** Parsed JSON object when herdr emitted JSON, otherwise undefined. */
  json?: unknown;
  /** Raw stdout text (always present). */
  stdout: string;
  /** Raw stderr text. */
  stderr: string;
}

export class HerdrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HerdrError";
  }
}

/**
 * Run a herdr CLI command and return its output.
 *
 * herdr prints newline-delimited JSON for most socket-API commands
 * (e.g. `{"id":...,"result":{...},"type":...}`). We parse the last JSON line
 * when possible and also return the raw stdout for non-JSON commands.
 */
export async function runHerdr(
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<HerdrResult> {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<HerdrResult>((resolve, reject) => {
    execFile(
      HERDR_BIN,
      args,
      { timeout, maxBuffer: MAX_BUFFER, encoding: "utf8" },
      (error, stdout, stderr) => {
        const out = stdout ?? "";
        const err = stderr ?? "";

        if (error) {
          // Distinguish "herdr not installed" from a command-level failure.
          const code = (error as NodeJS.ErrnoException).code;
          if (code === "ENOENT") {
            reject(
              new HerdrError(
                `herdr CLI not found (tried "${HERDR_BIN}"). Install it from https://herdr.dev ` +
                  `or set HERDR_BIN to its path.`,
              ),
            );
            return;
          }
          if ((error as { killed?: boolean }).killed) {
            reject(
              new HerdrError(
                `herdr command timed out after ${timeout}ms: herdr ${args.join(" ")}`,
              ),
            );
            return;
          }
          // Non-zero exit: surface stderr/stdout so the agent sees the real reason
          // (e.g. server not running, unknown target).
          const detail = (err || out || error.message).trim();
          reject(
            new HerdrError(`herdr ${args.join(" ")} failed: ${detail}`),
          );
          return;
        }

        resolve({ json: tryParseJson(out), stdout: out, stderr: err });
      },
    );
  });
}

/** Parse the last non-empty line as JSON; herdr emits one JSON object per command. */
function tryParseJson(stdout: string): unknown {
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith("{") || line.startsWith("[")) {
      try {
        return JSON.parse(line);
      } catch {
        // not JSON after all; fall through
      }
    }
  }
  return undefined;
}
