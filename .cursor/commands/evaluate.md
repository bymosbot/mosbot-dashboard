# Evaluate MK4

**Purpose**
Evaluate two different pull requests (typically from different developers) working on the same task to determine which produces better code quality, lower risk, higher test coverage, and superior maintainability. This command analyzes code changes, complexity metrics, test coverage, and other quality indicators to provide a head-to-head comparison and recommendation.

> **Hard Stop / Non‑Execution Guarantee**
>
> - This command **MUST NOT** make code changes, run builds/tests, or modify any files.
> - It **only** reads PR data, analyzes code metrics, and **generates a comparison report**.
> - All analysis is read-only and focused on assessment rather than execution.

---

## Required Inputs

**MANDATORY**: You must provide **source and target branches** for both PRs being compared AND the **Jira issue URL/link**. Both PRs should typically target the same base branch (e.g., `main` or `develop`) to ensure fair comparison.

### Required Input Format

```bash
/evaluate <pr1-source>:<target> vs <pr2-source>:<target> jira:<jira-url>
```

### Input Format Examples

- **Two developers' approaches to same task**: `origin/feature/devA-approach:origin/main vs origin/feature/devB-approach:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-197`
- **Alternative implementations**: `origin/feature/retry-implementation-v1:origin/main vs origin/feature/retry-implementation-v2:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-198`
- **Different PRs for same feature**: `origin/feature/LOOM-197:origin/main vs origin/feature/LOOM-198:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-199`

### How to Specify Source and Target Branches

**Format**: `<source-branch>:<target-branch>`

- **Source branch**: The branch containing the changes (feature branch, commit hash, etc.)
- **Target branch**: The branch the changes are being merged into (usually `main`, `develop`, etc.)

**Examples**:

```bash
# Compare two feature branches against main
/evaluate origin/feature/LOOM-197:origin/main vs origin/feature/LOOM-198:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-199

# Compare a feature branch against main vs main against develop
/evaluate origin/feature/new-feature:origin/main vs origin/main:origin/develop jira:https://reflexmediainc.atlassian.net/browse/LOOM-200

# Compare specific commits against their target branches
/evaluate abc1234:origin/main vs def5678:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-201
```

The command will:

1. Parse source and target branches for both PRs and extract Jira issue details
2. Use `git diff <pr1-source>..<target>` and `git diff <pr2-source>..<target>` to compare changes
3. Fetch and analyze the Jira issue requirements, acceptance criteria, and specifications
4. Analyze all changed files between each PR and the common target
5. Evaluate how well each PR addresses the Jira issue requirements
6. Generate comparative metrics and risk assessment for both approaches
7. Create a head-to-head comparison report with recommendation based on both code quality and Jira adherence

### How to Get PR References (Bitbucket)

#### Method 1: Using Branch Names (Most Common)

```bash
# List all remote branches
git branch -r

# Look for feature branches (common Bitbucket pattern)
git branch -r | grep feature
git branch -r | grep LOOM-

# Common patterns:
# origin/feature/LOOM-4041
# origin/feature/new-feature
# origin/bugfix/fix-name
```

#### Method 2: Using Commit Hashes from Bitbucket URLs

```bash
# If you have a PR URL like: https://bitbucket.org/org/repo/pull-requests/123
# You can get the commit hash from the PR page or use:

# Find commits with PR numbers in messages
git log --grep="PR #" --oneline
git log --grep="pull request" --oneline

# Find merge commits
git log --merges --oneline
```

#### Method 3: Using Git Log to Find PR Commits

```bash
# Find commits between dates (if you know when PRs were merged)
git log --since="2024-01-01" --until="2024-01-31" --oneline

# Find commits by author
git log --author="username" --oneline

# Find commits with specific patterns
git log --grep="LOOM-" --oneline
```

#### Method 4: Using Bitbucket Branch References

```bash
# Fetch all remote references
git fetch origin

# List branches with specific patterns
git branch -r | grep -E "(feature|bugfix|hotfix)"

# Check if specific branch exists
git show-branch origin/feature/LOOM-4041
```

#### Method 5: Using Bitbucket PR IDs

```bash
# If you have a PR URL like: https://bitbucket.org/reflexmediainc/outsourcer/pull-requests/197/diff
# The PR ID is 197

# Find commits related to specific PR ID
git log --grep="197" --oneline
git log --grep="PR #197" --oneline
git log --grep="pull request #197" --oneline

# Search commit messages for PR references
git log --all --grep="197" --oneline
```

#### Method 6: Using Git Tags (if used)

