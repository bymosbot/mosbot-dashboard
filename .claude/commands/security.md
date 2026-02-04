# Security Scan MK1

**Purpose**  
Run automated security assurance checks on the working branch so vulnerabilities are surfaced **before** code review or release. `/security` orchestrates static analysis, dependency health, and optional dynamic scans while keeping findings scoped to the current change set.

---

## Recommended Usage

Use `/security` to give reviewers a current, branch-scoped security report so questions about vulnerabilities are answered before review starts.

- Before `/review` or prior to prepping a release.
- When tickets touch auth, cryptography, data handling, external integrations, or infrastructure configs.
- As part of scheduled security sweeps (nightly/weekly) to baseline risk.
- Before merging to main/master branches (enforce as CI gate).
- When introducing new dependencies or updating existing ones.
- Before container image builds or deployments.
- When modifying authentication/authorization logic.
- When handling sensitive data (PII, PHI, payment information).
- When making changes to API endpoints or security configurations.

---

## Guardrails

- **Read-only code**: Tooling must not modify application source or configs. Generated reports and SARIF files may be written under `tasks/<ticket>/security/` or another configured artifacts directory.
- **No secret exfiltration**: Redact API keys, tokens, and personal data from logs and generated reports.
- **Fail fast on critical findings**: If a high/critical issue is detected, stop remaining checks unless the user passes `--force`.
- **Respect environment limits**: Default to safe, non-destructive scans. Require explicit `--dast` flag before running live endpoints.

---

## Inputs & Flags

- Optional ticket or task reference (e.g., `tasks/PROJ-123/task.md`) to associate artifacts.
- Optional flags:
  - `--paths <glob>` → restrict SAST/secret scans to specific directories.
  - `--dependencies` | `--no-dependencies`
  - `--sast` | `--no-sast`
  - `--secrets` | `--no-secrets`
  - `--dast <url>` → run dynamic scans against the provided base URL (requires confirmation prompt).
  - `--compliance` → include policy-as-code or IaC checks when available.
  - `--baseline <file>` → compare results to an existing SARIF/JSON baseline to highlight new issues only.
  - `--containers` → scan container images (Dockerfiles, container registries) when applicable.
  - `--sbom` → generate Software Bill of Materials (SBOM) in SPDX or CycloneDX format.
  - `--licenses` → check dependency licenses for policy violations or incompatible licenses.
  - `--api` → perform API-specific security checks (rate limiting, auth validation, OpenAPI security).
  - `--config` → validate configuration files, environment variables, and secrets management.
  - `--headers` → validate HTTP security headers (CSP, HSTS, X-Frame-Options, etc.).
  - `--crypto` → audit cryptographic implementations, key management, and algorithm choices.

Default behavior runs SAST, dependency, and secret scans using commands sourced from project rules.

---

## Language Profiles

Adapt the tooling list to the primary stack:

- **JavaScript/TypeScript**
  - Dependency audit: `npm audit --json`, `yarn npm audit --recursive`, or `pnpm audit --json`.
  - SAST: `semgrep --config auto`, `eslint --config security`, or `nodejsscan`.
  - Secrets: `gitleaks detect --source .`, `trufflehog filesystem .`.

- **Python**
  - Dependency audit: `pip-audit -r requirements.txt --output-format json`, `safety check --full-report`.
  - SAST: `bandit -r <paths> -f json`, `semgrep --config p/ci` for Python rulesets.
  - Secrets: `detect-secrets scan --all-files`, `gitleaks detect --source .` with Python-specific allowlists.
  - Optional IaC: `checkov -d .` for Terraform/CloudFormation in serverless deployments.

