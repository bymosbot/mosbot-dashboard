---
mode: agent
tools: ['runCommands', 'runTests', 'changes', 'edit']
description: 'Do a code review to the changes made'
---

# Code Review MK8

**Purpose:**
Run a fast, high‑signal code review even when the prompt doesn't specify _what_ to review. This command **auto‑selects the review scope** and applies consistent quality gates without inflating tasks. Includes **intelligent SQL analysis** that automatically activates when database-related changes are detected.

---

## Default _Review Target_ Selection (no input provided)

1. **If staged changes exist** → review the **staged diff**.
   - Detect: `git diff --cached --name-only` (alias: `git diff --staged --name-only`)
   - Target: `git diff --cached`

2. **Else stage the working tree** (safe default) → review the now‑staged diff.
   - Stage: `git add .`
   - Target: `git diff --cached`
   - _Note_: This stages changes for review but **does not commit**. Revert with `git reset` if needed.

3. **Else (nothing changed locally)** → review **recent changes** on the current branch.
   - Primary target: the **latest non‑merge commit** → `git show --name-only --pretty=fuller HEAD`
   - If the last commit touches >500 LOC or >30 files, expand to **the last 3 commits**: `git log -n 3 --name-only --pretty=fuller` and aggregate the diff across `HEAD~3..HEAD`.
   - If the repo is new/quiet, fall back to the **most recent commit that changed application code** (exclude lockfiles/vendor):

     ```bash
     git log --name-only --pretty=format: -- '**/*.{ext}' ':(exclude)*lock*' ':(exclude)vendor/**' ':(exclude)node_modules/**' -n 1
     ```

> **Optional path hints**: If the prompt includes a path/module (e.g. `src/services/auth`), filter the chosen target to that subtree: `git diff --cached -- src/services/auth` or `git show -- src/services/auth`.

---

## SQL Analysis Detection (intelligent triggering)

**SQL Analysis Capability:**
When database changes are detected, operates as an expert in SQL optimization, ORM translation, and relational schema analysis across PHP (Eloquent), Go (sqlc), JavaScript/TypeScript (Drizzle/Prisma), Python (Django ORM/SQLAlchemy), Java (Hibernate), C# (Entity Framework), and similar stacks. Automatically skips SQL analysis for pure frontend changes (CSS, UI components, static assets).

The review command automatically determines whether to perform SQL analysis based on the files changed in the review target.

### Triggers SQL Analysis When Changes Include

- **Repository/Model Files**: ORM models, ActiveRecord, Eloquent models, Entity classes
- **Migration Files**: Database schema migrations (e.g., `*_create_*.php`, `*.up.sql`, migration directories)
- **Raw SQL Files**: `.sql` files, query definitions, stored procedures
- **Database Service/Utility Files**: Files with database query builders, repositories, DAOs
- **Schema Definitions**: Prisma schema, TypeORM entities, Drizzle schema, SQLAlchemy models
- **Common Patterns**: Files containing database-related keywords in imports or code
  - PHP: `DB::`, `Eloquent`, `QueryBuilder`, `Model::`, `->where(`, `->join(`
  - JavaScript/TypeScript: `prisma`, `drizzle`, `typeorm`, `sequelize`, `.findMany(`, `.where(`
  - Python: `django.db`, `sqlalchemy`, `.filter(`, `.query(`, `Session()`
  - Go: `sqlc`, `database/sql`, `gorm`, `db.Query`, `db.Exec`
  - Java: `@Entity`, `JpaRepository`, `EntityManager`, `JDBC`
  - C#: `DbContext`, `Entity Framework`, `IQueryable`, `LINQ`

### Skips SQL Analysis When Changes Are Only

- **Frontend Assets**: CSS, SCSS, LESS, styling files
- **UI Components**: React/Vue/Angular components without data fetching logic
- **HTML Templates**: Pure presentation templates without database queries
- **Static Assets**: Images, fonts, icons, media files
- **Documentation**: Markdown, text files, comments-only changes
- **Build Configuration**: Webpack, Vite, Rollup, build tool configs (unless database config)
- **Test Fixtures**: Mock data, fixtures without actual query code
- **Localization Files**: i18n/l10n translation files

