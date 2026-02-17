# OpenClaw Security Checklist -- Stage 1

> This is the security foundation for the OpenClaw x LifeOS integration.
> Nothing gets installed until every box here is checked.

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

## Container Hardening

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
| Internal-only Docker network | [ ] | `docker-compose.yml` | `internal: true` prevents outbound from gateway network |
| JSON log rotation | [ ] | `docker-compose.yml` | max 3 files x 10MB |

## Network Isolation

| Control | Status | File | Notes |
|---------|--------|------|-------|
| Gateway bound to 127.0.0.1 | [ ] | `docker-compose.yml` | Ports `127.0.0.1:18789:18789` and `127.0.0.1:1455:1455` |
| UFW default deny inbound | [ ] | `setup-tailscale.sh` | `ufw default deny incoming` |
| SSH via Tailscale only | [ ] | `setup-tailscale.sh` | Port 22 allowed only on `tailscale0` interface |
| Gateway via Tailscale only | [ ] | `setup-tailscale.sh` | Port 18789 allowed only on `tailscale0` interface |
| Password auth disabled | [ ] | `setup-tailscale.sh` | `PasswordAuthentication no` in sshd_config |
| Root login restricted | [ ] | `setup-tailscale.sh` | `PermitRootLogin prohibit-password` |
| No public-facing ports | [ ] | Manual verify | `ss -tlnp` should show only 127.0.0.1 bindings + Tailscale |

## CVE-2026-25253 Mitigations

| Control | Status | File | Notes |
|---------|--------|------|-------|
| OpenClaw >= v2026.1.29 | [ ] | Stage 2 | Patched version with gateway URL confirmation modal |
| WebSocket origin validation | [ ] | `openclaw.template.json` | `wsOriginValidation: true` |
| CORS restricted | [ ] | `openclaw.template.json` | Only `127.0.0.1:18789` allowed |
| Approval mode: always-prompt | [ ] | `openclaw.template.json` | `exec.approvals.mode: "always-prompt"` -- never auto-approve |
| Control UI not exposed | [ ] | `docker-compose.yml` | Dashboard only on localhost, Tailscale-gated |
| Rate limiting enabled | [ ] | `openclaw.template.json` | 60 req/min max |
| Post-install: rotate all tokens | [ ] | Stage 2 | Generate fresh `OPENCLAW_GATEWAY_TOKEN` after install |

## Credential Isolation

| Control | Status | File | Notes |
|---------|--------|------|-------|
| .env file for secrets | [ ] | `.env.template` | API keys, tokens loaded from .env |
| .env never committed | [ ] | `.gitignore` | `.env` in gitignore |
| .env permissions 600 | [ ] | `setup-vps.sh` | `chmod 600 .env` during setup |
| Config mounted read-only | [ ] | `docker-compose.yml` | `config:/home/node/.openclaw:ro` |
| Secret redaction in logs | [ ] | `openclaw.template.json` | `logging.redactSecrets: true` |
| No secrets in Docker image | [ ] | Manual verify | `docker inspect` should show no embedded env vars |

## Pre-Deployment Verification

Run these checks before proceeding to Stage 2:

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
stat -c '%a %U:%G' .env  # Should be 600 root:root (or your user)

# 5. Verify Tailscale is connected
tailscale status

# 6. Verify no secrets in image layers
docker history openclaw:local --no-trunc | grep -i -E 'key|token|secret|password'
```

---

## Stage Progression

- **Stage 1** (this): Hardened container env + network isolation
- **Stage 2**: Install OpenClaw inside container, pair Telegram
- **Stage 3-12**: LifeOS skills, scheduler, proactive messaging, etc.

> Do NOT proceed to Stage 2 until every checkbox above is verified.
