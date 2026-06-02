# herdr-mesh

An MCP server for orchestrating multi-agent workflows inside [herdr](https://herdr.dev),
enabling real-time communication, pane management, and contextual handoffs.

> 한국어: [README.ko.md](./README.ko.md)

herdr already exposes its workspace/agent runtime over a CLI + socket API. `herdr-mesh`
wraps that CLI as [Model Context Protocol](https://modelcontextprotocol.io) tools, so any
MCP client can read other agents' panes, send messages, share sessions, and spawn new
agents through a standard interface.

It is **agent-agnostic**: tools operate on whatever agents herdr recognizes — `pi`, `omp`,
`claude`, `codex`, `opencode`, `hermes`, `qodercli`, and any future integration. Targets
accept a terminal id, agent name, reported agent label, or legacy pane id; nothing is tied
to a specific agent type. Use `herdr_integration_status` to see what's available.

## How it works

```
MCP client ──stdio(MCP)──> herdr-mesh ──exec "herdr …"──> herdr CLI ──socket──> herdr server
```

Each tool runs the `herdr` CLI as a subprocess and returns its JSON output. No separate
protocol implementation — herdr's own version/protocol handling stays authoritative.

## Requirements

- Node.js 18+
- [herdr](https://herdr.dev) installed and a server running (`herdr status` shows `running`).
  Set `HERDR_BIN` if `herdr` is not on `PATH`.

## Install & build

```bash
npm install
npm run build
```

## Register with a client

Claude Code:

```bash
claude mcp add herdr-mesh -- node /data/workspaces/herdr-mesh/dist/index.js
```

Generic MCP config (stdio):

```json
{
  "mcpServers": {
    "herdr-mesh": {
      "command": "node",
      "args": ["/data/workspaces/herdr-mesh/dist/index.js"]
    }
  }
}
```

## Tools

**Agent messaging & context (core)**
- `herdr_agent_list` — list agents with state (idle/working/blocked/done)
- `herdr_agent_get` — agent details
- `herdr_agent_read` — read another agent's pane output (context handoff)
- `herdr_agent_send` — send literal text to an agent (no Enter)
- `herdr_agent_wait` — block until an agent reaches a status
- `herdr_wait_output` — block until a pane's output matches text/regex

**Agent lifecycle & discovery**
- `herdr_agent_start` — spawn a new agent terminal (any supported agent)
- `herdr_agent_rename`, `herdr_agent_focus`
- `herdr_integration_status` — list agent integrations herdr knows about and their status

**Sessions**
- `herdr_session_list`, `herdr_session_stop`, `herdr_session_delete`

**Panes**
- `herdr_pane_list` / `get` / `read` / `split` / `run` / `send_text` / `send_keys` / `close` / `rename`
- Use `herdr_pane_run` to type a command **and** press Enter; use `*_send_text` for literal text.

**Tabs & workspaces**
- `herdr_tab_*` — list / create / get / focus / rename / close
- `herdr_workspace_*` — list / create / get / focus / rename / close

## Development

```bash
npm run dev   # run from source via tsx
```

## License

MIT
