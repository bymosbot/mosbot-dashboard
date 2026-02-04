---
mode: agent
tools:
  [
    'atlassian/getAccessibleAtlassianResources',
    'atlassian/getJiraIssue',
    'search/codebase',
    'edit/createFile',
  ]
description: 'Generate Tasks from User Story'
---

# Command: Plan MK7.1

**Purpose**
Create or **update** an **outcome‑oriented task list** (scaled to requirement complexity) from **any** of: a Jira ticket URL, a free‑form prompt, **or** an already‑written user story — **without executing** the tasks.

> **Hard Stop / Non‑Execution Guarantee**
>
> - This command **MUST NOT** make code changes, run builds/tests, open PRs, or call any execution/modify tools.
> - It **only** reads inputs, inspects the repository, and **updates a single task file** in `tasks/<TICKET-ID>/task.md`.
> - Downstream automations MUST NOT treat this as a green‑light to execute; they should wait for an explicit `/implement` (or equivalent) to continue.

---

## Accepted Inputs (any one)

- **Jira ticket**: ID + URL (+ optional pasted description)
- **User story**: 3–5 sentences w/ AC bullets
- **Prompt**: free‑form description of the change

> **Note**: Follow project-specific conventions defined in `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for consistent task generation.
> When a Jira or Confluence link is provided, the Atlassian MCP Server (`Atlassian-MCP-Server`) should be used to fetch the relevant information.

### Optional Inputs

- Repo/module path hint(s) (to narrow scope)
- Risk level (low/med/high) → influences task granularity and subtask usage
- Complexity indicator (simple/medium/complex/epic) → determines task budget

---

## Hard Guardrails

- **Adaptive Task Budget**: Scale task count based on requirement complexity:
  - **Simple tickets** (bug fixes, small features): **3–5 tasks**
  - **Medium tickets** (feature additions, moderate refactoring): **6–10 tasks**
  - **Complex tickets** (architecture changes, multi-component features): **10–15 tasks**
  - **Epic-level work** (major features, system overhauls): **15–20 tasks**
- **Strategic Subtask Usage**: Use subtasks when they provide clarity and organization:
  - **Simple tasks**: No subtasks needed (flat structure)
  - **Complex tasks**: Use subtasks to break down multi-step work that is parallelizable or has clear phases
  - **Guideline**: Subtasks should represent meaningful work units, not micro-steps
  - **Nesting limit**: Maximum 2 levels (task → subtask, no further nesting)
- **Outcomes not chores**: Don't create items for linting/CI/formatting; those belong to DoD/process, not the task list.
- **Traceability**: Every task references the ticket/story slug.
- **No Scope Creep**: Tasks must ONLY address requirements in the ticket/story. Do NOT create tasks for unrelated refactoring, improvements, or "while we're here" changes.

---

## Normalization Pipeline

1. **Ingest** Jira URL / story / prompt.
   - If a Jira or Confluence URL is provided, use the `Atlassian-MCP-Server` to fetch the content and details.
2. **Normalize to Story (in‑memory)**
   - Problem, Expected Outcome, Constraints (e.g., _no API/schema changes for hardening_), and 3–6 AC bullets.
3. **Repository Recon (read‑only)**
   - **First, check for existing estimate file**: If `tasks/<TICKET-ID>/estimate.md` exists, **reuse its Repository Context** to avoid duplicate reconnaissance work.
   - **If no estimate exists**, build a **candidate map** of relevant files/symbols using filename and content searches. Examples vary by stack:
     - **Web/API Projects**: `**/*{feature}*`, `**/*{domain}*`, `**/*controller*`, `**/*service*`, `**/*repository*`, `**/*model*`
     - **Infrastructure/DevOps**: `**/*{resource}*`, `**/*config*`, `**/*deploy*`, `**/*pipeline*`, `**/*.tf`, `**/*.yaml`
     - **Test Automation**: `**/*{feature}*.spec.*`, `**/*{feature}*.test.*`, `**/*page*`, `**/*steps*`
     - Strings/regex (stack-agnostic): `{functionName}`, `{className}`, `{domain}|{related}`, `retry|backoff`, `sanitize|validate`, `cache.(get|set|put)`
   - **Leverage AI Agent Rules**: Use existing rules in `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` to determine project structure and standards:
     - **Always Applied**: `project-structure.mdc` or equivalent - provides core architecture and directory structure
     - **File-Specific**: Apply relevant rules based on file extensions and project type
     - **Task-Specific**: Apply rules based on work type (e.g., API development, testing, infrastructure)
   - Record results as `Repository Context` (paths + brief reason).
   - If the repo cannot be scanned, produce **Search Plan**: concrete search queries to run.
   - **Follow project structure**: Reference `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for standard directory layouts and naming patterns.
   - **Use complexity score from estimate**: If estimate exists, use its complexity analysis to inform task granularity (simple estimates = fewer tasks, complex estimates = more detailed breakdown).