- **Serverless (AWS SAM, Serverless Framework, Terraform CDK, etc.)**
  - Infrastructure drift: `checkov -d .`, `tfsec .`, or `cfn-lint template.yaml` for IaC templates.
  - Function bundles: reuse the language-specific dependency and SAST commands (`npm audit`, `bandit`, `semgrep`) against each `src/` or `handlers/` subdirectory.
  - Permissions review: `npm exec -- @serverless/cli info --verbose` or `aws sam validate --template-file template.yaml` with policy diff plugins where available.
  - Secrets/config: run `detect-secrets scan` on deployment manifests (`serverless.yml`, `template.yaml`, `cdk.json`) and confirm env vars are sourced from secure stores.

- **Containers (Docker, Podman, Kubernetes)**
  - Image scanning: `trivy image <image>`, `docker scout cves <image>`, `snyk container test <image>`, or `grype <image>`.
  - Dockerfile analysis: `hadolint Dockerfile`, `checkov -f Dockerfile`, `dockerfilelint`, or `trivy fs --security-checks config Dockerfile`.
  - Kubernetes manifests: `kube-score`, `kubeaudit`, `kubescape scan`, `checkov -d k8s/`, or `polaris audit`.
  - Container runtime: validate image provenance, signed images, and minimal base images (distroless/alpine).
  - Supply chain: verify image digests, scan for malware, and check for known bad actors in registries.

- **Go**
  - Dependency audit: `govulncheck ./...`, `gosec ./...`, `nancy sleuth`, or `trivy fs .`.
  - SAST: `gosec -fmt json ./...`, `staticcheck`, `semgrep --config "p/golang"`, or `golangci-lint run --enable-all`.
  - Secrets: `gitleaks detect --source .`, `trufflehog filesystem .` with Go-specific patterns.
  - Build security: verify `go.sum` integrity, check for unsafe package usage, and validate module proxies.

- **Java**
  - Dependency audit: `mvn org.owasp:dependency-check-maven:check`, `gradle dependencyCheckAnalyze`, `snyk test`, or `trivy fs .`.
  - SAST: `spotbugs`, `find-sec-bugs`, `semgrep --config "p/java"`, or `sonarqube-scanner`.
  - Secrets: `gitleaks detect --source .`, `detect-secrets scan` with Java-specific patterns.
  - Build security: verify Maven/Gradle wrapper integrity, check for vulnerable JARs, and validate dependency resolution.

- **.NET / C#**
  - Dependency audit: `dotnet list package --vulnerable`, `snyk test`, `trivy fs .`, or `nuget audit`.
  - SAST: `security-scan`, `semgrep --config "p/csharp"`, `sonarqube-scanner`, or `puma-scan`.
  - Secrets: `gitleaks detect --source .`, `detect-secrets scan` with .NET-specific patterns.
  - Configuration: validate `appsettings.json`, connection strings, and Azure Key Vault integration.

- **Ruby**
  - Dependency audit: `bundle audit check`, `snyk test`, `trivy fs .`, or `bundler-audit check`.
  - SAST: `brakeman -f json`, `semgrep --config "p/ruby"`, or `rubocop --require rubocop-security`.
  - Secrets: `gitleaks detect --source .`, `detect-secrets scan` with Ruby-specific patterns.
  - Configuration: validate `Gemfile.lock` integrity and check for vulnerable gems.

Keep language-specific commands in `.cursor/rules/` so `/security` selects the right profile automatically.

---

## High-Level Flow

1. **Context Detection**
   - Identify current ticket and change scope via staged diff or `tasks/<ticket>/` contents.
   - Load security-related rules from `.cursor/rules/` (`security-standards.mdc`, `dependency-policy.mdc`, etc.) and any instructions under `.github/instructions/security.*`.

2. **Environment Preparation**
   - Ensure required CLIs are installed (e.g., `npm install --no-save @snyk/cli` or `pip install safety`) as directed by rules.
   - Set environment variables for API tokens (Snyk, OWASP ZAP, Trivy). Prompt the user if credentials are missing.