### Edge Cases (Analyzed)

- **API Controllers/Routes**: May contain query logic → analyze
- **GraphQL Resolvers**: Often contain database queries → analyze
- **Background Jobs**: Frequently perform database operations → analyze
- **Configuration Files**: If they configure database connections, timeouts, or pooling → analyze
- **Test Files**: If they test repository/query logic or migrations → analyze

> **Implementation Note**: The AI should examine changed file paths and content to intelligently determine if SQL analysis is warranted. When in doubt, prefer running the analysis over skipping it.

---

## Exclusions (to reduce noise)

Use `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` to determine project-specific exclusion patterns. Common patterns include:

- Lockfiles & vendored code
- Build artifacts and compiled output
- Large/binary assets (review metadata only)

Use pathspecs to exclude during diff/show, e.g.:
`git diff --cached -- . ':(exclude)*lock*' ':(exclude)vendor/**'`

---

## Automated Checks

Before the manual review, the command will perform the following automated checks and fixes on the review target.

1. **Linting & Formatting**:
   - Runs project-specific linting and formatting commands from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`
   - Auto-fixes issues where possible
   - Any remaining errors will be included in the findings.

2. **Type Checking**:
   - Runs type checking commands based on project technology stack (from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`)
   - Any type errors will be included in the findings.

3. **Test Suite**:
   - Runs the project test suite based on `.cursor/rules/testing-standards.mdc` or `.github/instructions/testing-standards.instructions.md` or equivalent
   - Runs unit tests, integration tests, and E2E tests as available
   - Any failing tests will be included in the findings.

4. **SQL Analysis** (conditional):
   - **Only runs if changes affect database interactions**
   - Detects SQL-related changes by identifying:
     - Repository/model files (ORM code)
     - Migration files
     - Raw SQL queries or utilities
     - Database service layers
     - Schema definitions
   - **Skips automatically for**:
     - Pure frontend changes (CSS, HTML templates, UI components)
     - Documentation-only updates
     - Configuration-only changes without database config
     - Asset/media files
   - When triggered, performs:
     - Extraction of effective SQL queries from ORM code
     - Translation of ORM builder chains to explicit SQL
     - Query optimization analysis (indexes, N+1, SELECT \*, full scans)
     - Security review (SQL injection risks, parameter binding)
     - Performance risk assessment (unbounded queries, missing indexes, expensive joins)
   - Any SQL findings will be included in a dedicated SQL Analysis section.

5. **Security Scan** (`@security.md`):
   - **MANDATORY**: Execute the security scan for ALL code reviews
   - **Execution Method**: After completing linting, type checking, and tests, explicitly invoke the security command by reading and executing the instructions from `.cursor/commands/security.md`
   - **Trigger Conditions** (always scan, but prioritize when changes include):
     - Authentication/authorization logic
     - API endpoints and handlers
     - Input validation or user data handling
     - Database queries or data access
     - Environment configuration or secrets management
     - External service integrations
     - Infrastructure as Code (serverless.yml, CloudFormation, Terraform)
     - Dependency changes (package.json, requirements.txt, go.mod, etc.)
     - When risk level is uncertain, default to running the scan
   - **Scan Execution**:
     1. Identify changed files in the review target (staged diff, recent commits)
     2. Determine appropriate security tooling based on project language profile (from `.cursor/rules/`)
     3. Execute security tools in this order:
        - **Dependency Audit**: `npm audit --json` / `yarn audit` / language-specific tool
        - **Secret Scanning**: `gitleaks detect --source .` / `trufflehog filesystem .`
        - **SAST**: `semgrep --config auto` / language-specific static analyzer
        - **Additional checks** as defined in `security.md` based on change type
     4. Collect results into `tasks/<TICKET-ID>/security/` directory:
        - `results.json` - aggregated findings in JSON format
        - `results.sarif` - SARIF format for CI/CD integration
        - `scan.log` - detailed scan execution log
     5. Parse results and classify severity (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)
     6. Create or update `tasks/<TICKET-ID>/security.md` with findings following the format specified in `security.md`
   - **Integration with Review**:
     - Include security scan results in the review findings under "Automated Checks" → "Security Scan"
     - Reference detailed security findings from `tasks/<TICKET-ID>/security.md`
     - Elevate Critical/High security findings to the main findings section with appropriate severity markers
     - Update overall risk assessment to reflect security findings
   - **Failure Handling**:
     - If Critical security issues are found, mark review as **BLOCKED** until resolved
     - Document all findings in the review task list with priority ordering (Critical → High → Medium → Low)
     - If security tools are not installed or fail to execute, document as ⚠️ Warning and perform manual security review
   - **Skip Conditions** (document as "Skipped - Reason"):
     - Documentation-only changes (markdown, comments, README)
     - Asset-only changes (images, fonts, media files)
     - Build configuration changes that don't affect security posture
     - When `--no-security` flag is explicitly provided (not recommended)