```bash
# List tags (if PRs are tagged)
git tag -l

# Find commits between tags
git log tag1..tag2 --oneline
```

### Bitbucket PR ID Examples

For your specific case with PR 197:

```bash
# Find commits related to PR 197
git log --grep="197" --oneline
git log --grep="PR #197" --oneline

# Then use the source:target format with Jira URL
/evaluate origin/feature/LOOM-197:origin/main vs origin/feature/LOOM-198:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-197
```

**Common patterns for your project**:

```bash
# Compare two different approaches to the same task
/evaluate origin/feature/devA-retry-logic:origin/main vs origin/feature/devB-retry-logic:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-4041

# Compare alternative implementations of same feature
/evaluate origin/feature/caching-approach-v1:origin/main vs origin/feature/caching-approach-v2:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-4042

# Compare different PRs for same LOOM ticket
/evaluate origin/feature/LOOM-4041-alternative:origin/main vs origin/feature/LOOM-4041:origin/main jira:https://reflexmediainc.atlassian.net/browse/LOOM-4041
```

### Optional Inputs

- **Risk thresholds**: Custom severity levels for different metrics
- **Focus areas**: Specific aspects to emphasize (security, performance, maintainability)
- **Exclude patterns**: Files or directories to ignore in analysis

---

## CRITICAL VALIDATION REQUIREMENTS

**MANDATORY**: Before generating any evaluation report, you MUST perform these validation checks to prevent critical errors:

### 1. Git Diff Direction Validation

**REQUIRED CHECK**: Verify that git diff results match PR descriptions:

```bash
# Example validation commands to run:
git diff <pr1-source>..<target> --stat
git diff <pr2-source>..<target> --stat

# Then verify:
# - If PR description says "adds functionality", diff should show +lines
# - If PR description says "removes functionality", diff should show -lines
# - If PR description says "comprehensive implementation", diff should show significant +lines
# - If PR description says "minimal change", diff should show small +lines or -lines
```

**FAILURE CRITERIA**: If git diff results contradict PR descriptions, STOP and request clarification before proceeding.

### 2. Branch Assignment Validation

**REQUIRED CHECK**: Confirm PR assignments match the command format:

```bash
# Command format: <pr1-source>:<target> vs <pr2-source>:<target>
# Verify:
# - PR 1 = <pr1-source> branch
# - PR 2 = <pr2-source> branch
# - Both target the same base branch for fair comparison
```

### 3. Jira Requirements Cross-Reference

**REQUIRED CHECK**: Verify both PRs actually address the Jira issue:

- At least one PR must implement the core Jira requirement
- Both PRs should be working on the same Jira ticket
- PR descriptions should align with Jira acceptance criteria

### 4. Analysis Consistency Check

**REQUIRED CHECK**: Before writing the report, verify:

- Git diff results match the analysis conclusions
- PR strengths/weaknesses align with actual code changes
- Risk assessments match the actual implementation approach
- Quality scores reflect the actual code quality metrics

**VALIDATION FAILURE**: If any check fails, STOP the evaluation and request user clarification. Do not proceed with potentially incorrect analysis.

---

## Hard Guardrails

- **Read-only analysis**: No code modifications, builds, or test execution
- **Comprehensive metrics**: Cover code quality, test coverage, complexity, and risk indicators
- **Actionable insights**: Provide specific recommendations, not just raw numbers
- **Risk assessment**: Always include severity classification for identified issues

---

## Analysis Pipeline

1. **Ingest Git Data & Jira Requirements**
   - Parse source and target branches for both PRs from input format `<pr1-source>:<target> vs <pr2-source>:<target> jira:<jira-url>`
   - Fetch and analyze Jira issue details (requirements, acceptance criteria, specifications, priority, story points)
   - Use `git diff <pr1-source>..<target>` and `git diff <pr2-source>..<target>` to compare changes
   - **CRITICAL VALIDATION**: Verify git diff results match PR descriptions before proceeding
   - Extract file changes, additions, deletions, and modifications for each PR
   - Identify new, modified, and deleted files using git status
   - Analyze commit messages and change patterns for both PRs
   - Cross-reference PR changes against Jira issue requirements

2. **Jira Issue Adherence Analysis**
   - **Requirements Coverage**: Compare how well each PR addresses the Jira issue requirements
   - **Acceptance Criteria**: Evaluate which PR better meets the defined acceptance criteria
   - **Scope Alignment**: Assess if PRs stay within scope or introduce scope creep
   - **Priority Alignment**: Check if PRs address high-priority requirements first
   - **Story Point Estimation**: Compare actual implementation complexity vs estimated story points

