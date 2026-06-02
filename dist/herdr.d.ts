export interface HerdrResult {
    /** Parsed JSON object when herdr emitted JSON, otherwise undefined. */
    json?: unknown;
    /** Raw stdout text (always present). */
    stdout: string;
    /** Raw stderr text. */
    stderr: string;
}
export declare class HerdrError extends Error {
    constructor(message: string);
}
/**
 * Run a herdr CLI command and return its output.
 *
 * herdr prints newline-delimited JSON for most socket-API commands
 * (e.g. `{"id":...,"result":{...},"type":...}`). We parse the last JSON line
 * when possible and also return the raw stdout for non-JSON commands.
 */
export declare function runHerdr(args: string[], opts?: {
    timeoutMs?: number;
}): Promise<HerdrResult>;