3. **Execution Stages**
   - **Dependency Audit**: Run tools like `npm audit --json`, `yarn audit`, `snyk test`, `pip-audit`, `safety check`, `trivy fs`, governed by project rules. Include transitive dependency analysis and verify lock file integrity.
   - **License Compliance** (if `--licenses`): Check dependency licenses using `license-checker`, `fossa analyze`, `snyk test --severity-threshold=high`, or `cyclonedx-bom` to flag incompatible or restricted licenses per project policy.
   - **SBOM Generation** (if `--sbom`): Generate Software Bill of Materials using `cyclonedx-bom`, `syft packages`, `trivy fs --format cyclonedx`, or `spdx-sbom-generator` in SPDX or CycloneDX format for supply chain transparency.
   - **Static Application Security Testing (SAST)**: Execute analyzers such as `semgrep`, `bandit`, `eslint --ext .ts --config security`, `pnpm dlx depcheck`, etc., limited to the specified paths or diff. Include checks for:
     - Injection vulnerabilities (SQL, NoSQL, command, LDAP, XPath, etc.)
     - Insecure deserialization
     - XML external entities (XXE)
     - Broken authentication/authorization patterns
     - Sensitive data exposure
     - Security misconfiguration
     - Cross-site scripting (XSS)
     - Insecure direct object references
     - Server-side request forgery (SSRF)
     - Log injection and insecure logging
   - **Secret Scanning**: Run utilities like `gitleaks detect`, `detect-secrets scan`, or `trufflehog filesystem`. Honor custom allowlists from rules. Check git history, environment files, config files, and CI/CD pipelines.
   - **Configuration Security** (if `--config`): Validate configuration files for:
     - Hardcoded secrets or credentials
     - Insecure default values
     - Missing security headers or CSP policies
     - Weak encryption settings
     - Overly permissive permissions
     - Environment variable exposure
     - Secrets management integration (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
   - **API Security** (if `--api`): Perform API-specific checks:
     - OpenAPI/Swagger security validation (`swagger-security-audit`, `spectral lint`)
     - Rate limiting implementation verification
     - Authentication/authorization flow validation
     - Input validation and sanitization
     - GraphQL security (`graphql-cop`, `inql`)
     - API versioning and deprecation policies
     - CORS configuration validation
   - **Security Headers** (if `--headers`): Validate HTTP security headers using `securityheaders.com` API, `curl` checks, or `header-checker`:
     - Content-Security-Policy (CSP)
     - Strict-Transport-Security (HSTS)
     - X-Frame-Options
     - X-Content-Type-Options
     - Referrer-Policy
     - Permissions-Policy
     - Cross-Origin-Embedder-Policy (COEP)
     - Cross-Origin-Opener-Policy (COOP)
   - **Cryptography Audit** (if `--crypto`): Review cryptographic implementations:
     - Weak or deprecated algorithms (MD5, SHA1, DES, RC4, etc.)
     - Insecure random number generation
     - Hardcoded keys or weak key derivation
     - Missing encryption at rest/transit
     - Certificate validation issues
     - Key management and rotation policies
   - **Container Security** (if `--containers`): Scan container images and Dockerfiles:
     - Image vulnerability scanning (`trivy image`, `docker scout`, `snyk container test`)
     - Dockerfile best practices (`hadolint`, `checkov`)
     - Base image security (distroless, minimal images)
     - Image signing and provenance verification
     - Runtime security configuration
   - **Infrastructure / Compliance** (optional): Invoke `tfsec`, `checkov`, `cfn-nag`, or policy-as-code checks for IaC files when enabled. Include:
     - Cloud provider security misconfigurations
     - Network security groups and firewall rules
     - IAM role and policy validation
     - Encryption settings (at rest and in transit)
     - Compliance frameworks (SOC2, PCI-DSS, HIPAA, GDPR) when `--compliance` is set
   - **Database Security**: Check for:
     - SQL injection vulnerabilities
     - Insecure database connections
     - Missing encryption for sensitive data
     - Overly permissive database permissions
     - Database credential management
   - **Logging & Monitoring Security**: Validate:
     - Sensitive data in logs (PII, credentials, tokens)
     - Log injection vulnerabilities
     - Secure log storage and retention policies
     - Log access controls
   - **Dynamic / API Security** (optional): If `--dast` provided, run OWASP ZAP, Burp automation, or REST fuzzers against the supplied endpoint with rate limiting as defined in rules. Include:
     - Authentication bypass attempts
     - Authorization testing
     - Session management validation
     - Input fuzzing
     - API endpoint discovery
     - Security header validation

4. **Result Aggregation**
   - Collect outputs (stdout, JSON, SARIF) into `tasks/<ticket>/security/`.
   - Normalize severity (Critical/High/Medium/Low) based on tool exit codes or reported CVSS.
   - De-duplicate findings using fingerprint/baseline comparisons when available.
   - Translate new findings into actionable remediation tasks with severity tags and file/config references.

5. **Reporting**
   - Update or create `tasks/<ticket>/security.md` summarizing findings, impacted files, CVEs, and remediation guidance.
   - Populate a machine-actionable `## Task List` (numbered checkboxes) so `/implement` can drive remediation directly from the report.
   - If critical issues are present, mark workflow status as blocked until resolved.

---

## Language & Framework Security Notes

### TypeScript / Node.js / React

- Pair `npm audit --json`, `snyk test`, or `pnpm audit` with dependency monitoring and lockfile hygiene; block merges on unfixed Critical/High issues.
- Run `semgrep --config "p/nodejs"` (or OWASP Top Ten bundles) plus `eslint --ext .ts,.tsx --config .eslintrc.security` with plugins like `eslint-plugin-security` to flag injection, unsafe regex, or insecure eval usage.
- Enforce runtime guardrails: apply `helmet`, strict CSP headers, CSRF protections for stateful apps, rate limiting, and secure cookie settings (`httpOnly`, `SameSite=strict`).
- Sanitize HTML/Markdown before rendering (`DOMPurify`, `sanitize-html`) and audit third-party scripts; prefer token-based auth with rotating secrets in managed vaults.

### Laravel (PHP)

- Keep Composer dependencies updated (`composer update --dry-run`, `composer audit`, Snyk/Huntr integrations) and require `APP_KEY` rotation as part of release playbooks.
- Enforce mass-assignment guards (`$fillable`/`$guarded`), request validation, CSRF middleware, and rate limiting on auth or API routes.
- Disable `APP_DEBUG` and verbose error handlers outside non-production tiers; review queue/cron artisan commands for serialization risks.
- Scan with `semgrep --config "p/php"`, `phpcs-security-audit`, or Laravel-specific SAST rules; store credentials in `.env` with tight file permissions and rotate database/API credentials regularly.

### Android (Kotlin)

- Automate `./gradlew lint`, `detekt`, and OWASP Dependency-Check (`./gradlew dependencyCheckAnalyze`) in CI; integrate Play Integrity or SafetyNet attestation for high-trust flows.
- Require HTTPS with modern TLS (Network Security Config), pin certificates where feasible, and prevent backup/debuggable flags in release builds.
- Store secrets via `EncryptedSharedPreferences`, Android Keystore, or remote config; prohibit storing access tokens in plaintext local storage or logs.
- Run mobile SAST/DAST suites (`mobSF`, `qark`, `snyk code android-kotlin`) on release candidates and review third-party SDK permissions/telemetry scopes.

### iOS (Swift)

- Add `xcodebuild analyze`, `swiftlint --config .swiftlint-security.yml`, and Snyk/OWASP Dependency-Check for Swift Package Manager or CocoaPods dependencies to CI quality gates.
- Enforce App Transport Security (ATS), Strict Transport Security on APIs, and certificate pinning for sensitive traffic; prefer `URLSession` with `ephemeral` configuration for auth flows.
- Store credentials/API keys in Keychain or the Secure Enclave; avoid hard-coded secrets and strip debugging symbols/logs from production builds.
- Review insecure Objective-C bridging, dynamic method dispatch, or improper `NSCoding` usage; validate jailbreak/root detection requirements via `mobSF` or manual penetration testing.

### QA Automation (Selenium)

- Run WebDriver-based suites in isolated service accounts with scoped credentials; rotate passwords/tokens and restrict CI secrets to read-only test data where possible.
- Sanitize log output to avoid leaking session IDs, JWTs, or personally identifiable test fixtures; mask sensitive values in screenshots or video artifacts.
- Validate TLS certificates and enforce HTTPS in test harnesses; prevent the use of insecure capabilities (`acceptInsecureCerts`) outside controlled environments.
- Harden grid infrastructure: segment Selenium Grid hubs/nodes, patch browsers and drivers regularly, and restrict remote execution endpoints with authentication and IP allowlists.

### QA Automation (Playwright)

- Keep browsers and Playwright versions pinned and updated; run `npx playwright install --with-deps` during CI to ensure patched binaries.
- Enable tracing selectively with redaction for secrets and personally identifiable information; purge traces/screenshots after retention requirements.
- Use `playwright config` to enforce HTTPS, strict context isolation, and per-test storage states; avoid reusing authenticated storage across suites without encryption.
- Execute Playwright workers in sandboxed containers or ephemeral CI agents, and validate that environment variables passed to tests contain no production secrets.

### Containers & Kubernetes

- Scan container images with `trivy image`, `docker scout`, or `snyk container test` before deployment; enforce image signing and verify base image provenance.
- Use minimal base images (distroless, alpine) and scan Dockerfiles with `hadolint` or `checkov` for security misconfigurations; avoid running containers as root.
- Validate Kubernetes manifests with `kube-score`, `kubescape`, or `kubeaudit` for RBAC misconfigurations, network policies, and pod security standards.
- Enforce network policies, limit service account permissions, and use secrets management (Kubernetes secrets, external secret operators) instead of hardcoded credentials.
- Scan Helm charts with `checkov` or `helm template | kube-score`; validate values files for security settings.

### CI/CD Pipeline Security

- Scan CI/CD configuration files (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc.) for:
  - Hardcoded secrets or credentials
  - Insecure pipeline permissions
  - Missing approval gates for production deployments
  - Insecure artifact handling
  - Dependency confusion risks
- Validate pipeline secrets are sourced from secure stores (GitHub Secrets, GitLab CI/CD variables, HashiCorp Vault).
- Ensure build artifacts are scanned before promotion; verify SBOM generation and attestation for supply chain security.
- Review pipeline logs for sensitive data exposure; implement log redaction and retention policies.

### Data Protection & Privacy

- Validate PII/PHI handling: check for proper data masking, encryption, and access controls; verify GDPR/CCPA compliance when applicable.
- Review data retention policies and deletion mechanisms; ensure sensitive data is not logged or exposed in error messages.
- Validate encryption at rest and in transit; check for weak cipher suites or missing TLS configuration.
- Review data access patterns: ensure least privilege access, audit logging for sensitive operations, and proper data classification.

### Access Control & Authentication

- Validate authentication mechanisms: check for weak password policies, missing MFA enforcement, and insecure session management.
- Review authorization checks: ensure proper RBAC/ABAC implementation, validate privilege escalation prevention, and check for insecure direct object references.
- Verify token management: validate JWT signing/verification, check token expiration and rotation policies, and ensure secure token storage.
- Review API authentication: validate API key management, OAuth2/OIDC implementation, and rate limiting on auth endpoints.

### Network Security

- Validate TLS/SSL configuration: check certificate validity, cipher suite strength, and TLS version (prefer TLS 1.2+).
- Review network security policies: validate firewall rules, network segmentation, and ingress/egress controls.
- Check for insecure network protocols (HTTP, FTP, Telnet) and ensure secure alternatives are used.
- Validate DNS security: check for DNS over HTTPS (DoH) or DNS over TLS (DoT) where applicable.

### Compliance & Regulatory

- When `--compliance` is set, include checks for:
  - **GDPR**: Data protection impact assessments, right to erasure, data portability, consent management.
  - **HIPAA**: PHI encryption, access controls, audit logging, breach notification procedures.
  - **PCI-DSS**: Cardholder data protection, secure payment processing, network segmentation.
  - **SOC 2**: Access controls, encryption, monitoring, incident response.
  - **OWASP Top 10**: Ensure all categories are covered in SAST/DAST scans.
- Generate compliance reports and evidence artifacts for audit purposes.

---

## Output Structure (`tasks/<ticket>/security.md`)

```markdown
# Security Scan: <ticket or slug>

**Executed By**: <actor>
**Date**: <timestamp>
**Scope**: <paths/modules or `--dast` target>
**Scan Duration**: <time>
**Tools Executed**: <list>

---

## Task List

- [ ] 1.0 🔴 <highest severity remediation task> (`<file>`:<line> or config reference)
- [ ] 2.0 🟠 <next remediation task with actionable guidance>
  - [ ] 2.1 <subtask when remediation requires multiple steps (e.g., patch + verification)>
- [ ] 3.0 🟡 <medium-severity follow-up>
- [ ] 4.0 ✅ <verification command to re-run specific tool/tests>

> Tasks must reference affected files/configs or commands, remain scoped to single concerns, and follow the numbered checklist format so `/implement` can mark completion without restructuring.

---

## Executive Summary

- **Overall Status**: ✅ Pass / ⚠️ Warning / ❌ Blocked
- **Critical**: <count>
- **High**: <count>
- **Medium**: <count>
- **Low**: <count>
- **Info**: <count>

## Detailed Findings

### Critical & High Severity Issues

- `<tool>` — `<severity>` — `<title>` (`<file>`:<line>)
  - **Impact**: <description>
  - **Remediation**: <suggested fix>
  - **Reference**: <CVE/CWE/link>
  - **CVSS Score**: <score> (if available)

### Medium & Low Severity Issues

- `<tool>` — `<severity>` — `<title>` (`<file>`:<line>)
  - **Impact**: <description>
  - **Remediation**: <suggested fix>
  - **Reference**: <CVE/CWE/link>

## Dependency Health

- **Tool**: `<command>`
- **Vulnerabilities**: Critical <n> | High <n> | Medium <n> | Low <n>
- **Total Dependencies**: <count>
- **Vulnerable Dependencies**: <count>
- **Notes**: <upgrade or mitigation guidance>
- **Lock File Integrity**: ✅ Verified / ⚠️ Issues Found

## License Compliance (if `--licenses`)

- **Tool**: `<command>`
- **Policy Violations**: <count>
- **Restricted Licenses Found**: <list>
- **Action Required**: <guidance>

## SBOM (if `--sbom`)

- **Format**: SPDX / CycloneDX
- **File**: `tasks/<ticket>/security/sbom.spdx.json`
- **Components**: <count>
- **Status**: ✅ Generated

## Secret Scan

- **Tool**: `<tool>`
- **Result**: <count> secrets found
- **Status**: ✅ Clean / ⚠️ Review Required
- **Findings**: <list with redacted values>
- **Notes**: <false-positive rationale or remediation steps>

## SAST Findings

- **Tools Executed**: <list>
- **Total Issues**: <count>
- **By Category**:
  - Injection: <count>
  - Authentication: <count>
  - Authorization: <count>
  - Cryptography: <count>
  - Data Exposure: <count>
  - Security Misconfiguration: <count>
  - Other: <count>

## Configuration Security (if `--config`)

- **Issues Found**: <count>
- **Key Findings**: <summary>
- **Secrets Management**: ✅ Validated / ⚠️ Issues Found

## API Security (if `--api`)

- **OpenAPI Validation**: ✅ Pass / ⚠️ Issues Found
- **Rate Limiting**: ✅ Implemented / ⚠️ Missing
- **Authentication**: ✅ Validated / ⚠️ Issues Found
- **Findings**: <summary>

## Security Headers (if `--headers`)

- **CSP**: ✅ Present / ⚠️ Missing or Weak
- **HSTS**: ✅ Present / ⚠️ Missing
- **X-Frame-Options**: ✅ Present / ⚠️ Missing
- **Other Headers**: <status>
- **Recommendations**: <guidance>

## Cryptography Audit (if `--crypto`)

- **Weak Algorithms Found**: <count>
- **Key Management**: ✅ Validated / ⚠️ Issues Found
- **Encryption**: ✅ Validated / ⚠️ Issues Found
- **Findings**: <summary>

## Container Security (if `--containers`)

- **Images Scanned**: <count>
- **Vulnerabilities**: Critical <n> | High <n> | Medium <n> | Low <n>
- **Dockerfile Issues**: <count>
- **Base Image Security**: ✅ Validated / ⚠️ Issues Found

## Infrastructure / Compliance (if enabled)

- **IaC Issues**: <count>
- **Cloud Misconfigurations**: <count>
- **Compliance Status**: ✅ Compliant / ⚠️ Issues Found
- **Findings**: <summary>

## DAST / Dynamic Testing (if run)

- **Target**: `<url>`
- **Duration**: <time>
- **Findings**: <summary>
- **Critical Issues**: <count>
- **Logs**: `<artifact path>`

## Data Protection & Privacy

- **PII/PHI Handling**: ✅ Validated / ⚠️ Issues Found
- **Encryption**: ✅ Validated / ⚠️ Issues Found
- **Access Controls**: ✅ Validated / ⚠️ Issues Found
- **Compliance**: <GDPR/HIPAA/CCPA status>

## Artifacts Generated

- SARIF: `tasks/<ticket>/security/results.sarif`
- JSON: `tasks/<ticket>/security/results.json`
- SBOM: `tasks/<ticket>/security/sbom.spdx.json` (if generated)
- Logs: `tasks/<ticket>/security/scan.log`

## Next Steps

1. **Immediate Actions**: Address critical/high findings before `/review` or merge.
2. **Follow-up**: Log tickets for accepted medium/low risks with remediation timeline.
3. **Verification**: Re-run `/security` after fixes to verify closure.
4. **Documentation**: Update security documentation if new patterns or risks are identified.
```

---

## Quality Gates

- Tools executed match project rules and provided flags.
- Critical/high issues surface clear remediation paths or linked tickets.
- Secret scan results are triaged (true positive vs. allowlisted) with rationale.
- SARIF/JSON outputs stored under `tasks/<ticket>/security/` for CI ingestion.
- Workflow stops on critical issues unless the user explicitly overrides.
- SBOM generated when `--sbom` flag is provided (required for supply chain security).
- License compliance validated when `--licenses` flag is provided.
- All findings include CVSS scores, CVE/CWE references, and remediation guidance where available.
- Container images scanned before deployment when `--containers` flag is provided.
- Security headers validated when `--headers` flag is provided.
- Configuration security validated when `--config` flag is provided.
- Cryptographic implementations audited when `--crypto` flag is provided.
- `## Task List` populated with numbered checkboxes, severity cues, and actionable references so `/implement` can execute remediation without restructuring.

---

## Reviewer Handoff

- Reference the `/security` run in the `/review` findings so reviewers know security tooling already passed.
- Attach or link the generated `tasks/<ticket>/security.md` summary (or SARIF artifacts) when requesting review.
- If the scan flags Critical/High items, label the change as blocked and note remediation steps before asking for review.

---

## Workflow Placement

```text
/plan → /implement → **/security** → /review → /commit
```

`/security` can also run on a schedule or CI job, but when invoked locally it empowers authors to remediate vulnerabilities before reviewers inherit them.