3. **Comparative Code Quality Metrics**
   - **Simplicity (KISS Principle)**: Compare over-engineering vs straightforward solutions; unnecessary abstractions increase risk
   - **Code Change Size**: Compare LOC added/removed (lower is better, except for test coverage); smaller changes = lower risk
   - **Complexity**: Compare cyclomatic complexity, cognitive complexity between approaches
   - **Maintainability**: Compare code duplication, coupling metrics, readability
   - **New Abstractions**: Compare unnecessary new exception types, classes, utilities vs reusing existing patterns
   - **Scope Discipline**: Compare scope creep (unrelated changes) vs focused implementations
   - **Security**: Compare potential vulnerabilities, unsafe patterns
   - **Performance**: Compare performance anti-patterns, resource usage
   - **Standards compliance**: Compare ESLint violations, TypeScript strictness

4. **Test Coverage Comparison**
   - Compare test coverage changes (lines, branches, functions) between PRs
   - Compare test quality indicators (test complexity, assertion density)
   - Identify which PR has better test coverage for new/modified code
   - Evaluate test coverage against Jira acceptance criteria

5. **Deployment Risk Assessment**
   - **UX Risk**: Changes affecting user experience (response time, error messages, API behavior, feature availability)
   - **Regressions Risk**: Breaking changes (API contracts, request/response payloads, user interaction flows, database schemas)
   - **Breaking Changes**: API contract changes, database schema changes, configuration changes
   - **Logic Changes**: Business logic modifications, algorithm changes, data flow changes
   - **Performance Impact**: Response time changes, memory usage, CPU impact, external API calls
   - **Infrastructure Impact**: New dependencies, environment variables, AWS resource changes
   - **Operational Impact**: Monitoring changes, logging changes, error handling changes

6. **Generate Head-to-Head Comparison Report**
   - Side-by-side metrics comparison with winner identification
   - Risk severity breakdown for both approaches
   - Jira adherence comparison with specific requirement mapping
   - Recommendation on which PR is superior and why

7. **Assign Quality Scores**
   - Produce a numeric quality score (0–10) for each PR
   - **Heavy weighting on Jira adherence** (40% of total score)
   - Code quality metrics (30% of total score)
   - Test coverage (20% of total score)
   - Deployment risk (10% of total score)
   - Provide a one-line rationale per score capturing key strengths/risks

---

## Output: **Create evaluation report file**

**Target path**:

- If ticket ID provided: `tasks/<TICKET-ID>/evaluation.md` (e.g., `tasks/loom-4041/evaluation.md`)
- If no ticket ID: `tasks/<INCREMENTAL-NUMBER>-<SLUG>/evaluation.md` (e.g., `tasks/001-retry-logic-comparison/evaluation.md`)

> **Note**: For incremental numbering, use zero-padded 3-digit numbers (001, 002, etc.) and create a kebab-case slug from the evaluation summary.

### When the folder/file **exists**

- **Preserve** header metadata and any prior content.
- **Replace** the **Evaluation Analysis** sections in place with the new evaluation findings.

### When the folder/file **does not exist**

- Create the folder structure: `tasks/<TICKET-ID>/` or `tasks/<INCREMENTAL-NUMBER>-<SLUG>/`
- Create `evaluation.md` file with the structure below.

### File Structure

### Header

- **PR 1**: `<pr1-branch>` (`<commit-hash>`)  
  `<description>`
- **PR 2**: `<pr2-branch>` (`<commit-hash>`)  
  `<description>`
- **Jira Issue**: `<jira-key>` - `<jira-title>`  
  `<jira-url>`
- **Target Branch**: `<common-target-branch>`
- **Analysis Date**: `<timestamp>`
- **Winner**: `<Recommended PR>`

**Quality Scores** (Jira adherence weighted 40%):

- **PR 1**: `<score>/10` – `<rationale>` (Jira: `<jira-score>/4`, Code: `<code-score>/3`, Tests: `<test-score>/2`, Risk: `<risk-score>/1`)
- **PR 2**: `<score>/10` – `<rationale>` (Jira: `<jira-score>/4`, Code: `<code-score>/3`, Tests: `<test-score>/2`, Risk: `<risk-score>/1`)

### Executive Summary

- **Overall Assessment**: Head-to-head comparison summary including Jira adherence
- **PR 1 Strengths**: Notable advantages of first approach (including Jira requirement coverage)
- **PR 2 Strengths**: Notable advantages of second approach (including Jira requirement coverage)
- **Jira Adherence Winner**: Which PR better addresses the Jira issue requirements
- **Recommendation**: Which PR is superior and why (considering both code quality and Jira adherence)
- **Risk Comparison**: Overall risk assessment for both approaches

