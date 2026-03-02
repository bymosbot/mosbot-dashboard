# AGENTS.md — working in this repository

This file is the **universal entrypoint for AI agents** operating in this repo.

## What this repo is

**MosBot Dashboard** is the UI layer of [MosBot OS](https://github.com/bymosbot/mosbot-api) — a self-hosted operating system for AI agent work. It is a React 18 + Vite SPA that provides task management, org chart visualization, workspace browsing, and agent monitoring. It consumes the [MosBot API](https://github.com/bymosbot/mosbot-api) backend.

## Tech stack

- **React 18** — functional components with hooks only
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling (dark theme)
- **Zustand** — lightweight state management
- **Axios** — HTTP client (`src/api/client.js`)
- **React DnD** — drag-and-drop
- **Heroicons** — icons
- **Vitest** — unit tests

## Common commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (http://localhost:5173)
npm run build        # production build (output: dist/)
npm run preview      # preview production build
npm run test:run     # run tests once (CI mode)
npm run lint         # run ESLint
```

Or via Make:

```bash
make dev        # start Vite dev server
make lint       # lint
make test-run   # run tests once
make build      # production build
```

## Repo shape

```text
src/
  App.jsx               — root component and routing
  main.jsx              — entry point
  api/
    client.js           — shared Axios instance (use this, don't create new ones)
  components/           — reusable UI components
  pages/                — page-level components (one per route)
  stores/               — Zustand stores (one per domain)
  utils/
    helpers.js          — shared utilities (classNames, etc.)
    constants.js        — shared enums (statuses, priorities, columns)
  index.css             — Tailwind base + shared component classes
docs/                   — canonical documentation
```

## Where to read first

- **Local setup**: `docs/getting-started/local-development.md`
- **Configuration reference**: `docs/getting-started/configuration.md`
- **Architecture**: `docs/architecture.md`
- **MosBot OS overview**: `docs/mosbot-os/overview.md`
- **API integration**: `docs/integrations/mosbot-api.md`
- **OpenClaw integration**: `docs/integrations/openclaw.md`
- **Security / secrets**: `docs/security/secrets.md`
- **Cursor rules**: `.cursor/rules/overview.mdc`

## Key principles

1. **Use the shared `api` instance** from `src/api/client.js` — never create new Axios clients.
2. **Functional components only** — no class components.
3. **Zustand for all shared state** — one store per domain under `src/stores/`.
4. **Lazy-load tab data** — don't fetch on modal open; fetch on tab click.
5. **Always show loading and error states** — no silent async operations.
6. **`VITE_*` vars are public** — never put secrets in environment variables.

## Documentation conventions

- The **MosBot OS documentation home** is `docs/README.md` in the [mosbot-api repository](https://github.com/bymosbot/mosbot-api). Dashboard-specific docs live here; system-wide docs live there.
- Prefer updating canonical docs in `docs/` rather than adding new root-level markdown files.
- If replacing an older doc, keep it as a short pointer page and preserve original content under `docs/archive/` when useful (create the folder if it doesn't exist yet).
- Engineering patterns and code conventions live in `.cursor/rules/`, not in `docs/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
