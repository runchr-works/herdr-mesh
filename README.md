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

## Install (recommended)

Install globally, then let the built-in installer detect your agents and register
herdr-mesh with them:

```bash
npm i -g runchr-works/herdr-mesh
herdr-mesh install
```

`herdr-mesh install` detects installed agents and registers herdr-mesh with the
ones you pick:

- **Claude Code** — via `claude mcp add -s user`
- **Codex** — adds `[mcp_servers.herdr-mesh]` to `~/.codex/config.toml`
- **opencode** — merges into `~/.config/opencode/opencode.json`
- Other agents — prints the exact config snippet to paste

It is **safe**: existing config is parsed and merged (never overwritten), a `.bak`
backup is made before writing, and re-running skips agents already registered.
Use `herdr-mesh install -y` to register with all detected agents non-interactively.

Restart the agent(s) afterward so they pick up herdr-mesh.

## Manual registration

Each agent is its own MCP client; register herdr-mesh once per agent. All agents
on the same machine share the same herdr socket, so they can see and message each
other. The server command is `herdr-mesh` (after a global install).

Claude Code:

```bash
claude mcp add -s user herdr-mesh herdr-mesh
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.herdr-mesh]
command = "herdr-mesh"
```

Generic MCP config (stdio):

```json
{
  "mcpServers": {
    "herdr-mesh": {
      "command": "herdr-mesh"
    }
  }
}
```

> Prefer not to install globally? Use `npx -y runchr-works/herdr-mesh` as the
> command instead of `herdr-mesh` (npx builds it from GitHub on first run; slower
> cold start).

## Build from source (local development)

```bash
git clone https://github.com/runchr-works/herdr-mesh.git
cd herdr-mesh
npm install
npm run build
node dist/index.js          # run the server directly
node dist/index.js install  # or run the installer from source
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