### Jira Issue Adherence Analysis

#### Requirements Coverage

- **Jira Issue Summary**: Brief description of the Jira issue and its requirements
- **PR 1 Coverage**: How well PR 1 addresses each requirement (with specific examples)
- **PR 2 Coverage**: How well PR 2 addresses each requirement (with specific examples)
- **Coverage Winner**: Which PR better addresses the Jira requirements

#### Acceptance Criteria Evaluation

- **Jira Acceptance Criteria**: List of defined acceptance criteria from the Jira issue
- **PR 1 Criteria Meeting**: Which acceptance criteria PR 1 fulfills (with evidence)
- **PR 2 Criteria Meeting**: Which acceptance criteria PR 2 fulfills (with evidence)
- **Criteria Winner**: Which PR better meets the acceptance criteria

#### Scope & Priority Alignment

- **Scope Alignment**: Whether PRs stay within scope or introduce scope creep
- **Priority Alignment**: Whether PRs address high-priority requirements first
- **Story Point Accuracy**: How actual implementation complexity compares to estimated story points

### Code Quality Metrics

#### Simplicity & KISS Principle Analysis

- **PR 1 Simplicity**: Over-engineering assessment (unnecessary abstractions, new exception types, scope creep)
- **PR 2 Simplicity**: Over-engineering assessment (unnecessary abstractions, new exception types, scope creep)
- **Winner**: Which approach follows KISS principle better
- **Risk Impact**: Over-engineering increases maintenance burden, deployment risk, and cognitive complexity

#### Code Change Size & Scope Discipline

- **PR 1 Changes**: Lines added/removed (excluding tests), files modified, scope creep assessment
- **PR 2 Changes**: Lines added/removed (excluding tests), files modified, scope creep assessment
- **Winner**: Which approach has smaller, more focused changes (lower LOC = lower risk)
- **Note**: Test coverage LOC is exempt from "smaller is better" principle

#### Complexity Analysis

- **PR 1 Complexity**: Cyclomatic/cognitive complexity metrics
- **PR 2 Complexity**: Cyclomatic/cognitive complexity metrics
- **Winner**: Which approach has lower complexity
- **File Size Comparison**: Lines added/removed/modified for each PR

#### New Abstractions Assessment

- **PR 1 Abstractions**: New exception types, classes, utilities (are they reused in 3+ places?)
- **PR 2 Abstractions**: New exception types, classes, utilities (are they reused in 3+ places?)
- **Winner**: Which approach reuses existing patterns vs creating unnecessary new ones
- **Risk Impact**: Single-use abstractions increase maintenance burden without benefit

#### Security & Performance

- **PR 1 Security**: Vulnerabilities, unsafe patterns
- **PR 2 Security**: Vulnerabilities, unsafe patterns
- **Performance Comparison**: Resource usage, optimization opportunities
- **Dependency Changes**: New/updated packages and their risks for each PR

### Test Coverage Analysis

- **PR 1 Coverage**: Percentage changes by category
- **PR 2 Coverage**: Percentage changes by category
- **Coverage Winner**: Which PR has better test coverage
- **Test Quality Comparison**: Test complexity and coverage gaps
- **Jira Criteria Testing**: How well tests cover Jira acceptance criteria

### Deployment Impact Analysis

#### UX Risk Assessment

- **Response Time Changes**: Compare expected latency impact on user experience
- **Error Message Changes**: Compare user-facing error message modifications
- **Feature Availability**: Compare impact on feature accessibility and reliability
- **API Behavior Changes**: Compare modifications to API behavior that affect client integration
- **User Interaction Changes**: Compare changes to how users interact with the system

#### Regressions Risk Assessment

- **Breaking API Changes**: Compare changes to request/response schemas, endpoint signatures
- **Payload Changes**: Compare modifications to request/response payloads that break client contracts
- **Interaction Flow Changes**: Compare modifications to user interaction flows and workflows
- **Backward Compatibility**: Compare ability to support existing clients without breaking changes
- **Migration Requirements**: Compare need for client-side changes to accommodate PR

#### Breaking Changes Assessment

- **API Contract Changes**: Compare changes to request/response schemas, endpoint modifications
- **Database Schema Changes**: Compare table modifications, index changes, migration requirements
- **Configuration Changes**: Compare environment variable changes, config file modifications
- **Dependency Changes**: Compare new/updated packages, version changes, security implications

