# Workspaces

Workspaces are the shared artifact layer of MosBot OS: files, notes, specs, and operational outputs. The dashboard provides a browsable view over agent/workspace roots.

## What Workspaces provide

- Browse a selected agent/workspace root
- Navigate via **breadcrumbs** and **deep links** (URL reflects selection)
- Use a **tree view** (expand on demand) or a **flat view** (list current directory)
- Filter within the current directory
- Preview file content (when permitted)

## Archived legacy workspace visibility

- The `Archived (Old Main)` agent is shown only when the legacy path `/_archived_workspace_main` exists in the workspace service
- If the path is missing (404) or cannot be verified, the archived agent is hidden

## Docs link lifecycle ownership

- Dashboard workspace screens are read-only with respect to docs-link bootstrap
- Dashboard does not call workspace-service link/symlink ensure endpoints on mount or navigation
- Docs-link reconcile/write behavior is system-managed server-side (mosbot-api lifecycle hooks)

## Permissions model (product intent)

MosBot OS separates “see structure” from “read/modify contents”:

- **All authenticated users** can browse workspace structure and file metadata
- **Only elevated roles** can read restricted file contents (policy-driven)
- **Only elevated roles** can modify workspace content (create/rename/move/delete)

When a user cannot read a file’s contents, the UI should show an access-restricted view **without leaking content**, but may still show **metadata** (size/modified) for transparency.

## File creation (nested paths)

Creating a new file may accept a nested path (example: `docs/guides/setup.md`) and create missing parent folders.

### Safety semantics

- `..` sequences are blocked (path traversal)
- Invalid filename characters are rejected
- Paths must end in a filename (cannot end with `/`)
- **Create is non-destructive**: creating a file/folder where something already exists should be rejected (no silent overwrite)
- Path conflicts should produce clear errors (e.g., “segment exists as a file but must be a folder”)

## Move (drag-and-drop)

Files can be moved by dragging a file onto a folder in the tree view.

### Semantics

- Only files are moved (folder moves may be unsupported)
- If the destination already has a file with the same name, the UI should prompt for overwrite confirmation (move is an explicit intent)
- After a move, both source and destination listings should refresh

## UX for restricted users

For users without modify permissions:

- Show modification buttons/controls in a **disabled** state (discoverable), with tooltips explaining why
- Allow browsing and metadata visibility
- Block actions (create/rename/delete/move) and rely on backend enforcement

## Quick reference

See `reference/workspaces-quick-reference.md`.