4. **Synthesize Tasks** under the task budget, **grounded in files/symbols discovered**.
5. **Concreteness Pass**: each task must include **at least one** of: file path, symbol/function/class, or config key.
6. **Write/Update Task File** (see below). **Do not execute anything.**

### Testing Framework Detection

When creating testing tasks, the command should:

1. **Use Cursor Rules or Copilot Instructions System**:
   - **Always Applied**: `project-structure.mdc` or equivalent - provides core testing architecture
   - **File-Specific**: `testing-standards.mdc` or equivalent - defines testing frameworks, directories, and patterns
   - **Task-Specific**: Apply testing rules based on work type (unit, integration, e2e)

2. **Extract Testing Information from Rules / Instructions** (examples by stack):
   - **Testing Strategy**: Unit (70%), Integration (20%), E2E (10%) distribution
   - **Test Directories**: Project-specific paths from rules (e.g., `tests/`, `spec/`, `__tests__/`, `e2e/`)
   - **Test Frameworks**: Detect from rules (e.g., Jest/Vitest, Pytest, JUnit, PHPUnit/Pest, Playwright, Cypress, Selenium)
   - **File Patterns**: Project-specific patterns from rules (e.g., `*.test.js`, `*Test.php`, `*_test.py`, `*.spec.ts`)

3. **Create Appropriate Testing Tasks Based on Project Type**:
   - **Unit Tests**: Test individual classes/functions/modules in isolation
   - **Integration Tests**: Test component interactions and data flows
   - **E2E Tests**: Test critical user journeys only (use sparingly)
   - **API Tests**: Test endpoints, contracts, and integration points
   - **Infrastructure Tests**: Test deployments, configurations, and resource provisioning (for DevOps projects)

4. **Include Testing Framework in Repository Context**:
   - Reference testing frameworks and directories from Cursor rules
   - Include testing strategy and coverage requirements

> **Quality Gates**: Ensure tasks align with project standards in `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` (testing, architecture, patterns, etc.)
> If the input already provides a good story, **do not expand** it in ways that increase task count.

---

## Output: **Update the existing task file (or create if missing)**

**Target path**:

- If ticket ID provided: `tasks/<TICKET-ID>/task.md` (e.g., `tasks/PROJ-4039/task.md`)
- If no ticket ID: `tasks/<INCREMENTAL-NUMBER>-<SLUG>/task.md` (e.g., `tasks/001-fix-facility-link-issue/task.md`)

> **Note**: For incremental numbering, use zero-padded 3-digit numbers (001, 002, etc.) and create a kebab-case slug from the task description.

### When the folder/file **exists**

- **Preserve** header metadata and any prior content.
- **Replace** the **Task List** section in place with the new flat list (≤ 8).
- **Ensure** a **Summary of Changes** section exists (see below). If missing, **append** one at the end.

### When the folder/file **does not exist**

- Create the folder structure: `tasks/<TICKET-ID>/` or `tasks/<INCREMENTAL-NUMBER>-<SLUG>/`
- Create `task.md` file with the structure below (including an empty **Summary of Changes** ready for execution to fill in).

---

## File Structure

### Header

- **Ticket**: `<{PROJECT}-{NUMBER} or slug or N/A>` (link if available)
- **Source**: `jira|story|prompt`
- **Summary**: ≤ 3 lines

### Repository Context (evidence)

- Bullet list of **matching files/symbols** and why they're relevant.
- Include technology stack and testing framework information from Cursor rules.

> If no files found, include **Search Plan** subsection with 5–10 concrete queries (glob + pattern) to run.

### Task List (adaptive structure)

Numbered checklist items. Each task:

- Describes the **outcome**
- Includes **at least one** concrete reference (file, function/class/method, config key, resource name)
- Uses numbered checkbox format: `- [ ] 1.0 <description>`
- **No ticket ID prefix** (ticket ID is already in the header)
- Subtasks use decimal notation: `- [ ] 1.1 <description>`, `- [ ] 1.2 <description>`
- Structure adapts to requirement complexity:
  - **Simple requirements**: Flat list (no subtasks)
  - **Medium requirements**: Mix of flat tasks and tasks with 2-3 subtasks where logical
  - **Complex requirements**: Organized structure with subtasks for multi-phase or parallelizable work
  - **Epic requirements**: Well-structured hierarchy with subtasks grouping related work