Only after these checks pass (or their failures are documented) will the deeper review proceed.

---

## Quick Gates (must pass before deep review)

- **Task budget respected**: If reviewing changes linked to a task file, ensure adaptive task count is appropriate for complexity.
- **No Scope Creep**: Changes ONLY address ticket/task requirements; no unrelated refactoring or improvements.
- **Automated checks pass**: Linter, type-checker, and tests must pass. Failures will be documented in the review findings.
- **No PII in logs**: Structured logging only.
- **Follow project standards**: Ensure code adheres to conventions defined in `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`
- **Task file integration**: If changes are made during review, update the task file Changes section

---

## Review Checklist

### Core Code Quality

Apply project-specific quality standards from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`:

- **Scope Discipline**: Changes ONLY address requirements; no unrelated refactoring, "while we're here" improvements, or features not in acceptance criteria.
- **Technical Debt Comments**: All technical debt comments (`@TODO`, `@FIXME`, `@HACK`, or project-specific markers) MUST follow project conventions from `.cursor/rules/technical-debt.mdc` or `.github/instructions/technical-debt.instructions.md` or equivalent.
- **Type Safety**: Strong typing at boundaries; avoid loose typing patterns (adapt to language from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`)
- **Validation**: Inputs constrained at edges; invalid states unrepresentable.
- **Resilience**: Timeouts; retries with backoff + jitter; connection reuse; idempotency.
- **Error handling**: Appropriate exception/error patterns for the language; preserve error context; user‑safe messages; operational detail in logs only.
- **Caching**: Clear key schema; miss vs error distinguished; secrets never logged.
- **Observability**: Structured logs; correlation IDs; avoid high‑cardinality spam.
- **Tests**: Happy path + edge/error cases; deterministic; isolated (following `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`).
- **Project Standards**: Follow project-specific patterns from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`

### SQL & Database Quality (when applicable)

Apply these checks only when changes affect database interactions:

- **Query Optimization**: Appropriate indexes exist; avoid SELECT \*; use pagination for large result sets; leverage database capabilities (window functions, CTEs, etc.).
- **N+1 Prevention**: Eager loading configured; batch queries used; relationship loading optimized.
- **SQL Injection Protection**: Parameterized queries only; no string concatenation for user input; ORM query builders used correctly.
- **Transaction Boundaries**: Appropriate use of transactions; avoid long-running transactions; proper isolation levels.
- **Schema Evolution**: Migrations are reversible; no breaking changes without migration path; indexes added before data grows.
- **Connection Management**: Connection pooling configured; timeouts set; proper cleanup in error paths.
- **Query Performance**: Queries tested with production-scale data; EXPLAIN plans reviewed for complex queries; full table scans identified and justified.
- **Data Integrity**: Foreign key constraints used appropriately; NULL handling explicit; cascade behaviors intentional.

### Deployment Risk Analysis

> **Adaptive Depth**: Validate against deployment risk patterns defined in `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`. If no specific rules exist, apply these generic best practices.

#### 1. **Mutable State & Shared References**

Check for shared state issues based on project architecture (from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`):

