# Agents

This page is the **Agents** dashboard. It visualizes the current OpenClaw agent set and optional reporting structure.

## What it shows

- Agents discovered from `openclaw.json` (`agents.list`)
- Optional hierarchy from `agents.json` when present
- Live session/status overlays
- Identity metadata (name, emoji, role/theme)

## Status semantics (badges)

Nodes may appear with:

- **Active**: agent currently has a live session
- **Scaffolded**: placeholder/planned configuration
- **Deprecated**: intentionally retired
- **You**: human/operator node (when configured)

## Configuration behavior

The dashboard first reads agent definitions from `openclaw.json` through MosBot API + workspace service.
If optional hierarchy metadata is unavailable, the page falls back to the default flat/derived rendering.
