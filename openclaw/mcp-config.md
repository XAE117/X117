# MCP Configuration -- Stage 3

Four MCP servers provide external integrations for the LifeOS agent. The config is shared between OpenClaw (production, via `openclaw.template.json`) and Claude Code (local dev, via `.mcp.json` at project root).

## Servers

| Server | Package | Access | Purpose |
|--------|---------|--------|---------|
| `notion-rw` | `@notionhq/notion-mcp-server` | **Read-write** | Projects, CRM, Daily Fuel Log, Time Tracking |
| `notion-ro` | `@notionhq/notion-mcp-server` | **Read-only** | Ancient Paths, Operations Room |
| `google-calendar` | `@cocal/google-calendar-mcp` | **Read-only** | Calendar events, free/busy |
| `gmail` | `@gongrzhe/server-gmail-autoauth-mcp` | **Read-only** | Email search and reading |

## Notion Setup (Two Integrations)

Two separate Notion integrations enforce least-privilege access:

### 1. Create RW Integration
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration named **"LifeOS RW"**
3. Under **Capabilities**, enable: Read content, Update content, Insert content
4. Copy the token (starts with `ntn_`)
5. In Notion, share these databases with the integration:
   - **Projects**
   - **CRM**
   - **Daily Fuel Log**
   - **Time Tracking**
6. Add the token to `.env` as `NOTION_RW_TOKEN`

### 2. Create RO Integration
1. Create another integration named **"LifeOS RO"**
2. Under **Capabilities**, enable only: Read content
3. Copy the token
4. Share these databases with the integration:
   - **Ancient Paths**
   - **Operations Room**
5. Add the token to `.env` as `NOTION_RO_TOKEN`

### Available Notion Tools (22 per server instance)
| Tool | RW | RO | Description |
|------|:--:|:--:|-------------|
| `search-notion` | W | R | Search workspace |
| `query-data-source` | W | R | Query database with filters/sorts |
| `retrieve-a-data-source` | W | R | Get database schema |
| `retrieve-a-page` | W | R | Get page properties |
| `get-page-content` | W | R | Read page as markdown |
| `create-a-page` | W | -- | Create new page |
| `create-a-page-in-database` | W | -- | Add database entry |
| `update-a-page` | W | -- | Modify page properties |
| `append-block-content` | W | -- | Add blocks to page |
| `retrieve-comments` | W | R | Read comment threads |
| `create-a-comment` | W | -- | Add comment |

**W** = works, **R** = works (read), **--** = fails silently (no capability)

## Google Calendar Setup

Uses `@cocal/google-calendar-mcp` with tool filtering for read-only access.

### Initial Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or reuse existing)
3. Enable the **Google Calendar API**
4. Create an **OAuth 2.0 Client ID** (Desktop app type)
5. Download credentials JSON

### File Placement
```
openclaw/credentials/google-oauth.keys.json   # OAuth client credentials
```

### Initial Authentication
```bash
cd openclaw
GOOGLE_OAUTH_CREDENTIALS="$(pwd)/credentials/google-oauth.keys.json" \
  npx -y @cocal/google-calendar-mcp auth
```
A browser window opens for consent. Token is cached by the MCP server.

### Allowed Tools (read-only enforcement)
Set via `ENABLED_TOOLS` env var:
- `list-calendars` -- Enumerate accessible calendars
- `list-events` -- Get events with date range filtering
- `get-event` -- Fetch specific event details
- `search-events` -- Text search across events
- `get-freebusy` -- Check availability
- `get-current-time` -- Current timestamp in calendar timezone
- `list-colors` -- Available event color options

Blocked (not in `ENABLED_TOOLS`): `create-event`, `update-event`, `delete-event`, `respond-to-event`

## Gmail Setup

Uses `@gongrzhe/server-gmail-autoauth-mcp`. Read-only enforced at the OAuth scope level.

### Initial Setup
1. In the same Google Cloud project, enable the **Gmail API**
2. Reuse the same OAuth Client ID (same `google-oauth.keys.json`)
3. In OAuth consent screen, add scope: `https://www.googleapis.com/auth/gmail.readonly`
4. **Do NOT add** `gmail.modify`, `gmail.compose`, `gmail.send`, or `https://mail.google.com/`

### File Placement
```
openclaw/credentials/google-oauth.keys.json   # Same OAuth client credentials
openclaw/credentials/gmail-token.json          # Generated after first auth
```

### Initial Authentication
```bash
cd openclaw
GMAIL_OAUTH_PATH="$(pwd)/credentials/google-oauth.keys.json" \
GMAIL_CREDENTIALS_PATH="$(pwd)/credentials/gmail-token.json" \
  npx -y @gongrzhe/server-gmail-autoauth-mcp auth
```

### Available Tools (with `gmail.readonly` scope)
Working: `search_emails`, `read_email`, `list_email_labels`
Failing gracefully (no scope): `send_email`, `draft_email`, `modify_email`, `delete_email`

## Config Shareability

The MCP server definitions are intentionally identical between:

| Context | Config File | Token Source |
|---------|-------------|--------------|
| **OpenClaw (prod)** | `openclaw/config/openclaw.template.json` → `agents.lifeos.mcpServers` | `.env` via `${VAR}` substitution |
| **Claude Code (dev)** | `.mcp.json` at project root | Shell env vars or `.env` loaded by Claude Code |

Both use `npx -y <package>` to spawn MCP servers as subprocesses. The only difference is credential file paths:
- OpenClaw: `/home/node/.credentials/` (bind-mounted from `openclaw/credentials/`)
- Claude Code: `${HOME}/.credentials/` (local machine path)

## Docker Topology

```
┌──────────────────────────────────────┐
│  openclaw-gateway (egress network)   │
│                                      │
│  ┌─ npx notion-mcp-server (rw) ─┐   │──► Notion API
│  ┌─ npx notion-mcp-server (ro) ─┐   │──► Notion API
│  ┌─ npx google-calendar-mcp ────┐   │──► Google Calendar API
│  ┌─ npx gmail-autoauth-mcp ─────┐   │──► Gmail API
│                                      │
│  credentials/ ──► /home/node/.credentials (ro)
│  .npm tmpfs  ──► /home/node/.npm (512m)
└──────────────────────────────────────┘
```

MCP servers run as **subprocesses** inside the gateway container, inheriting its egress network access. No additional containers needed.

## Verification

```bash
cd openclaw
./test-mcp-roundtrip.sh          # All checks
./test-mcp-roundtrip.sh notion   # Notion only
./test-mcp-roundtrip.sh calendar # Calendar only
./test-mcp-roundtrip.sh gmail    # Gmail only
./test-mcp-roundtrip.sh gateway  # Gateway integration
```

## Token Rotation

| Token | Rotation | Notes |
|-------|----------|-------|
| `NOTION_RW_TOKEN` | Rotate at [notion.so/my-integrations](https://www.notion.so/my-integrations) | Regenerate secret, update `.env` |
| `NOTION_RO_TOKEN` | Same process | Separate integration, separate token |
| Google OAuth | Tokens auto-refresh | If revoked, re-run `auth` command |
| Gmail OAuth | Tokens auto-refresh | In test mode, expires every 7 days |

After rotating, rebuild the config and restart:
```bash
./install.sh   # Re-generates openclaw.json from template + .env
```
