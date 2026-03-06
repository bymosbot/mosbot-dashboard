# MosBot OS overview

MosBot OS is a **self-hosted operating system for agent work**, operated primarily through the **MosBot Dashboard**.

It’s built for two audiences:

- **Humans/operators**: a clear UI to plan, execute, and review work
- **Agents**: a stable, legible operational environment where work is captured as tasks, decisions are written down, and artifacts live in shared workspaces

## The MosBot OS mental model

### Tasks are the unit of work

Everything important in MosBot OS should map to a **task**:

- Tasks are durable and reviewable (not ephemeral chat)
- Tasks have a status pipeline, and status is the primary truth of what’s happening
- Tasks are collaborative: humans and agents leave **Comments** and the system keeps **History**

### The dashboard is the control plane

If you’re operating MosBot OS, you’ll spend nearly all your time in:

- **Kanban** (work state and prioritization)
- **Task Manager** (runtime visibility: sessions/metrics + cron jobs)
- **Agents** (system structure and capability map)
- **Workspaces + Docs** (shared artifacts and durable knowledge)
- **Activity Log** (narrative timeline across the system)

### OpenClaw is the source of truth

- Agent definitions, hierarchy, and workspace roots live in OpenClaw (e.g. `openclaw.json`)
- The dashboard consumes data exposed by MosBot API; it should not directly mutate OpenClaw config files

## Navigation map (key pages)

MosBot OS is organized into these main pages in the sidebar:

- **Task Manager** (Overview)
- **Kanban**
- **Agents**
- **Workspaces**
- **Docs**
- **Activity Log**
- **Settings**
- **Archived**

## Where to go next (deeper docs)

- `features/task-manager.md`
- `features/kanban.md`
- `features/task-modal.md`
- `features/agent-chart.md` (Agents)
- `features/workspaces.md`
- `features/docs.md`
- `features/activity-log.md`
- `features/archived.md`
- `features/settings-users.md`

## Collaboration norms (humans + agents)

### For humans/operators

- Operate by **Kanban status**: status is the primary truth of work state
- Use **Comments** for narrative: decisions, progress, blockers, outcomes
- Use **History** for audit: resolve “what changed and when”
- Use **Docs** for durable truth: if it matters later, document it

### For agents

Keep MosBot OS legible for humans:

- Write scannable titles and complete descriptions
- Use tags to route and cluster work
- Leave a comment when a key decision is made or a task is completed

## Glossary

- **Task**: the durable unit of work in MosBot OS
- **Kanban**: the status pipeline view of tasks
- **Task Manager**: runtime/operations view (sessions + metrics + cron jobs)
- **Agents**: system structure and capability map
- **Workspace**: browsable shared filesystem view, permissioned by role
- **Docs**: shared documentation workspace at `/docs`
- **Activity Log**: chronological narrative stream of actions/events
