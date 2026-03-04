# MosBot Dashboard docs

These docs describe the **MosBot Dashboard** (the UI/control plane) and how it fits into **MosBot OS**.

- If you're a **human/operator**, start with: `mosbot-os/overview.md`
- If you're a **developer**, start with: `getting-started/local-development.md`

> **Looking for full MosBot OS docs?** Visit **[bymosbot.github.io/mosbot-docs](https://bymosbot.github.io/mosbot-docs/)** — the official documentation site covering setup, OpenClaw integration, skills, configuration, and deployment.

## What this docs folder is (and isn't)

- This repo's `docs/` is **project documentation** for the dashboard (product, ops, integrations, runbooks).
- It is **not** the same thing as the **MosBot OS "Docs" workspace** shown inside the dashboard UI (the `/docs` folder in OpenClaw config-root workspaces).
- Engineering conventions for code changes live in `.cursor/rules/` (Cursor rules), not here.

## Index

### MosBot OS

- `mosbot-os/overview.md` — MosBot OS mental model + dashboard navigation map

### Getting started

- `getting-started/local-development.md` — run locally
- `getting-started/configuration.md` — environment variables and runtime config

### Features (product behavior)

- `features/kanban.md`
- `features/task-modal.md`
- `features/task-manager.md`
- `features/agent-chart.md` (Agents dashboard)
- `features/workspaces.md`
- `features/docs.md`
- `features/activity-log.md`
- `features/archived.md`
- `features/settings-users.md`

### Security

- `security/permissions.md` — roles + permissions matrix (dashboard UX)

### Integrations

- `integrations/mosbot-api.md` — how the dashboard talks to MosBot API
- `integrations/openclaw.md` — OpenClaw assumptions and health/status semantics

### Operations / deployment

- `operations/cloudflare-access.md` — Cloudflare Access configuration runbook
- `deployment/static-hosting.md` — S3/CloudFront deployment (CI + manual)

### Reference

- `reference/workspaces-quick-reference.md`