- [ ] Are cached objects cloned before return (prevents downstream mutations)?
- [ ] Are module-level/class-level collections properly isolated?
- [ ] Are configuration objects immutable or returned as copies?
- [ ] Could shared state leak data between requests/invocations/sessions?

**Project Rule**: Check `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for state management patterns

#### 2. **Configuration & Environment Parsing**

Check for configuration parsing that could fail silently:

- [ ] Do numeric parsing calls have fallback values for invalid input?
- [ ] Are required configs validated at startup (fail-fast)?
- [ ] Are config values range-checked (min/max bounds where applicable)?
- [ ] Could invalid values propagate through the system?

**Project Rule**: Check `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for configuration parsing standards

#### 3. **Retry Logic Completeness**

Check for retry implementations that miss transient failure classes:

- [ ] Are transient errors retried (timeouts, rate limits, service unavailable)?
- [ ] Are network errors retried appropriately?
- [ ] Is there exponential backoff with jitter (prevents thundering herd)?
- [ ] Is retry behavior configurable?
- [ ] Are retry attempts logged for observability?

**Project Rule**: Check `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for retry/resilience patterns

#### 4. **Infrastructure Coordination**

Check for infrastructure changes that require coordinated updates:

- [ ] If timeouts change, are dependent timeouts updated?
- [ ] Are new environment variables documented and added to all environments?
- [ ] Do capacity changes consider downstream limits?
- [ ] Are queuing/messaging policies aligned with retry counts?

**Project Rule**: Check `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` for infrastructure coordination requirements

#### 5. **Performance Impact**

Check for changes that could degrade performance:

- [ ] Could added operations increase latency significantly?
- [ ] Do new data structures fit within memory limits?
- [ ] Could new operations consume significant CPU?
- [ ] Could initialization slow startup time?
- [ ] Does caching overhead justify the benefit?

#### 6. **Business Logic Impact**

Check for changes to core algorithms, data flow, or integration points:

- [ ] Do modified algorithms preserve correctness for edge cases?
- [ ] Are data transformations reversible/debuggable?
- [ ] Do modified integrations handle all error cases?
- [ ] Can old and new code versions coexist during gradual deployment?

#### 7. **Operational Readiness**

Check for changes that impact monitoring, debugging, or incident response:

- [ ] Are important operations logged appropriately?
- [ ] Are key metrics instrumented for dashboards/alarms?
- [ ] Do error messages include enough context to trace issues?
- [ ] Can changes be rolled back quickly?
- [ ] Are operational runbooks updated for new failure modes?

---

If any category fails, request targeted changes in that area rather than adding new tasks/subtasks.

---

## Risk Severity Classification

Use this rubric to classify findings:

### Critical (🔴)

- Security vulnerabilities (injection, XSS, credential leaks, etc.)
- **SQL Injection Risks**: Unparameterized queries, string concatenation with user input
- Breaking changes without versioning or migration path
- **Irreversible Migrations**: Schema changes without rollback path
- Performance regressions >20% or complete failures
- **Unbounded Queries**: Missing pagination or limits on large datasets
- Memory leaks or resource exhaustion risks
- Data corruption risks (race conditions, mutable shared state)
- **Data Loss Risks**: Cascade deletes without proper safeguards, missing transactions
- Missing error handling in critical paths

### High (🟠)

- **Scope Creep**: Modifying unrelated code not required for the task
- **Orphaned Technical Debt**: Technical debt comments without proper references (format per `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`)
- **N+1 Query Problems**: Unoptimized relationship loading causing query multiplication
- **Missing Indexes**: Queries on unindexed columns with production-scale data
- **Full Table Scans**: Queries without proper WHERE clauses or indexes
- Complex code without tests
- High coupling between modules
- Missing input validation on external boundaries
- Inadequate error handling
- Test coverage below project threshold (check `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`)
- Incomplete retry logic
- Mutable cached objects without protection
- Infrastructure misalignment
- **Long-Running Transactions**: Transactions holding locks for extended periods

### Medium (🟡)

- Code style violations (per `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/`)
- **SELECT \* Usage**: Fetching unnecessary columns instead of explicit selection
- **Suboptimal Query Structure**: Could leverage database features (CTEs, window functions)
- **Missing Connection Pooling**: Creating connections without reuse
- Minor complexity increases
- Missing documentation for public APIs
- Inconsistent naming conventions
- Test coverage below recommended threshold
- Configuration parsing without fallbacks
- Performance overhead (minor)

### Low (🟢)

- Cosmetic changes
- Well-tested simple modifications
- **Well-Optimized Queries**: Properly indexed, parameterized, and tested queries
- Documentation improvements
- Code style improvements
- Test coverage above recommended threshold

---

## Output Format

Instead of printing to chat, this command **creates a new task file** to track remediation work.

**Target path**:

- If ticket ID provided: `tasks/<TICKET-ID>/review.md` (e.g., `tasks/PROJ-4039/review.md`)
- If no ticket ID: `tasks/<INCREMENTAL-NUMBER>-<SLUG>/review.md` (e.g., `tasks/001-fix-facility-link-issue/review.md`)

> **Note**: For incremental numbering, use zero-padded 3-digit numbers (001, 002, etc.) and create a kebab-case slug from the review summary.

### When the folder/file **exists**

- **Preserve** header metadata and any prior content.
- **Replace** the **Findings** and **Task List** sections in place with the new review findings.
- **Ensure** a **Summary of Changes** section exists (see below). If missing, **append** one at the end.

### When the folder/file **does not exist**

- Create the folder structure: `tasks/<TICKET-ID>/` or `tasks/<INCREMENTAL-NUMBER>-<SLUG>/`
- Create `review.md` file with the structure below (including an empty **Summary of Changes** ready for execution to fill in).

The generated file will contain the review findings and a pre-populated task list for fixes, ready to be used with the `/implement` command.

### Generated Task File Structure

````markdown
# Code Review: <Summary Title>

**Summary**: <2–4 bullet overview of risk & confidence.>

---

## Review Context

- **Review Target**: `<staged | staged-after-add | recent-commit(s)>`
- **Scope**: <files, LOC, commit(s)>
- **Risk Level**: <Critical | High | Medium | Low>
- **Technology Stack**: <detected from .cursor/rules/>
- **SQL Analysis**: <Performed | Skipped - reason>
- **Database Stack**: <ORM/database info if SQL analysis performed, e.g., "Laravel Eloquent (MySQL)", "TypeORM (PostgreSQL)", "sqlc (Go)", "N/A" if skipped>

---

## Findings

### Automated Checks

- Linting: <pass/fail summary>
- Type Checking: <pass/fail summary>
- Unit Tests: <pass/fail summary>
- Integration Tests: <pass/fail summary>
- E2E Tests: <pass/fail summary>
- SQL Analysis: <skipped/pass/issues found - only present if database changes detected>
- Security Scan: <✅ Pass (see tasks/<TICKET-ID>/security.md) | ⚠️ Issues Found (Critical: n, High: n, Medium: n, Low: n) | ⚠️ Skipped - <reason> | ❌ Failed to execute - <reason>>

### Core Code Quality

- Scope Discipline — <findings: Are changes focused on requirements only? Any scope creep?>
- Technical Debt Comments — <findings: Follow project format from .cursor/rules/technical-debt.mdc?>
- Type Safety — <findings>
- Validation — <findings>
- Resilience — <findings>
- Error handling — <findings>
- Caching — <findings>
- Observability — <findings>
- Tests — <findings>
- Project Standards — <findings: Adherence to .cursor/rules/ conventions>

### SQL & Database Quality (when applicable)

> **Note**: This section only appears when changes affect database interactions (repositories, models, migrations, queries, schema).

- Query Optimization — <findings: indexes, SELECT \*, pagination, query efficiency>
- N+1 Prevention — <findings: eager loading, batch queries, relationship optimization>
- SQL Injection Protection — <findings: parameterized queries, safe query building>
- Transaction Boundaries — <findings: appropriate tx usage, isolation levels>
- Schema Evolution — <findings: migration safety, reversibility, breaking changes>
- Connection Management — <findings: pooling, timeouts, cleanup>
- Query Performance — <findings: production-scale testing, EXPLAIN plans, table scans>
- Data Integrity — <findings: constraints, NULL handling, cascade behaviors>

#### Analyzed Queries

> **Note**: This subsection only appears when SQL analysis was performed.

| Query Location          | Generated SQL | Is Optimized | Risk Level | Notes                      |
| ----------------------- | ------------- | ------------ | ---------- | -------------------------- |
| `path/to/file.ext:line` | `SELECT ...`  | Yes/No       | 🟢🟡🟠🔴   | Brief issue summary or `-` |

**Query Details**:

1. **Query in `path/to/file.ext:line`**
   - **Context**: <what this query does, when it's called>
   - **ORM Code**: <original ORM/query builder code if applicable>
   - **Generated SQL**:
     ```sql
     SELECT ...
     ```
   - **Issues**: <list of specific issues or "None detected">
   - **Recommendations**: <specific actionable improvements>
   - **Risk Level**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

### Deployment Risk Analysis

#### 1. Mutable State & Shared References

- <findings with severity: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low>

#### 2. Configuration & Environment Parsing

- <findings with severity>

#### 3. Retry Logic Completeness

- <findings with severity>

#### 4. Infrastructure Coordination

- <findings with severity>

#### 5. Performance Impact

- <findings with severity>

#### 6. Business Logic Impact

- <findings with severity>

#### 7. Operational Readiness

- <findings with severity>

### Inline Issues

- `path/to/file.ext:42` — 🟠 HIGH: <issue description with context>
- `path/to/file.ext:88` — 🟡 MEDIUM: <issue description with context>

---

## Risk Severity Breakdown

- **🔴 Critical Risks**: <count> (<list titles if any>)
- **🟠 High Risks**: <count> (<list titles if any>)
- **🟡 Medium Risks**: <count> (<list titles if any>)
- **🟢 Low Risks**: <count> (<list titles if any>)

**Overall Risk Assessment**: <Critical | High | Medium | Low>

---

## Deployment Impact

### Breaking Changes

- API Changes: <Yes/No - details>
- Schema Changes: <Yes/No - details>
- Configuration Changes: <Yes/No - details>
- Dependency Changes: <Yes/No - details>

### Performance Impact

- Response Time: <increase/decrease/neutral>
- Memory Usage: <increase/decrease/neutral>
- CPU Impact: <increase/decrease/neutral>
- Database Load: <increase/decrease/neutral - if SQL changes present>
- Query Performance: <improved/degraded/neutral - if SQL changes present>

### Database Migration Impact (if applicable)

- Migration Required: <Yes/No>
- Migration Reversible: <Yes/No - details>
- Downtime Required: <Yes/No - estimated duration>
- Data Volume Impact: <small/medium/large dataset affected>
- Index Creation Time: <estimated if new indexes added>

### Rollback Complexity

- Strategy: <simple revert | config toggle | complex migration | requires data migration>
- Estimated Time: <time estimate>
- Database Rollback: <automatic via migration rollback | manual intervention | data loss risk>

---

## Recommendations

### Pre-Deployment

1. <action if needed>

### Pre-Deployment (Database-Specific - if applicable)

1. **Migration Testing**: Test migration on staging with production-scale data
2. **Query Performance**: Run EXPLAIN ANALYZE on modified queries with realistic data volumes
3. **Index Creation**: Schedule index creation during low-traffic periods if adding indexes to large tables
4. **Rollback Plan**: Verify migration rollback works correctly
5. **Connection Pool**: Verify connection pool settings can handle new query patterns

### Post-Deployment Monitoring

1. <metrics to watch if applicable>

### Post-Deployment Monitoring (Database-Specific - if applicable)

1. **Query Performance**: Monitor slow query logs for new or modified queries
2. **Database Load**: Watch CPU, memory, and disk I/O metrics
3. **Connection Pool**: Monitor connection pool exhaustion or saturation
4. **Query Errors**: Track query timeouts and deadlocks
5. **Index Usage**: Verify new indexes are being utilized (check query plans)

### Contingency Plans

1. <if X happens, do Y - if applicable>

### Contingency Plans (Database-Specific - if applicable)

1. **Query Timeout**: If new queries timeout, enable query-level timeout overrides
2. **Lock Contention**: If deadlocks increase, adjust isolation levels or transaction scope
3. **Performance Degradation**: If response times degrade >20%, consider adding indexes or query optimization
4. **Migration Failure**: If migration fails mid-execution, have manual rollback steps documented

---

## Testing & Validation

### Required Testing Commands

After implementing fixes, run tests based on `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md` or equivalent:

#### Test Execution Strategy

Reference `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md` for:

- Test frameworks used in the project
- Test execution commands
- Test categories (unit, integration, E2E)
- Coverage requirements
- Test directory structure

#### Example Test Commands (adapt to your project)

```bash
# Unit Tests
<command from .cursor/rules/ or .github/copilot-instructions.md or .github/instructions/>

