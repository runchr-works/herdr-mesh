import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
const SERVER_NAME = "herdr-mesh";
/** How clients should invoke this server. Prefer the global `herdr-mesh` bin if
 * it's on PATH; otherwise fall back to `node <this script>` (absolute path). */
function serverInvocation() {
    if (commandExists(SERVER_NAME))
        return { command: SERVER_NAME, args: [] };
    // process.argv[1] is the absolute path to dist/index.js when run via the bin.
    return { command: process.execPath, args: [process.argv[1]] };
}
function commandExists(cmd) {
    try {
        execFileSync(process.platform === "win32" ? "where" : "which", [cmd], {
            stdio: "ignore",
        });
        return true;
    }
    catch {
        return false;
    }
}
const CODEX_CONFIG = join(homedir(), ".codex", "config.toml");
const OPENCODE_CONFIG = join(homedir(), ".config", "opencode", "opencode.json");
const AGENTS = [
    {
        id: "claude",
        label: "Claude Code",
        detected: () => commandExists("claude"),
        register: (inv) => {
            // Idempotent: skip if already registered.
            try {
                execFileSync("claude", ["mcp", "get", SERVER_NAME], { stdio: "ignore" });
                return "already registered (skipped)";
            }
            catch {
                /* not registered yet */
            }
            const args = ["mcp", "add", "-s", "user", SERVER_NAME, inv.command, ...inv.args];
            execFileSync("claude", args, { stdio: "ignore" });
            return "registered via `claude mcp add`";
        },
    },
    {
        id: "codex",
        label: "Codex",
        detected: () => existsSync(CODEX_CONFIG) || commandExists("codex"),
        register: (inv) => {
            const block = renderCodexBlock(inv);
            const existing = existsSync(CODEX_CONFIG) ? readFileSync(CODEX_CONFIG, "utf8") : "";
            if (existing.includes(`[mcp_servers.${SERVER_NAME}]`)) {
                return "already present in config.toml (skipped)";
            }
            if (existing)
                backup(CODEX_CONFIG);
            // Ensure a blank line separates the new table from prior content.
            const sep = existing ? (existing.endsWith("\n") ? "\n" : "\n\n") : "";
            writeFileSync(CODEX_CONFIG, existing + sep + block, "utf8");
            return `added [mcp_servers.${SERVER_NAME}] to ${CODEX_CONFIG}`;
        },
    },
    {
        id: "opencode",
        label: "opencode",
        detected: () => existsSync(OPENCODE_CONFIG),
        register: (inv) => {
            const raw = existsSync(OPENCODE_CONFIG)
                ? readFileSync(OPENCODE_CONFIG, "utf8")
                : "{}";
            let cfg;
            try {
                cfg = JSON.parse(raw);
            }
            catch {
                throw new Error(`could not parse ${OPENCODE_CONFIG} as JSON`);
            }
            const mcp = (cfg.mcp ??= {});
            if (mcp[SERVER_NAME])
                return "already present in opencode.json (skipped)";
            mcp[SERVER_NAME] = {
                type: "local",
                enabled: true,
                command: [inv.command, ...inv.args],
            };
            if (existsSync(OPENCODE_CONFIG))
                backup(OPENCODE_CONFIG);
            writeFileSync(OPENCODE_CONFIG, JSON.stringify(cfg, null, 2) + "\n", "utf8");
            return `added mcp.${SERVER_NAME} to ${OPENCODE_CONFIG}`;
        },
    },
];
function renderCodexBlock(inv) {
    const lines = [`[mcp_servers.${SERVER_NAME}]`, `command = ${JSON.stringify(inv.command)}`];
    if (inv.args.length) {
        lines.push(`args = [${inv.args.map((a) => JSON.stringify(a)).join(", ")}]`);
    }
    return lines.join("\n") + "\n";
}
function backup(path) {
    copyFileSync(path, `${path}.bak`);
}
/** Entry point for `herdr-mesh install`. */
export async function runInstall(argv) {
    const all = argv.includes("--all") || argv.includes("-y");
    const inv = serverInvocation();
    const detected = AGENTS.filter((a) => a.detected());
    const undetected = AGENTS.filter((a) => !a.detected());
    console.log("herdr-mesh installer\n");
    console.log(`Clients will launch the server as: ${inv.command} ${inv.args.join(" ")}`.trim() + "\n");
    if (detected.length === 0) {
        console.log("No supported agents detected (claude, codex, opencode).");
        printManual(inv, AGENTS);
        return;
    }
    console.log("Detected agents:");
    detected.forEach((a, i) => console.log(`  ${i + 1}. ${a.label} (${a.id})`));
    console.log("");
    let chosen;
    if (all) {
        chosen = detected;
    }
    else {
        const rl = createInterface({ input: stdin, output: stdout });
        const answer = (await rl.question("Register herdr-mesh with which? [all / comma-separated numbers / q to quit] ")).trim();
        rl.close();
        if (answer === "" || answer.toLowerCase() === "q") {
            console.log("Aborted. No changes made.");
            return;
        }
        if (answer.toLowerCase() === "all") {
            chosen = detected;
        }
        else {
            const idx = answer
                .split(",")
                .map((s) => parseInt(s.trim(), 10) - 1)
                .filter((n) => n >= 0 && n < detected.length);
            chosen = idx.map((i) => detected[i]);
        }
    }
    if (chosen.length === 0) {
        console.log("Nothing selected. No changes made.");
        return;
    }
    console.log("");
    for (const agent of chosen) {
        try {
            const status = agent.register(inv);
            console.log(`✓ ${agent.label}: ${status}`);
        }
        catch (err) {
            console.log(`✗ ${agent.label}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    if (undetected.length) {
        console.log("");
        console.log("Not detected (configure manually if you use them):");
        printManual(inv, undetected);
    }
    console.log("\nDone. Restart the agent(s) to pick up herdr-mesh.");
}
function printManual(inv, agents) {
    const cmdArr = [inv.command, ...inv.args];
    for (const a of agents) {
        console.log(`\n# ${a.label}`);
        if (a.id === "codex") {
            console.log("Add to ~/.codex/config.toml:");
            console.log(renderCodexBlock(inv).trimEnd());
        }
        else if (a.id === "opencode") {
            console.log("Add under \"mcp\" in ~/.config/opencode/opencode.json:");
            console.log(JSON.stringify({ [SERVER_NAME]: { type: "local", enabled: true, command: cmdArr } }, null, 2));
        }
        else {
            console.log(`Register an MCP server "${SERVER_NAME}" with command: ${cmdArr.join(" ")}`);
        }
    }
}
//# sourceMappingURL=install.js.map