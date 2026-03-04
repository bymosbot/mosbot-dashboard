# Architecture

MosBot Dashboard is the UI layer of MosBot OS. See the full system architecture in [mosbot-api/docs/architecture.md](https://github.com/bymosbot/mosbot-api/blob/main/docs/architecture.md).

## Dashboard internals

```text
src/
├── api/           # Axios client + all API call functions
├── components/    # Reusable React components
├── pages/         # Page-level components (one per route)
├── stores/        # Zustand state stores
├── utils/         # Utility functions
├── constants/     # Static constants (model lists, etc.)
├── config/        # Static config (agent visualization fallbacks)
├── App.jsx        # Router and layout
└── main.jsx       # Entry point
```

## State management

Each domain has its own Zustand store in `src/stores/`:

| Store            | Responsibility                            |
| ---------------- | ----------------------------------------- |
| `authStore`      | JWT token, current user, login/logout     |
| `taskStore`      | Tasks, kanban columns, filters            |
| `agentStore`     | OpenClaw agents and agents-page hierarchy |
| `workspaceStore` | Workspace file tree                       |
| `activityStore`  | Activity log feed                         |
| `schedulerStore` | Cron jobs                                 |
| `usageStore`     | Session usage analytics                   |
| `uiStore`        | UI state (sidebar, modals)                |
| `toastStore`     | Toast notifications                       |

## API client

`src/api/client.js` exports an Axios instance with:

- Base URL from `VITE_API_URL`
- JWT token injected from `localStorage` on every request
- Automatic retry with exponential backoff for 5xx and timeout errors
- `withCredentials: true` for Cloudflare Access cookie support

## Routing

React Router v6 with protected routes. All routes except `/login` require a valid JWT token (checked by `authStore`).

## Build

Vite builds to `dist/`. The output is a fully static site with no server-side rendering.
