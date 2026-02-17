# =============================================================================
# OpenClaw Gateway -- Stage 2
# =============================================================================
# Builds the hardened OpenClaw gateway image, pinned to v2026.1.29+
# which includes the CVE-2026-25253 patch (WebSocket origin validation).
#
# Build:  docker build -t openclaw:local .
# =============================================================================
FROM node:20-bookworm-slim AS base

# Pin OpenClaw version -- MUST be >= 2026.1.29 for CVE-2026-25253 fix
ARG OPENCLAW_VERSION=2026.1.29

# Non-root user for runtime (node user exists in node base image)
# Install OpenClaw globally as root, then drop privileges
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw at the pinned version
RUN npm install -g "openclaw@${OPENCLAW_VERSION}" --omit=dev \
    && npm cache clean --force

# Create directories the gateway expects
RUN mkdir -p /home/node/.openclaw /home/node/.openclaw-state \
    && chown -R node:node /home/node/.openclaw /home/node/.openclaw-state

# Drop to non-root
USER node
WORKDIR /home/node

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
    CMD openclaw health --token "$OPENCLAW_GATEWAY_TOKEN" || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["openclaw", "gateway", "--config", "/home/node/.openclaw/openclaw.json"]
