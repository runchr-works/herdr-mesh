# herdr-mesh

[herdr](https://herdr.dev) 내부의 멀티 에이전트 워크플로를 오케스트레이션하는 MCP 서버.
에이전트 간 실시간 통신, pane 관리, 컨텍스트 핸드오프를 지원합니다.

> English: [README.md](./README.md)

herdr는 자신의 워크스페이스/에이전트 런타임을 CLI + 소켓 API로 노출합니다. `herdr-mesh`는
그 CLI를 [Model Context Protocol](https://modelcontextprotocol.io) tool로 감싸므로, 어떤
MCP 클라이언트든 다른 에이전트의 pane을 읽고, 메시지를 보내고, 세션을 조회하고, 새
에이전트를 띄우는 일을 표준 인터페이스로 할 수 있습니다.

**에이전트 비종속(agent-agnostic):** tool은 herdr가 인지하는 모든 에이전트
(`pi`, `omp`, `claude`, `codex`, `opencode`, `hermes`, `qodercli` 및 향후 통합)에 동작합니다.
target에는 terminal id, 에이전트 이름, 보고된 에이전트 라벨, 레거시 pane id를 쓸 수 있으며
특정 에이전트 타입에 묶여 있지 않습니다. 사용 가능한 목록은 `herdr_integration_status`로 확인하세요.

## 동작 방식

```
MCP 클라이언트 ──stdio(MCP)──> herdr-mesh ──exec "herdr …"──> herdr CLI ──소켓──> herdr 서버
```

각 tool은 `herdr` CLI를 서브프로세스로 실행하고 JSON 출력을 반환합니다. 별도 프로토콜 구현
없이, herdr 자체의 버전/프로토콜 처리를 그대로 신뢰합니다.

## 요구 사항

- Node.js 18 이상
- [herdr](https://herdr.dev) 설치 및 서버 실행 상태(`herdr status`가 `running` 표시).
  `herdr`가 `PATH`에 없으면 `HERDR_BIN` 환경변수로 경로를 지정하세요.

## npx로 실행 (권장)

클론 없이 GitHub에서 바로 실행합니다. npx가 저장소를 받아오고 `prepare` 스크립트가 자동으로
빌드합니다:

```bash
npx -y runchr-works/herdr-mesh
```

## 클라이언트에 등록

각 에이전트(claude/codex/…)는 각자가 MCP 클라이언트입니다. 사용하는 에이전트마다 한 번씩
herdr-mesh를 MCP 서버로 등록하세요. 같은 머신의 모든 에이전트는 동일한 herdr 소켓을 공유하므로
서로를 인지하고 메시지를 주고받을 수 있습니다.

Claude Code:

```bash
claude mcp add herdr-mesh -- npx -y runchr-works/herdr-mesh
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.herdr-mesh]
command = "npx"
args = ["-y", "runchr-works/herdr-mesh"]
```

일반 MCP 설정(stdio):

```json
{
  "mcpServers": {
    "herdr-mesh": {
      "command": "npx",
      "args": ["-y", "runchr-works/herdr-mesh"]
    }
  }
}
```

## 소스에서 빌드 (로컬 개발)

```bash
git clone https://github.com/runchr-works/herdr-mesh.git
cd herdr-mesh
npm install
npm run build
# 등록: node /herdr-mesh/절대경로/dist/index.js
```

## Tool 목록

**에이전트 메시지 & 컨텍스트 (핵심)**
- `herdr_agent_list` — 에이전트 목록과 상태(idle/working/blocked/done)
- `herdr_agent_get` — 에이전트 상세
- `herdr_agent_read` — 다른 에이전트의 pane 출력 읽기 (컨텍스트 핸드오프)
- `herdr_agent_send` — 에이전트에 텍스트 전송 (Enter 없음)
- `herdr_agent_wait` — 에이전트가 특정 상태가 될 때까지 대기
- `herdr_wait_output` — pane 출력이 텍스트/정규식과 일치할 때까지 대기

**에이전트 생애주기 & 탐색**
- `herdr_agent_start` — 새 에이전트 터미널 생성 (지원되는 모든 에이전트)
- `herdr_agent_rename`, `herdr_agent_focus`
- `herdr_integration_status` — herdr가 인지하는 에이전트 통합 목록과 상태

**세션**
- `herdr_session_list`, `herdr_session_stop`, `herdr_session_delete`

**Pane**
- `herdr_pane_list` / `get` / `read` / `split` / `run` / `send_text` / `send_keys` / `close` / `rename`
- 명령을 입력하고 **Enter까지** 누르려면 `herdr_pane_run`을, 글자만 입력하려면 `*_send_text`를 사용.

**Tab & Workspace**
- `herdr_tab_*` — list / create / get / focus / rename / close
- `herdr_workspace_*` — list / create / get / focus / rename / close

## 사용 팁

- **메시지/명령 전송**
  - 글자만 전달: `herdr_agent_send` (Enter 누르지 않음)
  - 제출까지 시키기: 이어서 `herdr_pane_send_keys`로 `enter` 전송
  - 셸 명령 실행: `herdr_pane_run` (입력 + Enter 한 번에) — 가장 간편
- **출력 읽기**: 컨텍스트 회수에는 `source: "visible"`이 화면 내용을 가장 안정적으로 반환합니다.
  `recent` / `recent-unwrapped`는 추적된 명령 출력 영역이 없으면 빈 값일 수 있습니다.

## 컨텍스트 & 세션 공유에 대하여

- **컨텍스트 공유**: `herdr_agent_read`로 다른 에이전트 출력을 가져오고(pull),
  `herdr_agent_send` / `herdr_pane_run`으로 전달(push)합니다.
- **세션**: 같은 herdr 서버에 붙은 모든 에이전트는 이미 하나의 세션(소켓)을 공유합니다 —
  이것이 컨텍스트 공유의 토대입니다. MCP로는 세션 조회/관리(`session_list`/`stop`/`delete`)가
  가능합니다. 사람이 원격으로 같은 세션에 접속하는 `session attach`는 herdr 네이티브 기능
  (SSH attach)이며 인터랙티브 동작이라 MCP tool에서는 의도적으로 제외했습니다.

## 개발

```bash
npm run dev   # tsx로 소스에서 바로 실행
```

## 라이선스

MIT
