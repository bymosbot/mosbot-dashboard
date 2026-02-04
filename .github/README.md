# GitHub Workflow Directory

⚠️ **IMPORTANT NOTICE** ⚠️

## DO NOT MODIFY FILES IN THIS DIRECTORY

The files in this directory are managed by the `ai-coding-workflow` repository and will be automatically overwritten during the next sync operation. Any local changes you make to these files will be lost.

**EXCEPTION**: You are strongly encouraged to create a `.github/copilot-instructions.md` file in this directory to reference your project-specific rules.

If you need to modify other workflow files, please make your changes in the `ai-coding-workflow` repository instead, and they will be synchronized to this project during the next sync.

## Purpose

This directory contains GitHub workflow configurations and project-specific instructions that should be applied **before** executing any Copilot Prompts. These files help ensure consistent development practices and automated workflows.

## STRONGLY RECOMMENDED: Create copilot-instructions.md

Create a `.github/copilot-instructions.md` file that references your project-specific rules from the `.cursor/rules/` directory. This file will guide AI assistants on how to apply your project's coding standards and conventions.

### Example copilot-instructions.md

```markdown
# Project-Specific Instructions for AI Assistants

## Coding Standards

Please follow the coding standards defined in `.cursor/rules/coding-standards.md`

## Architecture Guidelines

Refer to `.cursor/rules/architecture.md` for project structure and design patterns

## Testing Requirements

Apply testing standards from `.cursor/rules/testing.md`

## Documentation Standards

Follow documentation guidelines in `.cursor/rules/documentation.md`

## Project Conventions

- Use TypeScript for all new files
- Follow the component structure defined in `.cursor/rules/components.md`
- Apply naming conventions from `.cursor/rules/naming-conventions.md`
```

## Directory Structure

### `/prompts/`

Contains Copilot prompt configurations that define how AI assistants should behave when working on this project.

### `/instructions/`

Contains project-specific instructions and guidelines for development workflows.

## Usage

When using Cursor Commands or Copilot Prompts, make sure to:

1. **Create `.github/copilot-instructions.md`** referencing your `.cursor/rules/` files
2. **Review the instructions** in the `/instructions/` directory first
3. **Apply project-specific guidelines** before running any commands
4. **Follow the established patterns** and conventions defined in these files
5. **Ensure compliance** with project standards before implementation

## Files in this directory

- `prompts/` - Copilot prompt configurations
- `instructions/` - Project-specific development instructions
- `copilot-instructions.md` - **Create this file** to reference your `.cursor/rules/` files