# Integration Tests
<command from .cursor/rules/ or .github/copilot-instructions.md or .github/instructions/>

# E2E Tests
<command from .cursor/rules/ or .github/copilot-instructions.md or .github/instructions/>

# Full Test Suite
<command from .cursor/rules/ or .github/copilot-instructions.md or .github/instructions/>

# Coverage Analysis
<command from .cursor/rules/ or .github/copilot-instructions.md or .github/instructions/>
```
````

### Test Categories

Reference `.cursor/rules/testing-standards.mdc` or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md` for project-specific test categories and their purposes.

### Test Reports

- **Test Results**: Human-readable test results
- **Coverage Report**: Code coverage analysis
- **Test Artifacts**: Screenshots, logs, or other test outputs as applicable

---

## Task List

- [ ] 1.0 Fix critical risks (🔴) - if any
- [ ] 2.0 Fix high risks (🟠) - if any
- [ ] 3.0 Address medium risks (🟡) - if any
- [ ] 4.0 Re-run tests and type checks to confirm fixes
  - [ ] 4.1 Run unit tests (refer to .cursor/rules/testing-standards.mdc or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`)
  - [ ] 4.2 Run integration tests (refer to .cursor/rules/testing-standards.mdc or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`)
  - [ ] 4.3 Run E2E tests (refer to .cursor/rules/testing-standards.mdc or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`)
  - [ ] 4.4 Run full test suite (refer to .cursor/rules/testing-standards.mdc or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`)
  - [ ] 4.5 Check test coverage (refer to .cursor/rules/testing-standards.mdc or `.github/copilot-instructions.md` or `.github/instructions/testing-standards.instructions.md`)

