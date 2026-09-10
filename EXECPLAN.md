# Deliver a cloud appointment monitor for the NUDCH portal

This ExecPlan (execution plan) is a living document. The sections `Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Status: COMPLETE

## Purpose / big picture

The user needs a five-minute cloud check of the public NUDCH page for Psychiatric Clinic 03. When a reservable appointment appears, the monitor sends an ntfy push and creates an idempotent GitHub Issue assigned to the user; GitHub can deliver that assignment by email. A public GitHub Actions workflow runs the check without requiring the user's computer to remain on. The monitor never books an appointment and never submits personal or medical data.

## Constraints

- Monitor only `https://portal.nudch.eu/workplaces/reservation?idf=nuo4|2958571&step=2` by default.
- Do not automate booking, authentication, or entry of patient data.
- Keep the unguessable ntfy topic in GitHub Secrets; never log or commit it.
- Treat loading, 404, and unfamiliar page content as errors rather than availability.
- Persist an available state only after GitHub delivery and, when configured, ntfy delivery succeed.
- Run on Node.js 22 with a standard GitHub-hosted Ubuntu runner.

## Tolerances (exception triggers)

- Scope: stop if the implementation needs more than 20 project files or 1,200 net lines.
- Dependencies: Playwright is the only external runtime dependency; ntfy and GitHub use Node's built-in HTTP client.
- Iterations: stop if the automated suite remains failing after three focused repair attempts.
- External state: do not create or publish a GitHub repository without authenticated tooling and a final local verification.
- Ambiguity: use the approved defaults of public GitHub Actions, ntfy plus GitHub email, five-minute checks, transition-based deduplication, and no automatic booking.

## Risks

- Risk: the portal briefly renders a loading or 404 shell before its real content. Severity: high. Likelihood: high. Mitigation: wait for the clinic identity plus a final availability marker and reject transient content.
- Risk: the portal changes wording or markup. Severity: medium. Likelihood: medium. Mitigation: use multiple semantic signals, bounded diagnostics, fixtures, and a three-failure health alert.
- Risk: GitHub disables schedules after public-repository inactivity. Severity: high. Likelihood: medium. Mitigation: update a tracked monthly heartbeat through the scheduled workflow.
- Risk: scheduled jobs may start later than their nominal time. Severity: medium. Likelihood: medium. Mitigation: document that five minutes is the requested cadence, not a real-time guarantee.
- Risk: ntfy has no uptime SLA and GitHub email timing depends on account settings. Severity: high. Likelihood: low. Mitigation: require idempotent GitHub Issues, keep ntfy optional, and save state only after configured deliveries succeed.

## Progress

- [x] (2026-09-09 16:32Z) Verified the empty workspace and available Node.js runtime.
- [x] (2026-09-09 16:32Z) Verified live target and comparison-page signals in the public portal.
- [x] (2026-09-09 16:34Z) Created tests and captured the expected missing-module failing baseline.
- [x] (2026-09-09 16:41Z) Implemented detection, state transitions, Playwright probing, CLI orchestration, and the revised ntfy plus GitHub notification adapters.
- [x] (2026-09-09 17:24Z) Added GitHub Actions scheduling, monthly heartbeat, documentation, and secret handling.
- [x] (2026-09-09 17:25Z) Passed 18 tests, a zero-vulnerability audit, target and comparison live smoke checks, and heartbeat idempotence.
- [x] (2026-09-09 18:17Z) Published the public repository and completed successful dry and live workflow runs.
- [x] (2026-09-10 18:00Z) Measured only 6 GitHub-scheduled checks in the preceding 24 hours instead of roughly 240 requested checks.
- [x] (2026-09-10 18:10Z) Added externally dispatched run identification, report accounting, tests, and cron-job.org setup documentation.
- [x] (2026-09-10 18:12Z) Created a non-expiring fine-grained token restricted to the monitor repository with Actions read/write only, then created and tested both cron-job.org jobs with HTTP 204 responses.
- [x] (2026-09-10 18:28Z) Verified three consecutive automatic external monitor runs at six-minute intervals and one external daily-report run, all successful.
- [x] (2026-09-10 18:30Z) Removed native GitHub schedules to prevent duplicate checks and completed final validation.

## Surprises & discoveries

- Observation: the target initially exposed a 404/loading accessibility tree while its final DOM later rendered the correct clinic. Evidence: a delayed DOM read showed Psychiatric Clinic 03 and "Kontaktujte nás telefonicky". Impact: a response-status or first-render check would create false failures.
- Observation: GitHub CLI is not installed and the directory is not a Git repository. Evidence: `gh --version` was unavailable and `git rev-parse` failed. Impact: local delivery can be completed, but publication needs another authenticated path or user action.
- Observation: Playwright 1.55.0 is affected by GHSA-7mvr-c777-76hp. Evidence: `npm audit` reported a high-severity direct dependency issue fixed after 1.55.0. Impact: the dependency is upgraded to 1.63.0 before any browser installation.
- Observation: the initial layout reached the 20-file tolerance only after consolidating three small runtime helpers and one test file. Evidence: the final inventory reports exactly 20 non-generated project files. Impact: behavior remains separated by responsibility without exceeding the approved scope.
- Observation: the explicit six-minute GitHub schedule produced only 6 scheduled runs in a 24-hour window. Evidence: the public Actions API returned six completed `schedule` runs between 2026-09-09 and 2026-09-10, all successful. Impact: GitHub's native scheduler is unsuitable as the primary trigger for this time-sensitive monitor.

