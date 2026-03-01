# MosBot Dashboard

[![CI](https://github.com/bymosbot/mosbot-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/bymosbot/mosbot-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-bymosbot.github.io-blue)](https://bymosbot.github.io/mosbot-docs/)

The **UI layer** of [MosBot OS](https://github.com/bymosbot/mosbot-api) — a self-hosted operating system for AI agent work.

MosBot Dashboard is a React 18 + Vite SPA that provides task management, org chart visualization, workspace browsing, and agent monitoring. It consumes the [MosBot API](https://github.com/bymosbot/mosbot-api) backend.

> **Disclaimer:** MosBot OS is vibe-coded with minimal actual code reviews. It is currently used for personal usage only.

## Screenshots

| Feature | Preview |
|--------|---------|
| **Task Board** | ![Task Board](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-task-board.png) |
| **Agent Monitor** | ![Agent Monitor](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-agent-monitor.png) |
| **Org Chart** | ![Org Chart](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-org-chart.png) |
| **Workspaces** | ![Workspaces](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-workspaces.png) |
| **Standups** | ![Standups](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-standup.png) |
| **Scheduler** | ![Scheduler](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-ascheduler.png) |
| **Usage & Cost** | ![Usage](https://bymosbot.github.io/mosbot-docs/img/screenshots/mosbot-usage-and-cost.png) |

See the [full documentation site](https://bymosbot.github.io/mosbot-docs/) for more screenshots.

## Features

- **Agent Monitor** — view active sessions, costs, and usage analytics
- **Task Board** — drag-and-drop task management with priorities, tags, and dependencies
- **Standups** — daily AI-generated standup summaries
- **Org Chart** — live visualization of AI agents with real-time session status
- **Workspaces** — browse and edit agent workspace files
- **Scheduler** — schedule and monitor recurring agent tasks
- **Users** — role-based access (owner, admin, agent, user)

## Quickstart

The recommended way to run the full stack is via Docker Compose in the `mosbot-api` repo:

```bash
git clone https://github.com/bymosbot/mosbot-api.git
git clone https://github.com/bymosbot/mosbot-dashboard.git
cd mosbot-api
cp .env.example .env   # edit required values
make up
```

Dashboard will be available at **<http://localhost:5173>**.

### Dashboard-only dev server

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your running API
npm run dev
```

## Available commands

```bash
make dev        # start Vite dev server (http://localhost:5173)
make lint       # run ESLint
make test-run   # run tests once (CI mode)
make build      # build for production (output: dist/)
```

## Tech stack

- **React 18** with hooks (functional components only)
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling
- **Zustand** — lightweight state management
- **Axios** — HTTP client with retry logic
- **React DnD** — drag-and-drop
- **Heroicons** — icons
- **Vitest** — unit tests

## Documentation

**Full documentation: [bymosbot.github.io/mosbot-docs](https://bymosbot.github.io/mosbot-docs/)**

| Topic | Link |
| ----- | ---- |
| Getting started | [Quickstart](https://bymosbot.github.io/mosbot-docs/getting-started/quickstart) |
| Features | [Task management](https://bymosbot.github.io/mosbot-docs/features/task-management) · [Agent Monitor](https://bymosbot.github.io/mosbot-docs/features/agent-monitor) · [Org Chart](https://bymosbot.github.io/mosbot-docs/features/org-chart) |
| Skills | [Overview](https://bymosbot.github.io/mosbot-docs/skills/overview) |
| OpenClaw integration | [Overview](https://bymosbot.github.io/mosbot-docs/openclaw/overview) |
| Deployment | [Docker](https://bymosbot.github.io/mosbot-docs/deployment/docker) · [Kubernetes](https://bymosbot.github.io/mosbot-docs/deployment/kubernetes) |
| Security | [Roles & permissions](https://bymosbot.github.io/mosbot-docs/security/roles-permissions) |

Developer-focused docs (component architecture, local dev setup) remain in [`docs/`](docs/README.md).

## Known bugs / pending fixes

- **Create new agent** — Not working. Do not use.
- **Config update** — May not be as reliable due to REDACTIONS. Prefer using OpenClaw's ControlUI instead.

## TODO

- [ ] Fix the known issues above.
- [ ] Org chart: reference OpenClaw agents list and org-chart JSON file for supplementary metadata.
- [ ] Increase code coverage to 100% for Dashboard.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