---

## Discovered Issues

This section tracks issues discovered during code review that are outside the current scope and should NOT be fixed in this PR (to avoid scope creep).

**Format**: Each issue should include:

- **Type**: Bug | DevTask | Improvement
- **Severity**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- **Description**: Clear description of the issue
- **Location**: File path and line number (if applicable)
- **Jira**: Link to created Jira ticket (if created) or "Not yet filed"
- **Link**: Relationship to current ticket (e.g., "Related to", "Blocks")

**When to create Jira tickets**:

- **Critical/High severity**: Create immediately using `Atlassian-MCP-Server` and link to current ticket
- **Medium severity**: Create if blocking or high impact; otherwise mark "Not yet filed"
- **Low severity**: Document only; no Jira ticket needed unless requested

**Example**:

```markdown
- **Bug** (🔴 Critical) - Security vulnerability in input handling (`src/handlers/search.ext:45`) - Jira: [PROJ-9999](https://company.atlassian.net/browse/PROJ-9999) - Blocks current deployment
- **Improvement** (🟡 Medium) - Missing documentation for public API (`src/services/DataService.ext:120`) - Jira: Not yet filed - Related to current ticket
```

---

## Summary of Changes

<!-- empty — to be filled by the process step -->

---

## Task File Integration

This command's primary output is the creation of a `tasks/<TICKET-ID>/review.md` or `tasks/<INCREMENTAL-NUMBER>-<SLUG>/review.md` file. It **does not modify** any existing task files or their `Summary of Changes` sections. The generated task file is designed to be processed by `/implement`, which will then handle the changes documentation upon completion.

