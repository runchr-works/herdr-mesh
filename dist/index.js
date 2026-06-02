#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { runInstall } from "./install.js";
async function serve() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr only — stdout is reserved for the MCP protocol.
    console.error("herdr-mesh MCP server running on stdio");
}
async function main() {
    const [, , subcommand, ...rest] = process.argv;
    switch (subcommand) {
        case "install":
        case "register":
            await runInstall(rest);
            return;
        case undefined:
        case "serve":
            await serve();
            return;
        case "-h":
        case "--help":
            console.log([
                "herdr-mesh — MCP server for herdr multi-agent orchestration",
                "",
                "Usage:",
                "  herdr-mesh            Run the MCP server on stdio (used by MCP clients)",
                "  herdr-mesh install    Detect agents and register herdr-mesh with them",
                "  herdr-mesh install -y Register with all detected agents non-interactively",
            ].join("\n"));
            return;
        default:
            console.error(`Unknown command: ${subcommand}. Try 'herdr-mesh --help'.`);
            process.exit(1);
    }
}
main().catch((err) => {
    console.error("herdr-mesh failed:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map