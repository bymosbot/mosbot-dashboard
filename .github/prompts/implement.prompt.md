---
mode: agent
tools: ['edit', 'upstash/context7/get-library-docs', 'search/codebase']
description: 'Process the generated tasks'
---

# Implement MK9

**Purpose**  
Execute tasks from `tasks/<task-id>/task.md`, `tasks/<task-id>/review.md`, or `tasks/<task-id>/security.md` safely and **record progress in the same file** — without inflating the task list.

> **Contract**
>
> - This command **implements**, **tests**, and **records** progress only.
> - It **must not** generate new tasks or restructure the list.
> - It **must not** commit changes; commits are handled separately.
> - It **must** toggle checkboxes from `- [ ]` → `- [x]` when a task (or subtask) is completed.

---

## Inputs

- `--task-file` (required): path like `tasks/<task-id>/task.md`, `tasks/<task-id>/review.md`, or `tasks/<task-id>/security.md`
- Optional filters:
  - `--only "1,3"` → operate on tasks #1 and #3
  - `--since <commit>` → include only changes after a commit when validating
  - `--path "services/address"` → restrict work to a subtree
  - `--full-test-suite` → run complete test suite instead of only related tests (use sparingly)
- Optional `--actor` (defaults to git user.name) for progress tracking

**File Type Detection**: The command automatically detects whether the input file is a `task.md` (implementation tasks), `review.md` (post-review fixes), or `security.md` (remediation tasks) based on the filename and content structure.

---

## High‑Level Flow

1. **Load task file** and **validate structure**
   - **For `task.md`**: Sections present: Header, **Repository Context** or **Search Plan**, **Task List**
   - **For `review.md`**: Sections present: Header, **Review Context**, **Findings**, **Task List**
   - **For `security.md`**: Sections present: Header, **Task List**, **Executive Summary**, and remediation context (findings, dependency health, etc.)
2. **Select targets**
   - If `--only` provided → pick those numbers.
   - Else pick the **first unchecked** task; if none, exit with success.
3. **Implement task(s)**
   - **For `task.md`**: Follow task notes and referenced files/symbols for feature implementation.
   - **For `review.md`**: Follow task notes for post-review fixes (linting, type errors, test failures).
   - **For `security.md`**: Remediate findings per task guidance, applying fixes to code/configs and preparing verification evidence.
   - Keep changes small and scoped (1–3 files per task typically).
   - **Prevent Scope Creep**: ONLY modify code required for the task. Do NOT refactor unrelated code.