#### Business Logic Impact

- **Core Algorithm Changes**: Compare modifications to business-critical algorithms
- **Data Flow Changes**: Compare changes to data processing pipelines
- **Error Handling Changes**: Compare modifications to error recovery and fallback logic
- **Integration Changes**: Compare modifications to external service integrations

#### Performance Impact Analysis

- **Response Time Impact**: Compare expected latency changes (API calls, database queries)
- **Memory Usage**: Compare memory footprint changes, potential memory leaks
- **CPU Impact**: Compare computational complexity changes
- **External API Calls**: Compare changes to third-party service usage patterns
- **Caching Impact**: Compare caching strategy changes and cache hit/miss ratios

#### Infrastructure & Operational Impact

- **AWS Resource Changes**: Compare Lambda configurations, DynamoDB changes, SQS modifications
- **Monitoring Changes**: Compare logging modifications, metrics changes, alerting updates
- **Deployment Complexity**: Compare deployment requirements, rollback complexity
- **Operational Overhead**: Compare maintenance requirements, troubleshooting complexity

### Risk Severity Breakdown

#### PR 1 Deployment Risk

- **🔴 Critical UX/Regressions Risks**: Breaking API changes, payload modifications, backward incompatibility
- **🟠 High UX/Regressions Risks**: Response time degradation >10%, error message changes, interaction flow changes
- **🟡 Medium UX/Regressions Risks**: Minor latency impact <10%, non-breaking API behavior changes
- **🟢 Low UX/Regressions Risks**: Internal changes with no user-facing impact
- **🔴 Critical Deployment Risks**: Breaking changes, performance regressions, infrastructure failures
- **🟠 High Deployment Risks**: Over-engineering (unnecessary abstractions), scope creep, complex logic changes
- **🟡 Medium Deployment Risks**: Minor performance impact, operational complexity, larger LOC changes
- **🟢 Low Deployment Risks**: KISS-compliant changes, focused scope, well-tested modifications, minimal LOC

#### PR 2 Deployment Risk

- **🔴 Critical UX/Regressions Risks**: Breaking API changes, payload modifications, backward incompatibility
- **🟠 High UX/Regressions Risks**: Response time degradation >10%, error message changes, interaction flow changes
- **🟡 Medium UX/Regressions Risks**: Minor latency impact <10%, non-breaking API behavior changes
- **🟢 Low UX/Regressions Risks**: Internal changes with no user-facing impact
- **🔴 Critical Deployment Risks**: Breaking changes, performance regressions, infrastructure failures
- **🟠 High Deployment Risks**: Over-engineering (unnecessary abstractions), scope creep, complex logic changes
- **🟡 Medium Deployment Risks**: Minor performance impact, operational complexity, larger LOC changes
- **🟢 Low Deployment Risks**: KISS-compliant changes, focused scope, well-tested modifications, minimal LOC

#### Deployment Risk Comparison

- **Safer Deployment Winner**: Which PR poses lower risk to production systems
- **Rollback Complexity**: How easy it is to rollback each PR if issues arise
- **Production Readiness**: Which PR is more ready for immediate production deployment

### Recommendations

#### Deployment Decision

- **Recommended PR**: Which PR to deploy and why (based on deployment risk assessment)
- **Deployment Strategy**: Recommended deployment approach (blue-green, canary, direct)
- **Rollback Plan**: Specific rollback steps if issues arise post-deployment
- **Monitoring Requirements**: Key metrics to monitor post-deployment

#### Risk Mitigation

- **Pre-deployment Actions**: Required steps before merging (additional testing, staging validation)
- **Post-deployment Monitoring**: Critical metrics to watch for 24-48 hours post-deployment
- **Contingency Plans**: Specific actions if performance degradation or errors occur

#### Merge Strategy

- **Winner Selection**: Which PR to choose and why
- **Best Practices Integration**: How to incorporate best practices from both PRs
- **Follow-up Actions**: Items to address regardless of which PR is chosen

### Detailed File Analysis

- **PR 1 Files**: New/modified/deleted files with risk assessment
- **PR 2 Files**: New/modified/deleted files with risk assessment
- **File Comparison**: Which PR handles file changes more effectively
- **Impact Analysis**: System stability implications for each approach

---

## Risk Severity Classification

### Critical (🔴)

**UX/Regressions Risks**:

- Breaking API changes without proper versioning
- Request/response payload modifications breaking client contracts
- User interaction flow changes without backward compatibility
- Performance regressions >20% affecting user experience
- Database schema changes requiring client-side migrations

**Deployment Risks**:

