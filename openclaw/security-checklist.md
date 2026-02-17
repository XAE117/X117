# OpenClaw Security Checklist -- Stage 1 + Stage 2

> This is the security foundation for the OpenClaw x LifeOS integration.
> Nothing goes live until every box here is checked.

## Why Security First

**CVE-2026-25253** is a critical (CVSS 8.8) remote code execution vulnerability
in OpenClaw that allows one-click host compromise via WebSocket hijacking.

**Kill chain**: Victim clicks malicious URL -> auth token exfiltrated in
milliseconds -> cross-site WebSocket hijack -> sandbox disabled via API
(`exec.approvals.set = off`) -> Docker escape (`tools.exec.host = gateway`)
-> full RCE on host.

**Key insight**: The vulnerability bypasses localhost restrictions because the
victim's own browser initiates the outbound WebSocket connection. Binding to
`127.0.0.1` alone is NOT sufficient -- you also need WebSocket origin
validation and network-level isolation.

References:
- [NVD Entry](https://nvd.nist.gov/vuln/detail/CVE-2026-25253)
- [depthfirst Writeup](https://depthfirst.com/post/1-click-rce-to-steal-your-moltbot-data-and-keys)
- [The Hacker News](https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html)
- [SocRadar Analysis](https://socradar.io/blog/cve-2026-25253-rce-openclaw-auth-token/)

---

## Stage 1: Container Hardening

| Control | Status | File | Notes |
|---------|--------|------|-------|
| Read-only root filesystem | [ ] | `docker-compose.yml` | `read_only: true` on both gateway and sandbox |
| Drop ALL capabilities | [ ] | `docker-compose.yml` | `cap_drop: ALL`, only `NET_BIND_SERVICE` added back for gateway |
| No new privileges | [ ] | `docker-compose.yml` | `security_opt: no-new-privileges:true` |
| tmpfs for /tmp, /var/tmp, /run | [ ] | `docker-compose.yml` | `noexec,nosuid,nodev` flags set |
| Memory limits | [ ] | `docker-compose.yml` | Gateway: 2GB, Sandbox: 1GB |
| PID limits | [ ] | `docker-compose.yml` | Gateway: 512, Sandbox: 256 |
| File descriptor limits | [ ] | `docker-compose.yml` | Sandbox: soft 1024 / hard 2048 |
| Sandbox network isolation | [ ] | `docker-compose.yml` | `network_mode: none` on sandbox container |
| Internal-only Docker network | [ ] | `docker-compose.yml` | `internal: true` prevents outbound from internal network |
| JSON log rotation | [ ] | `docker-compose.yml` | max 3 files x 10MB |

## Stage 1: Network Isolation

| Control | Status | File | Notes |
|---------|--------|------|-------|
| Gateway bound to 127.0.0.1 | [ ] | `docker-compose.yml` | Ports `127.0.0.1:18789:18789` and `127.0.0.1:1455:1455` |
| UFW default deny inbound | [ ] | `setup-tailscale.sh` | `ufw default deny incoming` |
| SSH via Tailscale only | [ ] | `setup-tailscale.sh` | Port 22 allowed only on `tailscale0` interface |
| Gateway via Tailscale only | [ ] | `setup-tailscale.sh` | Port 18789 allowed only on `tailscale0` interface |
| Password auth disabled | [ ] | `setup-tailscale.sh` | `PasswordAuthentication no` in sshd_config |
| Root login restricted | [ ] | `setup-tailscale.sh` | `PermitRootLogin prohibit-password` |
| No public-facing ports | [ ] | Manual verify | `ss -tlnp` should show only 127.0.0.1 bindings + Tailscale |

## Stage 1: CVE-2026-25253 Mitigations

| Control | Status | File | Notes |
|---------|--------|------|-------|
| WebSocket origin validation | [ ] | `openclaw.template.json` | `wsOriginValidation: true` |
| CORS restricted | [ ] | `openclaw.template.json` | Only `127.0.0.1:18789` allowed |
| Approval mode: always-prompt | [ ] | `openclaw.template.json` | `exec.approvals.mode: "always-prompt"` |
| Control UI not exposed | [ ] | `docker-compose.yml` | Dashboard only on localhost, Tailscale-gated |
| Rate limiting enabled | [ ] | `openclaw.template.json` | 60 req/min max |

## Stage 1: Credential Isolation

| Control | Status | File | Notes |
|---------|--------|------|-------|
| .env file for secrets | [ ] | `.env.template` | API keys, tokens loaded from .env |
| .env never committed | [ ] | `.gitignore` | `.env` in gitignore |
| .env permissions 600 | [ ] | `setup-vps.sh` | `chmod 600 .env` during setup |
| Config mounted read-only | [ ] | `docker-compose.yml` | `config:/home/node/.openclaw:ro` |
| Secret redaction in logs | [ ] | `openclaw.template.json` | `logging.redactSecrets: true` |
| No secrets in Docker image | [ ] | Manual verify | `docker inspect` should show no embedded env vars |

---

## Stage 2: Image Build & CVE Patch

| Control | Status | File | Notes |
|---------|--------|------|-------|
| OpenClaw >= v2026.1.29 | [ ] | `Dockerfile` | Pinned via `OPENCLAW_VERSION` build arg |
| Version verified at install | [ ] | `install.sh` | Script checks `openclaw --version` against minimum |
| tini as PID 1 | [ ] | `Dockerfile` | Proper signal handling, no zombie processes |
| Non-root container user | [ ] | `Dockerfile` | Runs as `node` user, not root |
| Minimal base image | [ ] | `Dockerfile` | `node:20-bookworm-slim` with `--no-install-recommends` |
| npm cache purged | [ ] | `Dockerfile` | `npm cache clean --force` after install |
| Sandbox minimal toolchain | [ ] | `Dockerfile.sandbox` | Only python3, sqlite3, curl, jq, tini |
| Sandbox unprivileged user | [ ] | `Dockerfile.sandbox` | Runs as `sandbox` user (uid 1001) |

## Stage 2: Config Generation & Token Rotation

| Control | Status | File | Notes |
|---------|--------|------|-------|
| Config generated from template | [ ] | `install.sh` | `envsubst` substitutes .env into openclaw.json |
| No raw `${...}` in generated config | [ ] | `install.sh` | Script checks for unresolved variable references |
| Generated config is valid JSON | [ ] | `install.sh` | Python JSON validation before launch |
| Gateway token rotated at install | [ ] | `install.sh` | Fresh `openssl rand -hex 32` at every install |
| Generated config permissions 640 | [ ] | `install.sh` | `chmod 640 openclaw.json` |

## Stage 2: Telegram Channel Security

| Control | Status | File | Notes |
|---------|--------|------|-------|
| Telegram channel enabled | [ ] | `openclaw.template.json` | Polling mode (no webhook = no inbound port needed) |
| Bot token via .env only | [ ] | `openclaw.template.json` | `${TELEGRAM_BOT_TOKEN}` substituted at install |
| allowedUsers configured | [ ] | `pair-telegram.sh --chat-id` | Restricts bot to your Telegram account only |
| Per-channel rate limit | [ ] | `openclaw.template.json` | 30 messages/min max on Telegram |
| Webhook disabled | [ ] | `openclaw.template.json` | Polling-only -- no public endpoint exposed |
| Bot identity verified | [ ] | `pair-telegram.sh` | Script validates token via `getMe` API |

## Stage 2: Egress Network

| Control | Status | File | Notes |
|---------|--------|------|-------|
| Egress network for gateway only | [ ] | `docker-compose.yml` | `openclaw-egress` bridge (non-internal) for API calls |
| Sandbox stays network-isolated | [ ] | `docker-compose.yml` | `network_mode: none` unchanged |
| Gateway on both networks | [ ] | `docker-compose.yml` | Internal (sandbox comms) + egress (Telegram/Anthropic API) |

## Stage 2: Post-Launch Verification

| Control | Status | File | Notes |
|---------|--------|------|-------|
| `verify-security.sh` passes | [ ] | `verify-security.sh` | Automated check of all above controls |
| Health check passes | [ ] | `install.sh` | Gateway reports `healthy` within 60s |
| Telegram polling confirmed | [ ] | `install.sh` | Gateway logs show Telegram activity |
| Smoke test message sent | [ ] | Manual | Send message to bot, confirm response |

---

## Pre-Deployment Verification Commands

```bash
# 1. Verify no public ports exposed
ss -tlnp | grep -v 127.0.0.1 | grep -v tailscale

# 2. Verify UFW rules
ufw status verbose

# 3. Verify Docker security flags
docker inspect openclaw-gateway | jq '.[0].HostConfig | {
  ReadonlyRootfs,
  CapDrop,
  CapAdd,
  SecurityOpt,
  Memory,
  PidsLimit
}'

# 4. Verify .env permissions
stat -c '%a %U:%G' /opt/openclaw/.env  # Should be 600 root:root

# 5. Verify Tailscale is connected
tailscale status

# 6. Verify no secrets in image layers
docker history openclaw:local --no-trunc | grep -i -E 'key|token|secret|password'

# 7. Verify OpenClaw version (CVE patch)
docker run --rm openclaw:local openclaw --version

# 8. Run the automated security check
cd /opt/openclaw && ./verify-security.sh
```

---

## Stage Progression

- **Stage 1**: Hardened container env + network isolation
- **Stage 2** (this): Build images, install OpenClaw, pair Telegram
- **Stage 3**: Write the LifeOS AgentSkill (habits, fitness, finance, journal, goals)
- **Stage 4-12**: DB mounting, scheduler, alerts, digest, NLP, Notion, multi-channel, monitoring

> Do NOT proceed to Stage 3 until `verify-security.sh` passes with 0 failures.