4. **Run checks**
   - **Run only related tests**: Execute tests for modified/added test files and their dependencies, NOT the entire test suite. Use test execution patterns from `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md` or equivalent.
   - Type‑checks and lints on modified files only (using project-specific tools from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`).
   - For security fixes, re-run the relevant security command(s) referenced in the task (e.g., targeted `semgrep`, `npm audit`, `gitleaks`) to confirm remediation.
   - If failing, **do not** tick the task; add a short inline `— partial: <note>` and stop unless `--force`.
   - Optional `--full-test-suite` flag to run complete test suite if needed.
5. **Update task file**
   - Toggle the task line (and any subtasks) `- [ ]` → `- [x]`.
   - **Do NOT update the Summary of Changes section** during task execution.
6. **Output summary**
   - Report completed tasks and any partial progress.

---

## File Update Rules (Idempotent)

- **Preserve order and numbering**; do not reorder items when marking done.
- Subtasks (if present) are indented `- [ ]` lines using decimal notation (e.g., `1.1`, `1.2`); mark them individually.
- For **partial progress**, append `— partial: <note>` to the task line instead of adding subtasks.
- **Discovered Issues section**:
  - **For `task.md`**: Add issues found during implementation that are outside current scope. DO NOT implement them (that's scope creep).
  - **For `review.md`**: This section is read-only; do not modify discovered issues during task execution.
  - **For `security.md`**: Findings sections (`## Detailed Findings`, `## Dependency Health`, etc.) are read-only. If remediation uncovers additional concerns outside the current tasks, document them via your security ticketing process rather than editing the findings list, and coordinate a follow-up `/security` run if needed.
- **Summary of Changes section**: Only update when ALL tasks are completed. Do not document changes incrementally during task execution.

---

## Safety & Scope

- Never run destructive git ops here (`push -f`, `rebase`, `reset --hard`).
- This command **must not** commit changes; commits are handled separately.
- Respect repo ignore/exclusions during tests (e.g., lockfiles/vendor/node_modules noise).
- **Targeted Testing**: Run only tests related to modified files to avoid long-running full test suites. Use `--full-test-suite` flag only when necessary (e.g., before final PR).
- **Test execution patterns**: Reference `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md` or equivalent for project-specific test runner commands and patterns.
- **Prevent Scope Creep**: ONLY modify files/code required for the current task. Examples of scope creep to avoid:
  - Refactoring unrelated functions "while we're there"
  - Fixing unrelated issues discovered in the same file
  - Improving code style in code not touched by the task
  - Adding features not in the task requirements
  - Modifying components/modules/services not referenced in the task

## Handling Discovered Issues

### For `task.md` Files

When you discover issues during implementation that are **outside the current task scope**, do NOT fix them (that's scope creep). Instead:

1. **Document in Discovered Issues section** of the task file with:
   - **Type**: Bug | DevTask | Improvement
   - **Description**: Clear description of the issue
   - **Location**: File path or component
   - **Jira**: Create a Jira ticket using `Atlassian-MCP-Server` and link to original ticket, OR mark as "Not yet filed"
   - **Link**: Relationship to current ticket (e.g., "Related to", "Blocks")

2. **When to create Jira tickets**:
   - **Critical/High severity issues**: Create immediately and link to current ticket
   - **Medium severity issues**: Create if blocking or high impact; otherwise mark "Not yet filed"
   - **Low severity issues**: Document only; no Jira ticket needed unless requested

3. **Example**:

   ```markdown
   ## Discovered Issues

   - **Bug** - Service missing retry logic for rate limit errors (`src/services/DataService.ext`) - Jira: [PROJ-5678](https://company.atlassian.net/browse/PROJ-5678) - Blocks PROJ-4039
   - **Improvement** - Database client config lacks timeout settings (`src/config/database.ext`) - Jira: Not yet filed - Related to PROJ-4039
   ```

### For `review.md` Files

The **Discovered Issues section** in `review.md` files is **read-only** during task execution. These issues have already been identified during the code review process and should NOT be modified. Focus only on implementing the tasks in the **Task List** section.

---

## Suggested Git Snippets

### Detect staged vs working changes

```bash
if git diff --cached --quiet; then
  echo "No staged changes";
else
  echo "Staged changes present";
fi
```

---

## Review & QA Checklist (per task)

Apply project-specific quality standards from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`:

- **Scope Discipline**: Changes ONLY touch code required for the task; no unrelated refactoring or improvements.
- **Type Safety**: Strong typing at boundaries; avoid loose typing patterns (language-dependent).
- **Input Validation**: Validate at edges; reject invalid states early.
- **Resilience**: Timeouts; backoff+jitter; connection reuse; idempotent operations.
- **Error Handling**: Appropriate exception/error patterns for the language; preserve error context; structured logs; no PII.
- **Caching**: Clear key schema; distinguish miss vs error (if applicable).
- **Observability**: Correlation IDs; avoid high‑cardinality noise.
- **Tests**: Happy path + error paths; deterministic; isolated (following testing standards in `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`).

### Technology Stack Specific Considerations

**PHP/Laravel**:

- Type hints on method parameters and return types
- FormRequest validation for input
- Laravel exceptions with proper HTTP codes
- Cache facade usage patterns

**TypeScript/JavaScript**:

- Strict TypeScript types, no `any/unknown` in public interfaces
- Input validation libraries (Zod, Yup, etc.)
- Proper Promise handling and async/await patterns
- Jest/Vitest test patterns

**Python**:

- Type hints using `typing` module
- Pydantic for validation
- Proper exception handling with custom exceptions
- Pytest patterns with fixtures

**Java**:

- Strong typing with generics
- Bean validation annotations
- Try-catch with specific exception types
- JUnit/TestNG patterns

---

## Example Workflows

### For `task.md` Files (Feature Implementation)

1. `implement --task-file tasks/<task-id>/task.md --only 3`
2. Implement feature hardening per task references and project standards.
3. Run related tests/type checks/lints on modified files only.
4. In task file: tick task #3 to `[x]`.
5. Repeat for next unchecked task.

**Example with related test execution**:

```bash
# Modified files: src/services/DataService.ext, tests/services/DataService.test.ext
# Run only: tests/services/DataService.test.ext (NOT entire test suite)
```

### For `review.md` Files (Post-Review Fixes)

1. `implement --task-file tasks/<task-id>/review.md --only 1`
2. Fix linting violations per project standards.
3. Run related tests/type checks/lints to verify fixes.
4. In review file: tick task #1 to `[x]`.
5. Repeat for next unchecked task.

### For `security.md` Files (Security Remediation)

1. `implement --task-file tasks/<task-id>/security.md --only 1`
2. Apply the remediation described in the selected task (e.g., dependency upgrade, config hardening, secret rotation).
3. Re-run the referenced security check (e.g., `npm audit`, `semgrep`, `gitleaks`) or targeted tests to confirm the issue is resolved.
4. Attach `— partial: <note>` if remediation cannot be completed without additional approvals and document escalation steps.
5. Mark the task as `[x]` once verification passes, then proceed to the next unchecked item.

---

## Output

A concise markdown summary:

- **Updated**: task numbers ticked, any partial notes
- **Changes**: files modified, key changes made (only when all tasks complete)
- **Next**: next unchecked task # (or "all complete")
- **Next Steps**: When all tasks are complete, inform user to review code changes and run `/review` for comprehensive code review

### Required Next Steps Section

When ALL tasks are completed, the output MUST include a "Next Steps" section with the following format (adapt commands to project type):

```markdown
## Next Steps

🎯 **Ready for Review & Testing**

1. **Code Review**: Run `/review` for comprehensive code review and quality assurance
2. **Manual Testing**: Test the implemented features in your development environment
3. **Related Tests**: Run tests for modified components to verify changes
4. **Full Test Suite**: Run complete test suite before final PR submission
5. **Integration Testing**: Verify the changes work correctly with existing features
6. **Performance Testing**: Verify performance improvements (if applicable)

**Commands to run (adapt to your project):**

_Related tests only (fast, for iterative development):_

- `npm test path/to/modified.test.js` / `pytest path/to/test_modified.py` / `php artisan test path/to/ModifiedTest.php`
- `npm run lint path/to/modified.js` / `pylint path/to/modified.py` / `phpcs path/to/modified.php`

_Full suite (slower, before PR):_

- `npm test` / `pytest` / `php artisan test` / `mvn test` - Run all tests
- `npm run test:e2e` / `pytest tests/e2e` / `php artisan test --filter=Feature` - Run integration/E2E tests
- `npm run test:coverage` / `pytest --cov` / `php artisan test --coverage` - Check test coverage
```

This section is MANDATORY when all tasks are complete and should be prominently displayed in the final output.

## Summary of Changes Documentation

The **Summary of Changes** section should only be populated when ALL tasks in the Task List are completed (`[x]`). This section serves as a comprehensive summary suitable for a commit message or pull request description. It should follow this structure:

- **Title**: The section must be titled `## Summary of Changes`.
- **High-Level Summary**: Start with a concise paragraph that describes the overall impact and purpose of the changes.
- **Key Improvements**:
  - Use a `### Key Improvements` subsection.
  - Detail the major enhancements in a bulleted list (e.g., validation, error handling, performance).
- **File Changes**:
  - Use a `### File Changes` subsection.
  - Categorize changes into `Created`, `Modified`, and `Deleted` files, listing each file with a brief note on the changes.
- **Tense**: Write in the past tense, as a summary of completed work.
- **Execution**: Do NOT update this section incrementally during individual task execution.

### File Type Specific Behavior

- **For `task.md`**: Update the Summary of Changes section when all implementation tasks are complete.
- **For `review.md`**: The Summary of Changes section is typically read-only as it documents the original implementation. Focus on completing the post-review fix tasks.

---

## Project-Specific Tool Detection

The implement command should automatically detect and use the appropriate tools based on `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`:

- **Testing**: Reference `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md` or equivalent for test frameworks, test runner commands, and execution patterns
- **Linting/Formatting**: Reference `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for project-specific linters and formatters
- **Type Checking**: Reference `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for type checking tools and configuration
- **Build/Deploy**: Reference `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for build commands and verification steps

The command should use these rules to determine which tools to run and how to run them for the current project.