- Security vulnerabilities (OWASP Top 10)
- Memory leaks or resource exhaustion risks
- Missing error handling in critical paths
- Infrastructure failures

### High (🟠)

**UX/Regressions Risks**:

- Response time degradation 10-20%
- Non-backward-compatible API behavior changes
- Error message changes affecting client error handling
- Feature availability changes without migration path

**Deployment Risks**:

- Over-engineering: unnecessary new exception types, abstractions used in single place
- Scope creep: modifying unrelated code not required for the task
- Complex code (>15 cyclomatic complexity) without tests
- High coupling between modules
- Missing input validation
- Test coverage <80% for new code

### Medium (🟡)

**UX/Regressions Risks**:

- Minor latency impact 5-10%
- Non-breaking API behavior changes (additive only)
- Internal error handling changes with same user-facing behavior

**Deployment Risks**:

- Larger LOC changes (>500 lines excluding tests) increase review burden
- Code style violations
- Minor complexity increases
- Missing documentation
- Inconsistent naming conventions
- Test coverage 80-90% for new code

### Low (🟢)

**UX/Regressions Risks**:

- Internal changes with zero user-facing impact
- Performance improvements
- Better error messages with same error handling

**Deployment Risks**:

- KISS-compliant: reuses existing patterns, no unnecessary abstractions
- Focused scope: only touches code required for the task
- Minimal LOC changes (<200 lines excluding tests)
- Well-tested simple modifications (>90% test coverage)
- Documentation improvements
- Code style improvements

---

## Quality Gates (self‑check before writing file)

- **CRITICAL**: Git diff results verified against PR descriptions (no reversed analysis)
- Both PRs successfully analyzed with concrete metrics
- Jira issue requirements and acceptance criteria properly analyzed
- Head-to-head comparison completed with clear winner identification
- Jira adherence heavily weighted in quality scoring (40% of total score)
- Risk severity properly classified for both approaches
- Specific file references provided for all recommendations
- Executive summary captures comparative findings clearly including Jira adherence
- Recommendation is actionable with clear rationale considering both code quality and Jira requirements
- **VALIDATION CHECK**: Confirm git diff direction matches PR analysis (e.g., if PR adds code, diff should show +lines, not -lines)

---

## Interop / Orchestration Notes

- On success, return the path of the evaluation report file
- Report can be used for PR reviews, team discussions, or process improvements
- Consider integrating with CI/CD pipelines for automated quality gates
- **Include Next Steps in AI response**: After writing the evaluation file, provide clear next steps to the user:
  1. Review the generated evaluation file: `tasks/<TICKET-ID>/evaluation.md`
  2. Use the evaluation results to make informed decisions about which PR to deploy
  3. Consider the recommendations for merge strategy and follow-up actions

---

## Example Output Structure

```md
# Evaluation Report: feature/devA-retry-logic vs feature/devB-retry-logic

**PR 1**: `feature/devA-retry-logic` (`abc1234`) - Exponential backoff approach
**PR 2**: `feature/devB-retry-logic` (`def5678`) - Circuit breaker approach  
**Jira Issue**: `LOOM-197` - Implement retry logic for Jarvis API calls
`https://reflexmediainc.atlassian.net/browse/LOOM-197`
**Target Branch**: `origin/main`
**Analysis Date**: 2024-01-15T10:30:00Z
**Winner**: 🏆 PR 2 (feature/devB-retry-logic)

---

## Executive Summary

**Overall Assessment**: Both PRs implement retry logic for Jarvis API calls, but PR 2's circuit breaker approach provides better resilience, observability, and more comprehensively addresses the Jira requirements.

**PR 1 Strengths**:

- Simple exponential backoff implementation
- Comprehensive test coverage (92%)
- Minimal configuration surface
- Addresses core Jira requirement for retry logic

**PR 2 Strengths**:

- Circuit breaker pattern prevents cascade failures
- Built-in metrics and monitoring hooks
- Better error classification and handling
- Lower memory usage with connection pooling
- Better addresses Jira acceptance criteria for monitoring and observability

**Jira Adherence Winner**: 🏆 PR 2 - Better addresses monitoring requirements and error handling criteria
**Recommendation**: Choose PR 2 - superior architecture with better operational characteristics and Jira adherence
**Risk Comparison**: PR 1 (Medium) vs PR 2 (Low) - PR 2 has fewer operational risks

---

## Jira Issue Adherence Analysis

### Requirements Coverage