### **Discovered Issues** (optional)

This section tracks issues discovered during repository reconnaissance that are outside the current scope. Each issue should include:

- **Type**: Bug | DevTask | Improvement
- **Description**: Brief description of the issue
- **Location**: File path or component
- **Jira**: Link to created Jira ticket (if created) or "Not yet filed"
- **Link**: Relationship to current ticket (e.g., "Related to", "Blocks", "Blocked by")

Example:

```markdown
- **Bug** - Service missing error handling for timeout scenarios (`src/services/DataService.ext`) - Jira: [PROJ-1234](https://company.atlassian.net/browse/PROJ-1234) - Related to PROJ-4039
- **Improvement** - Client lacks connection pooling configuration (`src/clients/database.ext`) - Jira: Not yet filed - Related to PROJ-4039
```

### **Summary of Changes** (starts empty)

This section is created as a placeholder to be populated by the `/implement` command upon completion of all tasks.

---

## Decision Rules

- **Assess Requirement Complexity First**: Determine if the work is simple, medium, complex, or epic-level to set appropriate task budget and structure.
- **Group Related Work Intelligently**: Map AC clusters to concise tasks (e.g., _timeouts+retries+connection reuse_ → one **Resilience** task with subtasks if needed).
- **Testing Strategy**: Create testing tasks based on **Cursor rules** or **Copilot Instructions** in `.cursor/rules/testing-standards.mdc` or `.github/instructions/testing-standards.instructions.md` or equivalent:
  - **Unit Tests**: Test individual components in isolation (70% of tests)
  - **Integration Tests**: Test component interactions and data flows (20% of tests)
  - **E2E Tests**: Test critical user journeys only (10% of tests)
  - **API Tests**: Test endpoints and contracts (as needed)
  - **Follow Testing Pyramid**: Prioritize unit tests, minimal E2E tests
  - **Tests** can be **one consolidated task** with subtasks for different test types, or **separate tasks** for complex requirements with extensive testing needs.
- **Merge Similar Work**: If two tasks touch the **same file** with small deltas, **merge** them unless they represent distinctly different concerns.
- **Use Subtasks for Phases or Parallelizable Work**:
  - Multi-phase work (e.g., database migration: backup → schema change → data migration → verification)
  - Parallelizable work (e.g., implementing multiple API endpoints with similar patterns)
  - Complex tasks that benefit from breaking down into clear steps
- **Distinguish between meta-documentation (not a task) and deliverable documentation (a valid task).**
  - **Invalid:** A task to update the `Summary of Changes` section.
  - **Valid:** A task to update a `README.md`, Confluence page, architecture diagram, or other persistent documentation.
- Use **numbered checklist format** (`- [ ] 1.0 <description>`) for all tasks and subtasks (`- [ ] 1.1 <description>`).
- **No ticket ID prefixes** in task descriptions (ticket ID is already in the header).
- **Prevent Scope Creep**: Only create tasks that directly address the ticket/story requirements. Do NOT include:
  - Refactoring unrelated code "while we're there"
  - Improving code outside the requirement scope
  - Adding features not in the acceptance criteria
  - Fixing unrelated issues discovered during investigation

---

## Quality Gates (self‑check before writing file)

- Task budget appropriate for requirement complexity (3-5 for simple, up to 20 for epic-level).
- Task structure matches complexity (flat for simple, organized with subtasks for complex).
- Ticket/story slug present and traceable.
- Each task contains at least **one concrete reference** (file/symbol/config/resource).
- `Repository Context` present **or** `Search Plan` included.
- **Testing tasks align with Cursor rules**: Reference `.cursor/rules/testing-standards.mdc` or `.github/instructions/testing-standards.instructions.md` or equivalent for testing strategy.
- **No warning messages** in generated task files.
- **Discovered Issues section present** (empty is fine; populated if issues found during reconnaissance).
- **Summary of Changes section present** (empty is fine).
- **Numbered checklist format** used for all tasks and subtasks.
- **No ticket ID prefixes** in task descriptions.
- **No scope creep**: All tasks directly address ticket/story requirements only.

---

## Interop / Orchestration Notes