### Handling Scope Creep Issues

When the code review discovers issues that are **outside the scope** of the changes being reviewed:

1. **Do NOT add them to the Task List** (that would be scope creep)
2. **Add them to the Discovered Issues section** instead
3. **Create Jira tickets** for Critical/High severity issues using `Atlassian-MCP-Server`
4. **Link the new Jira tickets** to the original ticket with appropriate relationship (Related to, Blocks, etc.)
5. **Document** Medium/Low severity issues without creating tickets unless requested

This approach ensures:

- The review stays focused on the changes at hand
- Important issues are not lost or forgotten
- Future work is properly tracked in Jira
- Scope creep is prevented while maintaining visibility of technical debt

---

## Quality Gates (self-check before writing file)

Before writing the review task file, ensure:

- [ ] All automated checks completed and results documented
- [ ] **Security Scan**: Executed and results documented (Pass/Issues Found/Skipped with reason/Failed with reason)
  - [ ] If security issues found: Findings documented in `tasks/<TICKET-ID>/security.md`
  - [ ] If Critical/High security findings: Elevated to main findings section and included in task list
  - [ ] If scan skipped: Valid reason documented (e.g., "Documentation-only changes")
  - [ ] If scan failed: Failure reason documented and manual security review performed
  - [ ] Security findings integrated into overall risk assessment
