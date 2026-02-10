# Security Scan: 013-workspace-shareable-urls

**Executed By**: Code Review (review command)
**Date**: 2026-02-10
**Scope**: Staged diff — App.jsx, MarkdownRenderer.jsx, Sidebar.jsx, WorkspaceExplorer.jsx, Workspace.jsx, helpers.js
**Scan Duration**: ~6s
**Tools Executed**: npm audit

---

## Task List

- [ ] 1.0 🟠 Run `npm audit fix` to address axios high-severity vulnerability (GHSA-43fc-jf86-j433)
- [ ] 2.0 🟡 Consider `npm audit fix --force` for vite/esbuild moderate vulnerabilities (dev deps; breaking change — defer to separate upgrade)

---

## Executive Summary

- **Overall Status**: ⚠️ Warning (1 high, 6 moderate dependency vulnerabilities)
- **Critical**: 0
- **High**: 1 (axios)
- **Medium**: 6 (esbuild, vite, vitest chain — dev dependencies)
- **Low**: 0
- **Info**: 0

## Detailed Findings

### Critical & High Severity Issues

- **npm audit** — High — Axios DoS via `__proto__` key in mergeConfig
  - **Impact**: Denial of service via crafted config merge; affects production API client
  - **Remediation**: Run `npm audit fix` (non-breaking fix available)
  - **Reference**: [GHSA-43fc-jf86-j433](https://github.com/advisories/GHSA-43fc-jf86-j433)

### Medium & Low Severity Issues

- **npm audit** — Moderate — esbuild enables dev server request/response exposure
  - **Impact**: Affects Vite dev server only; not production build
  - **Remediation**: `npm audit fix --force` upgrades to Vite 6.4.1 (breaking change)
  - **Reference**: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)

## Dependency Health

- **Tool**: `npm audit`
- **Vulnerabilities**: Critical 0 | High 1 | Medium 6 | Low 0
- **Total Dependencies**: As per package-lock.json
- **Vulnerable Dependencies**: axios (direct), esbuild/vite/vitest (dev, transitive)
- **Notes**: Fix axios with `npm audit fix`. Vite chain is dev-only; moderate risk; consider upgrading in separate task.
- **Lock File Integrity**: ✅ Verified

## Secret Scan

Not executed — scope is routing and UI; no new secrets handling. No hardcoded credentials in changed files.

## SAST Findings

Manual review of changed code:

- **Path traversal**: `isWorkspaceFilePath()` rejects strings containing `..` — ✅ safe
- **Open redirect**: `getWorkspaceFileUrl()` produces internal `/workspace/*` paths only; no external URLs — ✅ safe
- **XSS**: Markdown links use React Router `Link` with `to` from `getWorkspaceFileUrl`; `isWorkspaceFilePath` regex restricts to path-like strings with allowed extensions — ✅ safe
- **URL injection**: `normalizeFilePathParam` trims and normalizes; no user input passed directly to external fetch — ✅ safe

## Artifacts Generated

None.

## Next Steps

1. Run `npm audit fix` before merge to resolve axios high vulnerability.
2. Log a follow-up task to upgrade Vite/esbuild if desired for dev dependency hygiene.