## Decision log

- Decision: use rendered body text rather than the portal's undocumented private backend API. Rationale: the public semantic signals are verified and Playwright provides a maintainable fallback when the API changes. Date/Author: 2026-09-09, Codex.
- Decision: keep transition logic pure and inject notification/persistence functions. Rationale: this makes delivery-order guarantees and retries testable without network access. Date/Author: 2026-09-09, Codex.
- Decision: persist only meaningful state changes and a monthly heartbeat. Rationale: this avoids a commit every five minutes while retaining deduplication and repository activity. Date/Author: 2026-09-09, Codex.
- Decision: replace Telegram with ntfy push plus an assigned GitHub Issue. Rationale: the user cannot use Telegram; two independent channels reduce the risk of missing a time-sensitive slot. Date/Author: 2026-09-09, Codex.
- Decision: create or find the idempotent GitHub Issue before sending ntfy. Rationale: if ntfy fails, the retry will not create a duplicate Issue/email. Date/Author: 2026-09-09, Codex.
- Decision: pin Playwright 1.63.0 instead of the initially planned 1.55.0. Rationale: it is the current version returned by npm and removes the browser-download certificate advisory. Date/Author: 2026-09-09, Codex.
- Decision: make ntfy optional while GitHub Issue/email remains required. Rationale: the monitor operates immediately without a new secret, and ntfy can be enabled later as an independent push channel. Date/Author: 2026-09-09, Codex.
- Decision: use cron-job.org to call GitHub workflow dispatch with a fine-grained token restricted to this repository and Actions write permission. Rationale: the monitor code and secret notification configuration stay in GitHub while scheduling no longer depends on GitHub's best-effort cron. Date/Author: 2026-09-10, Codex.
- Decision: mark external monitor runs through a boolean dispatch input and stable run name. Rationale: the daily report can count automatic external runs without incorrectly counting manual tests. Date/Author: 2026-09-10, Codex.

## Outcomes & retrospective

The monitor is implemented and published at `test90042/nudch-appointment-monitor`. GitHub's native scheduler produced only six checks in 24 hours, so cron-job.org now dispatches the monitor every six minutes and the daily report at 08:15 Europe/Bratislava. Both test requests returned HTTP 204; three consecutive scheduled monitor runs and one daily-report run completed successfully. The native schedules were removed to prevent duplicates. The external credential has no expiration but is restricted to this single repository and Actions read/write.

## Context and orientation

The repository started empty. `src/detect.js` classifies rendered portal text. `src/transition.js` decides state and notifications. `src/probe.js` renders the page with Chromium. `src/github.js`, `src/ntfy.js`, and `src/notifier.js` deliver notifications. `src/runner.js` and `src/cli.js` orchestrate one check. `.github/workflows/monitor.yml` runs it every five minutes and commits meaningful state changes.

## Plan of work

Add an explicit external-dispatch marker and stable run name, teach the daily report to count those runs while excluding manual checks, test the behavior, and publish it. Create two cron-job.org tasks using a fine-grained GitHub token: a six-minute monitor dispatch and a daily report dispatch. Verify the external path before removing the unreliable native GitHub schedules.

## Concrete steps

From `D:\Projects\Private\nudch_bot`, run `npm test` and expect all tests to pass. Run `npm run check -- --dry-run` and expect one JSON line whose result is `unavailable` for the current target, without a notification request. Run `npm run heartbeat` twice and expect the second run not to change `heartbeat.txt`.

## Validation and acceptance

- Tests: every parser, transition, delivery-order, and heartbeat test passes with `npm test`.
- Live behavior: a dry run reaches a final target-page result and does not require notification credentials.
- Security: the repository contains no ntfy topic, account credential, patient data, or booking automation.
- Workflow: YAML contains five-minute schedule, manual dry-run input, concurrency control, required secrets, Chromium install, and guarded state commit.

## Idempotence and recovery

All checks are read-only against NUDCH. Re-running a check with unchanged availability produces no duplicate alert. If notification fails, state is not persisted and a later run retries. The heartbeat writes one stable `YYYY-MM` value per month, so repeated runs are no-ops.

## Artifacts and notes

The final evidence will record the automated test count and the live dry-run classification. No screenshots or portal response bodies containing unrelated information will be committed.

## Interfaces and dependencies

`detectAvailability(text, targetUrl)` returns `{status, clinic, appointment, fingerprint, reason}`. `transitionState(previous, observation, checkedAt)` returns `{nextState, notifications}` with a stable notification key. `processObservation(options)` sends notifications in order and persists the next state only after delivery succeeds. `probePortal(options)` returns the rendered text and classification. Playwright is the sole package dependency; Node's built-in `fetch`, test runner, and filesystem APIs cover the rest.

Revision note: Telegram was replaced with ntfy plus GitHub Issue/email after the user reported that Telegram was unavailable. Playwright was upgraded to 1.63.0 in response to a high-severity audit finding. On 2026-09-10 the plan was reopened because the native GitHub scheduler produced only six checks in 24 hours; an external cron-job.org dispatch is now the intended production trigger.
