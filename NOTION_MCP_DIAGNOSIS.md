# Notion MCP Update Tool — Failure Diagnosis

**Date:** 2026-02-19
**Investigated by:** Claude (LifeOS session)
**Status:** Root cause identified — upstream bug in Anthropic's MCP client/proxy layer

---

## Summary

The `notion-update-page` MCP tool consistently returns "Error occurred during tool execution" in Claude.ai chat sessions. This is a **known, unresolved upstream bug** in Anthropic's MCP framework, not a configuration or permission issue.

## Root Cause

**JSON Object Serialization Bug**: The MCP client/proxy layer calls `JSON.stringify()` on all tool parameter values before passing them to the MCP server, regardless of the parameter's expected schema type.

When `notion-update-page` requires a JSON **object** parameter (e.g., `data`, `parent`), the value:
```json
{"type": "page_id", "page_id": "abc123"}
```
arrives at the Notion MCP server as a double-escaped **string**:
```json
"{\"type\": \"page_id\", \"page_id\": \"abc123\"}"
```

The Notion MCP server uses Zod validation, which rejects this with:
```
MCP error -32602: Invalid arguments for tool notion-update-page:
"Expected object, received string"
```

## Why `notion-fetch` Works but `notion-update-page` Doesn't

| Tool | Parameter Types | Status |
|------|----------------|--------|
| `notion-fetch` | Flat strings only | Works |
| `notion-search` | Flat strings only | Works |
| `notion-get-comments` | Flat strings only | Works |
| `notion-update-page` | Nested JSON objects | **Broken** |
| `notion-move-pages` | Nested JSON objects | **Broken** |
| `notion-create-pages` (with parent) | Nested JSON objects | **Broken** |
| `notion-create-pages` (no parent) | Flat strings only | Works (creates orphan) |

## Why `notion-create-pages` Sometimes Works

The `create-page` tool has a simpler schema with explicit flat properties. When called **without** a `parent` parameter (which is a JSON object), it succeeds — but creates an orphan page at the workspace root. When called **with** a parent object, it fails identically to `update-page`.

The `update-page` tool's schema uses complex `allOf`/`anyOf` union structures, which exacerbate the serialization confusion.

## Not a Permission Issue

- Read-only tools work fine on the same pages
- The Notion integration token has read+write scope
- The same update operations work via the Notion API directly (curl/Python)
- The bug manifests identically across Claude Desktop Cowork and Claude.ai web chat

## Timeline

- **Before Feb 13, 2026**: Working
- **Feb 15, 2026**: Confirmed broken (regression)
- **Feb 19, 2026**: Still broken

## Tracked Issues

- [anthropics/claude-code#25865](https://github.com/anthropics/claude-code/issues/25865) — MCP connector serializes JSON objects as strings
- [anthropics/claude-code#26094](https://github.com/anthropics/claude-code/issues/26094) — Claude Desktop 1.1.3189 regression
- [makenotion/notion-mcp-server#67](https://github.com/makenotion/notion-mcp-server/issues/67) — update-pages body parsed as string
- [makenotion/notion-mcp-server#74](https://github.com/makenotion/notion-mcp-server/issues/74) — Claude Code struggling with MCP

## Workaround

Use the **Notion REST API directly** (via Python/curl) to perform write operations until the upstream serialization bug is fixed. See `notion_update_liza_profile.py` in this repo.

## OpenClaw MCP Config Note

The OpenClaw MCP (`freema/openclaw-mcp`) is a separate bridge for self-hosted OpenClaw assistants, not the official Notion MCP connector. The Notion MCP connector is configured through Claude Desktop Settings > Connectors or the Claude.ai MCP settings panel. The page at `30ac051d-73d2-81a7-bbb5-f30cc6242465` was not accessible from this environment (requires Notion authentication), but the issue is upstream in the MCP transport layer, not in the connector configuration itself.