- **Jira Issue Summary**: Implement retry logic for Jarvis API calls to improve reliability and handle transient failures
- **PR 1 Coverage**: ✅ Implements exponential backoff retry logic, ✅ handles timeout errors, ❌ Limited monitoring capabilities
- **PR 2 Coverage**: ✅ Implements circuit breaker retry logic, ✅ handles timeout errors, ✅ Comprehensive monitoring and metrics
- **Coverage Winner**: 🏆 PR 2 - Better addresses monitoring and observability requirements

### Acceptance Criteria Evaluation

- **Jira Acceptance Criteria**:
  - Retry logic for failed API calls
  - Exponential backoff for retries
  - Monitoring and alerting for retry patterns
  - Graceful degradation when service is down
- **PR 1 Criteria Meeting**: ✅ Retry logic, ✅ Exponential backoff, ❌ Basic monitoring, ✅ Graceful degradation
- **PR 2 Criteria Meeting**: ✅ Retry logic, ✅ Circuit breaker (better than exponential), ✅ Comprehensive monitoring, ✅ Graceful degradation
- **Criteria Winner**: 🏆 PR 2 - Meets all criteria with superior implementation

### Scope & Priority Alignment

- **Scope Alignment**: Both PRs stay within scope, no scope creep detected
- **Priority Alignment**: Both address high-priority reliability requirements first
- **Story Point Accuracy**: PR 1 aligns with 3-point estimate, PR 2 slightly exceeds at 5 points due to monitoring features

## Code Quality Metrics

### Simplicity & KISS Principle Analysis

- **PR 1 Simplicity**: ⚠️ Introduces new RetryException for single use case, adds caching layer not in requirements
- **PR 2 Simplicity**: ✅ Uses existing ErrorException, focused on requirements only
- **Winner**: 🏆 PR 2 - KISS-compliant, no over-engineering
- **Risk Impact**: PR 1's unnecessary abstraction increases maintenance burden

### Code Change Size & Scope Discipline

- **PR 1 Changes**: 3 files modified (+150/-20 lines source, +100 test), modifies unrelated logging
- **PR 2 Changes**: 4 files modified (+180/-15 lines source, +200 test), focused on retry logic only
- **Winner**: 🏆 PR 1 - Smaller source code changes (but PR 2 has better test coverage)
- **Note**: PR 2's higher LOC is acceptable due to comprehensive test coverage (+200 vs +100)

### Complexity Analysis

- **PR 1 Complexity**: Cyclomatic 12, Cognitive 25, 3 files modified
- **PR 2 Complexity**: Cyclomatic 8, Cognitive 18, 4 files modified
- **Winner**: 🏆 PR 2 - Lower complexity despite more files

### New Abstractions Assessment

- **PR 1 Abstractions**: ⚠️ New RetryException (used in 1 place only), new CacheManager (single use)
- **PR 2 Abstractions**: ✅ No new abstractions, reuses existing patterns
- **Winner**: 🏆 PR 2 - Avoids unnecessary abstractions
- **Risk Impact**: PR 1's single-use abstractions add maintenance burden without benefit

### Security & Performance

- **PR 1 Security**: ✅ No vulnerabilities, basic input validation
- **PR 2 Security**: ✅ No vulnerabilities, comprehensive input validation + sanitization
- **Performance Winner**: 🏆 PR 2 - Connection pooling reduces latency by ~15ms
- **Dependencies**: Both add same retry library, PR 2 adds metrics library

---

## Deployment Impact Analysis

### UX Risk Assessment

- **Response Time Changes**: PR 1 - +5ms (caching overhead), PR 2 - +2ms (retry overhead)
- **Error Message Changes**: PR 1 - No changes, PR 2 - No changes ✅
- **Feature Availability**: PR 1 - Improved (caching), PR 2 - Improved (retry resilience)
- **API Behavior Changes**: PR 1 - No breaking changes, PR 2 - No breaking changes ✅
- **User Interaction Changes**: PR 1 - Transparent to users, PR 2 - Transparent to users ✅

### Regressions Risk Assessment

- **Breaking API Changes**: PR 1 - None ✅, PR 2 - None ✅
- **Payload Changes**: PR 1 - None ✅, PR 2 - None ✅
- **Interaction Flow Changes**: PR 1 - None ✅, PR 2 - None ✅
- **Backward Compatibility**: PR 1 - Fully compatible ✅, PR 2 - Fully compatible ✅
- **Migration Requirements**: PR 1 - None ✅, PR 2 - None ✅

### Breaking Changes Assessment

