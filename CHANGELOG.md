# Changelog

All notable changes to MosBot Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Tool call display support in SessionDetailPanel with expandable argument details
- ToolCallChip component for displaying tool calls with preview and expandable JSON arguments
- Comprehensive test suite covering App, API client, components (GlobalSessionPoller, JsonBlock, Layout, LiveAgentStatus, TerminalBlock), stores (activityStore, agentStore, authStore, botStore, schedulerStore, toastStore, workspaceStore), config (agencyOrgChart), and utilities (helpers, orgChartValidation, pathValidation)
- `.claude/` project rules and configuration (CLAUDE.md + rules for architecture, contributing, security, testing)

### Changed

- Renamed Org Chart page to Agents
- Simplified Agents view to remove corporate defaults and focus on single-agent display
- Message rendering now handles both string and array content formats (blocks-based messages)
- Tool calls are now displayed alongside message content in session detail view
- Improved handling of assistant messages with no content or tool calls (skips empty messages)
- Workspace agent list now shows the legacy `Archived (Old Main)` entry only when
  `/_archived_workspace_main` exists in the workspace service
- Dashboard no longer performs workspace symlink/link write operations on page load;
  docs-link reconciliation is system-managed by mosbot-api + workspace-service lifecycle hooks
- Dashboard docs updated to reflect `/docs` as the shared docs workspace root
- Dashboard docs now consistently refer to the Agents page (replacing legacy Org Chart wording)
- CI workflow updated to include test execution step
- Vite config updated to support test environment
- `.gitignore` updated to exclude additional generated files
- Documentation references updated to align with new Agents naming

### Security

- Switched Gitleaks license key to an organization secret

## [0.1.4] - 2026-03-02

### Added

- Syntax highlighting for code files in FilePreview using react-syntax-highlighter (vsc-dark-plus theme)
- Language detection utility supporting 30+ file types (JS, TS, Python, Go, Rust, SQL, Docker, and more)
- `.eslintignore` file to exclude build artifacts and dependencies from linting
- Vite dependency optimization for react-syntax-highlighter

### Changed

- Model display format standardized across all components - now shows "alias (id)" pattern
- ModelFleetSettings search now includes alias field; sorting uses alias (with name fallback)
- SkillsGroupedList refactored to use controlled expansion state (lifted from internal component state)
- WorkspaceExplorer improved tree navigation with automatic ancestor folder expansion
- WorkspaceTree refactored to use controlled expansion state via props
- CronJobs page refactored to fetch models at page level (shared across rows and modals)
- FilePreview improved agent-only file handling with proper agentId extraction from paths
- Various code cleanup and simplification across components

### Fixed

- Agent-only skill files now correctly associate with their agent for content fetching
- Workspace tree now properly expands ancestors when navigating via URL or selecting files
- Model alias now properly displayed in CronRunHistoryPanel message bubbles

## [0.1.3] - 2026-03-01

### Changed

- Updated workspace paths: `/shared/docs` → `/docs` and `/shared/projects` → `/projects`
- Updated README and documentation to reference new documentation site (bymosbot.github.io/mosbot-docs)
- Added backward compatibility for legacy `/shared/projects` paths in Log page

## [0.1.2] - 2026-03-01

### Added

- Frontmatter parsing and display in FilePreview component

### Security

- Updated .gitignore to include .env.bak file

## [0.1.1] - 2026-03-01

### Changed

- Improved session counts handling in BotAvatar and botStore

### Fixed

- Updated deployment condition to check for non-forked repositories

## [0.1.0] - 2026-02-28

First push. Initial project setup and open source release of MosBot Dashboard.

[Unreleased]: https://github.com/bymosbot/mosbot-dashboard/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/bymosbot/mosbot-dashboard/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/bymosbot/mosbot-dashboard/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/bymosbot/mosbot-dashboard/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/bymosbot/mosbot-dashboard/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/bymosbot/mosbot-dashboard/releases/tag/v0.1.0