- On success, return the path of the task file.
- Downstream automations MUST NOT treat this as a green‑light to execute; they should wait for an explicit `/implement` (or equivalent) to continue.
- **Include Next Steps in AI response**: After writing the task file, provide clear next steps to the user:
  1. Review the generated task file: `tasks/<task-file>.md`
  2. Run the implement command: `/implement @<task-file>.md`

---

## Example — {PROJECT}-{NUMBER} (excerpt)

**File**: `tasks/{PROJECT}-{NUMBER}/task.md`

```md
# {PROJECT}-{NUMBER}: Harden {feature} endpoint

**Ticket**: [{PROJECT}-{NUMBER}](https://company.atlassian.net/browse/{PROJECT}-{NUMBER})
**Source**: jira
**Summary**: Improve error handling, input validation, and type safety for the `{feature}` endpoint. This involves hardening cache access patterns, adding resilience mechanisms, improving validation, and ensuring comprehensive test coverage.

---

## Repository Context

- `src/handlers/{domain}/{feature}.{ext}`: Primary handler/controller for the `{METHOD} /v1/{endpoint}` endpoint.
- `src/core/{domain}/{feature}.{ext}`: Core business logic, including cache interaction and external service integration.
- `src/types/{domain}/{feature}Type.{ext}`: Type definitions or data models for the {domain} feature.
- `src/services/{external}/client.{ext}`: Client for the external `{service}` integration.
- `tests/{domain}/{feature}.test.{ext}`: Unit tests for the core logic.
- `config/{deployment}.{ext}`: Deployment configuration for `{feature}` service.
- **Technology Stack**: Based on `.cursor/rules/project-structure.mdc` or `.github/instructions/project-structure.instructions.md` - {Language/Framework} with {Database} and {External Services}
- **Testing Framework**: Based on `.cursor/rules/testing-standards.mdc` or `.github/instructions/testing-standards.instructions.md` - {TestFramework} (unit/integration), {E2EFramework} (E2E)

---

## Task List

- [ ] 1.0 **Strengthen Input Validation and Type Safety** - In `src/core/{domain}/{feature}.{ext}`, enhance validation logic to include sanitization and more specific type checks. Review and tighten type definitions to avoid loose typing patterns.
- [ ] 2.0 **Harden Cache Interaction Layer** - In `src/core/{domain}/{feature}.{ext}`, replace generic exceptions with specific custom exceptions that preserve error context. Review cache client configuration for retry strategies with exponential backoff. Differentiate between cache miss and connection/query errors.
- [ ] 3.0 **Improve External Service Error Handling** - In `src/core/{domain}/{feature}.{ext}`, modify error handling to throw specific exceptions with proper context instead of just logging.
- [ ] 4.0 **Update and Expand Test Coverage** - In `tests/{domain}/{feature}.test.{ext}`, enable any skipped tests and add comprehensive coverage. Add test cases for error scenarios, edge cases, and integration points.

---

## Discovered Issues

<!-- empty — or list issues found during reconnaissance that are outside current scope -->

---

## Summary of Changes

<!-- empty — to be filled by the process step -->
```

---

## Technology Stack Examples

The plan adapts to different technology stacks while maintaining the same process:

### PHP/Laravel

- Files: `app/Http/Controllers/`, `app/Services/`, `tests/Unit/`, `tests/Feature/`
- Testing: PHPUnit/Pest, Laravel Dusk
- Extensions: `.php`

### React/TypeScript

- Files: `src/components/`, `src/hooks/`, `src/services/`, `__tests__/`, `e2e/`
- Testing: Jest/Vitest, React Testing Library, Playwright/Cypress
- Extensions: `.tsx`, `.ts`

### Node.js/Express

- Files: `src/routes/`, `src/controllers/`, `src/services/`, `tests/`
- Testing: Jest/Mocha, Supertest
- Extensions: `.js`, `.ts`

### Python/DevOps

- Files: `terraform/`, `ansible/`, `scripts/`, `tests/`
- Testing: Pytest, Terraform test
- Extensions: `.py`, `.tf`, `.yaml`

### Java/Selenium (QA)

- Files: `src/test/java/`, `pages/`, `steps/`, `config/`
- Testing: JUnit/TestNG, Selenium WebDriver
- Extensions: `.java`

### Serverless Framework

- Files: `functions/`, `handlers/`, `services/`, `serverless.yml`
- Testing: Jest, Serverless Offline
- Extensions: `.js`, `.ts`, `.yml`
