# Project-Specific Instructions Directory

## STRONGLY RECOMMENDED: Create Your Own Rules in `.cursor/rules/` directory

Refer to `.cursor/rules/README.md` for further instructions.

This directory is **intended for project-specific rules** that you should create locally to define coding standards, conventions, and best practices for your project.

This project is intentionally left empty. Any project rules / instructions should live in `.cursor/rules/` directory.

## Linking to Cursor Rules

In order for your Copilot to understand the project rules / instructions, simply create a copilot-instructions.md file under `.github/` directory.

### Sample `.github/copilot-instructions.md`

```md
# Outsourcer Guidelines Overview

- Focus Areas: API handlers, services (AWS, location, SMS, email), cron jobs, shared utilities
- Runtime: `nodejs20.x` with TypeScript strict; Serverless + Lesgo patterns
- Framework: Lesgo framework (`github:reflex-media/lesgo-framework`) for handlers/services
- Testing: `npm run test`, `npm run coverage`, `npm run postman:contract --env=<env>` (see [testing.mdc](mdc:../.cursor/rules/testing.mdc) for test creation guidelines)
- Tooling: ESLint (Airbnb base) + Prettier, Babel/Webpack, Serverless plugins
- MCP Servers: Atlassian (for Jira/Confluence integration via `Atlassian-MCP-Server`) and Context7 (for external library documentation) MCP Servers are available for use.
- **Minimal-Change Policy**: Prefer the smallest viable change; avoid refactors unless essential; check with the user before any major refactor.
- Key Rules:
  - For API endpoint creation and maintenance, see [api-handlers.mdc](mdc:../.cursor/rules/api-handlers.mdc).
  - For general coding conventions and project structure, see [conventions.mdc](mdc:../.cursor/rules/conventions.mdc).
  - For integrating with AWS and other third-party services, see [services.mdc](mdc:../.cursor/rules/services.mdc).
  - For guidelines on deprecating code, see [deprecations.mdc](mdc:../.cursor/rules/deprecations.mdc).
  - For testing guidelines, see [testing.mdc](mdc:../.cursor/rules/testing.mdc).
  - For infrastructure and deployment details, see [infrastructure.mdc](mdc:../.cursor/rules/infrastructure.mdc).
  - For tracking technical debt with @TODO, @FIXME, @HACK comments, see [technical-debt.mdc](mdc:../.cursor/rules/technical-debt.mdc).
```
