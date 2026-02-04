# Command: Commit MK5

**Purpose**  
Provide consistent, traceable, and concise commits that align with the task-based workflow.

---

## When to use

- After a task from `tasks/task-<TICKET-OR-SLUG>.md` is implemented and local checks pass.
- When you have staged changes ready to commit.
- This command **does not push** or alter history (no amend/rebase). Pushing is a separate, explicit step.

---

## Commit Principles

- **Small & scoped**: Prefer 1–3 commits per task.
- **Traceable**: Subject must include the ticket/slug and **task number**.
- **Concise**: The commit body should be brief and explain the 'why' of the change, not the 'what'.
- **Conventional Commits**: Use prefixes like `feat`, `fix`, `refactor`, etc.

---

## Subject Line Templates

The `<slug>` should be the ticket ID (e.g., LOOM-4039).

```text
feat(<slug>): <short summary>
fix(<slug>): <short summary>
refactor(<slug>): <short summary>
test(<slug>): <short summary>
docs(<slug>): <short summary>
chore(<slug>): <short summary>
```

### Examples

- `feat(LOOM-4039): add input sanitization for zipcode`
- `refactor(LOOM-4039): typed DynamoDB errors; preserve cause`
- `test(LOOM-4039): add retry w/ backoff+jitter cases`

---

## Commit Body Template

```text
A brief description of the change, focusing on the "why".

- <task #n summary from task file>
```

---

## Context for Generating the Commit Message

The commit message is generated based on context from one of the following sources, in order of preference:

1. **Provided Files**: If file paths are provided to the command (e.g., a task or review file), it will search for:
   - A `## Summary of Changes` section.
   - If that does not exist, it will look for a completed Task List (usually marked with an `x`).
2. **Staged Changes**: If no files are provided, the command will refer to the staged changes for context.

This context is used to populate the `<short summary>` in the subject line and the detailed description in the commit body.

---

## Workflow

1. Implement the task and run checks locally (tests, types, lint).
2. Stage the changes (`git add <files>`).
3. **Generate** a concise commit message using the template above. The message should explain the reasoning behind the change.
4. **Commit** with the generated message.

> This command focuses solely on creating well-formatted commits.

---

## PR Template

- **Problem** — short description
- **Solution** — what changed and why
- **Scope boundaries** — what’s explicitly out-of-scope
- **Test plan** — cases and commands
- **Risk & rollback** — risks, mitigation, and how to revert
- **Links** — ticket and task file
- **Screenshots/Logs** — if applicable

---

## Safety & Idempotency

- Never push or rewrite history here. Use a separate `push` step or CI.
- Keep noisy files out of commits (lockfiles/vendor) unless the change requires them.
- If multiple tasks touch the **same code path**, consider a shared **refactor** commit first, then per-task commits.

---

## Commit Examples

### Exampl 1 - Complex changes

```bash
feat(LOOM-4039): harden zipCodeToAddress with typed errors and validation

- Strengthened DynamoDB error handling and request validation
- Added ZipCodeException for domain-specific errors
- Replaced loose types with DynamoDbMarshalledItem
- Converted test suite from JS to TS (22 passing tests)

Refs:
- tasks/task-LOOM-4039.md
- tasks/review-zipcode-cache-handoff.md
```

### Example 2 - Simple fix

```bash
fix(LOOM-4039): treat DDB cache errors distinctly from miss
```