- **API Contract Changes**: PR 1 - No changes, PR 2 - No changes ✅
- **Database Schema Changes**: PR 1 - No changes, PR 2 - No changes ✅
- **Configuration Changes**: PR 1 - 3 new env vars, PR 2 - 1 new env var
- **Dependency Changes**: PR 1 - No new deps, PR 2 - Adds metrics library

### Business Logic Impact

- **Core Algorithm Changes**: PR 1 - Exponential backoff logic, PR 2 - Circuit breaker logic
- **Data Flow Changes**: PR 1 - Adds caching layer, PR 2 - Adds retry utility
- **Error Handling Changes**: PR 1 - Comprehensive error classification, PR 2 - Basic retry logic
- **Integration Changes**: PR 1 - Enhanced Jarvis integration, PR 2 - Minimal Jarvis changes

### Performance Impact Analysis

- **Response Time Impact**: PR 1 - +5ms (caching overhead), PR 2 - +2ms (retry overhead)
- **Memory Usage**: PR 1 - +15MB (cache storage), PR 2 - +3MB (retry state)
- **CPU Impact**: PR 1 - +10% (cache operations), PR 2 - +5% (retry logic)
- **External API Calls**: PR 1 - Reduced calls (caching), PR 2 - Same call pattern
- **Caching Impact**: PR 1 - New caching layer, PR 2 - No caching changes

### Infrastructure & Operational Impact

- **AWS Resource Changes**: PR 1 - No changes, PR 2 - No changes ✅
- **Monitoring Changes**: PR 1 - Enhanced logging, PR 2 - Basic metrics
- **Deployment Complexity**: PR 1 - Medium (config changes), PR 2 - Low (minimal changes)
- **Operational Overhead**: PR 1 - High (cache management), PR 2 - Low (simple retry)

## Risk Severity Breakdown

### PR 1 Deployment Risk

- **🔴 Critical UX/Regressions Risks**: 0 (No breaking changes)
- **🟠 High UX/Regressions Risks**: 0 (No user-facing impact)
- **🟡 Medium UX/Regressions Risks**: 1 (Minor latency increase +5ms)
- **🟢 Low UX/Regressions Risks**: 1 (Transparent to users)
- **🔴 Critical Deployment Risks**: 0 (No breaking changes)
- **🟠 High Deployment Risks**: 2 (Over-engineering: RetryException + CacheManager for single use, scope creep: unrelated logging changes)
- **🟡 Medium Deployment Risks**: 2 (Memory usage increase, operational complexity)
- **🟢 Low Deployment Risks**: 1 (Well-tested implementation)

### PR 2 Deployment Risk

- **🔴 Critical UX/Regressions Risks**: 0 (No breaking changes)
- **🟠 High UX/Regressions Risks**: 0 (No user-facing impact)
- **🟡 Medium UX/Regressions Risks**: 0 (Minimal latency impact +2ms)
- **🟢 Low UX/Regressions Risks**: 2 (Internal changes only, improved resilience)
- **🔴 Critical Deployment Risks**: 0 (No breaking changes)
- **🟠 High Deployment Risks**: 0 (Simple implementation, no over-engineering)
- **🟡 Medium Deployment Risks**: 1 (New dependency)
- **🟢 Low Deployment Risks**: 3 (KISS-compliant, focused scope, minimal LOC, excellent test coverage)

### Deployment Risk Comparison

- **Safer Deployment Winner**: 🏆 PR 2 - Lower operational risk, simpler rollback
- **Rollback Complexity**: PR 1 - Medium (config rollback), PR 2 - Low (simple revert)
- **Production Readiness**: PR 2 - More ready for immediate deployment

---

## Recommendations

### Deployment Decision

🏆 **Deploy PR 2** - Lower deployment risk, simpler rollback, and immediate production readiness.

**Deployment Strategy**: Direct deployment recommended due to low risk profile
**Rollback Plan**: Simple git revert if issues arise (low complexity)
**Monitoring Requirements**: Watch retry metrics, error rates, and response times

### Risk Mitigation

**Pre-deployment Actions**:

- Validate staging environment with PR 2
- Ensure metrics library is properly configured

**Post-deployment Monitoring**:

- Monitor retry success rates for 24 hours
- Watch for any increase in error rates
- Validate response time improvements

**Contingency Plans**:

- If retry logic causes issues, disable retry feature via config
- If performance degrades, rollback to previous version

### Merge Strategy

1. Use PR 2 as base implementation
2. Adopt PR 1's simpler error message formatting
3. Combine both approaches' documentation styles

### Follow-up Actions

1. Monitor circuit breaker metrics in production
2. Document retry configuration best practices
3. Create integration tests for both approaches' error scenarios
```
