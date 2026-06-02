#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for the MCP protocol.
  console.error("herdr-mesh MCP server running on stdio");
}

main().catch((err) => {
  console.error("herdr-mesh failed to start:", err);
  process.exit(1);
});