- [ ] **SQL Analysis**: Performed if database changes detected; skipped otherwise with clear indication
- [ ] **SQL Intelligence Check**: Verified that SQL analysis was appropriately triggered or skipped based on change type (e.g., skipped for pure CSS/UI changes)
- [ ] All seven deployment risk categories analyzed (skip only if clearly not applicable)
- [ ] Risk severity properly classified with 🔴🟠🟡🟢 indicators
- [ ] Specific file references and line numbers provided for all issues
- [ ] **Query-specific findings**: Include file, line number, ORM code, generated SQL, and risk assessment for each analyzed query
- [ ] Deployment impact summary completed (breaking changes, performance, rollback)
- [ ] Recommendations are actionable with clear rationale
- [ ] Task list is prioritized by risk severity (🔴 → 🟠 → 🟡 → 🟢)
- [ ] Task list uses numbered checkboxes (`- [ ] <index>`) with file/config references so `/implement` can execute fixes directly
- [ ] **Technology stack detected** from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` and documented
- [ ] **Database stack identified** if SQL analysis was performed (ORM type, database engine if determinable)
- [ ] **Project standards referenced** from `.cursor/rules/` or `.github/copilot-instructions.md` or `.github/instructions/` where applicable
- [ ] **Discovered Issues section populated** if out-of-scope issues found
- [ ] **Jira tickets created** for Critical/High severity discovered issues (using `Atlassian-MCP-Server`)
- [ ] **No scope creep in Task List** - only fixes for issues in current changes

---

## Safety & Idempotency

- This command may run **`git add .`** to stage files _for review_.
- It **will modify files** to apply linter and formatter fixes. These changes are part of the review process.
- It performs **no commits**. Use `git reset` to unstage changes.
- It **creates one new file** in `tasks/<TICKET-ID>/` or `tasks/<INCREMENTAL-NUMBER>-<SLUG>/` and does not modify other files.
- Never push, amend, or rebase in this command. Those belong to a separate "commit/PR" step.
