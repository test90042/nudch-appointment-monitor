# Deliver a cloud appointment monitor for the NUDCH portal

This ExecPlan (execution plan) is a living document. The sections `Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Status: COMPLETE

## Purpose / big picture

The user needs a six-minute cloud check of the public NUDCH page for Psychiatric Clinic 03. The monitor must reject a wrong clinic or changed target URL, but must favor alerting when either appointment marker appears: failure to parse a date or time cannot suppress a possible-slot notification. Any genuine probe or identity error is reported immediately once, with a recovery notification later. cron-job.org starts the GitHub workflow without requiring the user's computer to remain on. The monitor never books an appointment and never submits personal or medical data.

## Constraints

- Monitor only `https://portal.nudch.eu/workplaces/reservation?idf=nuo4|2958571&step=2` by default.
- Do not automate booking, authentication, or entry of patient data.
- Keep the unguessable ntfy topic in GitHub Secrets; never log or commit it.
- Require the exact portal host, path, `idf=nuo4|2958571`, `step=2`, and clinic identity `Psychiatrická ambulancia 03 (MUDr. Böhmer)` after navigation.
- Treat loading, 404, wrong identity, and unfamiliar content without appointment markers as errors rather than availability.
- Treat either `Najbližší termín` or `Rezervovať termín` as possible availability even when a complete date and time cannot be parsed.
- Persist an available state only after GitHub delivery and, when configured, ntfy delivery succeed.
- Run on Node.js 22 with a standard GitHub-hosted Ubuntu runner.

## Tolerances (exception triggers)

- Scope: stop if this revision needs more than 10 modified project files or 250 net lines.
- Dependencies: Playwright is the only external runtime dependency; ntfy and GitHub use Node's built-in HTTP client.
- Iterations: stop if the automated suite remains failing after three focused repair attempts.
- External state: do not create or publish a GitHub repository without authenticated tooling and a final local verification.
- Ambiguity: use the approved defaults of cron-job.org dispatching every six minutes, ntfy plus GitHub email, transition-based deduplication, immediate error alerting, and no automatic booking.

## Risks

- Risk: the portal briefly renders a loading or 404 shell before its real content. Severity: high. Likelihood: high. Mitigation: wait for the clinic identity plus a final availability marker and reject transient content.
- Risk: the portal changes wording or markup. Severity: high. Likelihood: medium. Mitigation: either appointment marker produces a deduplicated urgent alert even without a parsed date/time; all other recognition failures produce an immediate service alert.
- Risk: a redirect or configuration typo points at another clinic. Severity: high. Likelihood: low. Mitigation: validate both requested and final URLs by decoded query values and require the exact normalized clinic name.
- Risk: cron-job.org or GitHub workflow dispatch becomes unavailable. Severity: high. Likelihood: low. Mitigation: retain daily run accounting, cron-job.org history, GitHub Actions history, and immediate monitor error alerts once the workflow starts.
- Risk: scheduled jobs may start later than their nominal time. Severity: medium. Likelihood: low. Mitigation: document that six minutes is the requested cadence, not a real-time guarantee.
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
- [x] (2026-09-10 19:05Z) Confirmed by live probe that the current target resolves to `Psychiatrická ambulancia 03 (MUDr. Böhmer)` and decoded `idf=nuo4|2958571`, but found the existing clinic regex was broader than the intended identity.
- [x] (2026-09-10 19:12Z) Added failing fixtures for wrong URL, redirect, wrong clinic, single appointment markers, partial parsing, immediate error alerting, and partial notification formatting; the baseline failed in the expected nine places.
- [x] (2026-09-10 19:16Z) Implemented strict identity validation and fail-safe possible-slot observations without adding dependencies; all 28 tests passed.
- [x] (2026-09-10 19:17Z) Completed a live dry run that returned the exact clinic and telephone-only state; `npm audit` reported zero vulnerabilities.
- [x] (2026-09-10 19:22Z) Published commit `c968678` and verified external run `34519890612` used that commit and completed successfully.

## Surprises & discoveries

- Observation: the target initially exposed a 404/loading accessibility tree while its final DOM later rendered the correct clinic. Evidence: a delayed DOM read showed Psychiatric Clinic 03 and "Kontaktujte nás telefonicky". Impact: a response-status or first-render check would create false failures.
- Observation: GitHub CLI is not installed and the directory is not a Git repository. Evidence: `gh --version` was unavailable and `git rev-parse` failed. Impact: local delivery can be completed, but publication needs another authenticated path or user action.
- Observation: Playwright 1.55.0 is affected by GHSA-7mvr-c777-76hp. Evidence: `npm audit` reported a high-severity direct dependency issue fixed after 1.55.0. Impact: the dependency is upgraded to 1.63.0 before any browser installation.
- Observation: the initial layout reached the 20-file tolerance only after consolidating three small runtime helpers and one test file. Evidence: the final inventory reports exactly 20 non-generated project files. Impact: behavior remains separated by responsibility without exceeding the approved scope.
- Observation: the explicit six-minute GitHub schedule produced only 6 scheduled runs in a 24-hour window. Evidence: the public Actions API returned six completed `schedule` runs between 2026-09-09 and 2026-09-10, all successful. Impact: GitHub's native scheduler is unsuitable as the primary trigger for this time-sensitive monitor.
- Observation: the URL parser preserves `nuo4|2958571` as one decoded `idf` query value, and the live page currently exposes the exact intended clinic. Evidence: a Node URL parse and live Playwright dry run on 2026-09-10. Impact: the pipe is safe, but explicit semantic URL and clinic checks will guard future drift.

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
- Decision: classify an observation as available when either appointment marker is visible, using `confidence=possible` if date or time is incomplete. Rationale: a false-positive alert is safer than missing a time-sensitive slot because portal markup changed. Date/Author: 2026-09-10, Codex.
- Decision: send an outage notification on the first genuine error and deduplicate subsequent errors until recovery. Rationale: the user explicitly requested notification when parsing or checking fails, while deduplication avoids six-minute alert spam. Date/Author: 2026-09-10, Codex.
- Decision: revise this milestone's file tolerance from eight to ten existing files while retaining the 250-net-line limit. Rationale: strict URL validation, parsing, transition behavior, notification formatting, their three focused test suites, CLI diagnostics, and two living documents span ten existing files; no new module or dependency is introduced and the net change remains below the line tolerance. Date/Author: 2026-09-10, Codex.

## Outcomes & retrospective

The external scheduler remains operational with strict identity checks. The monitor now validates the configured and final URLs by host, path, decoded `idf`, and `step`, then requires the exact clinic identity. Either appointment marker results in availability: complete signals and date/time are `confirmed`, while any missing marker or value is `possible` and still generates an urgent notification. Genuine errors alert once immediately and a later successful check sends recovery. Twenty-eight tests, a zero-vulnerability audit, a live telephone-only dry run, and external run `34519890612` all succeeded.

## Context and orientation

The repository started empty. `src/detect.js` validates the exact target and classifies rendered portal text. `src/transition.js` decides state and notifications. `src/probe.js` renders the page with Chromium and supplies the final post-navigation URL. `src/github.js`, `src/ntfy.js`, and `src/notifier.js` deliver notifications. `src/runner.js` and `src/cli.js` orchestrate one check. cron-job.org dispatches `.github/workflows/monitor.yml` every six minutes, and the workflow commits meaningful state changes.

## Plan of work

First add fixtures that demonstrate the stricter identity and fail-safe notification rules. Then update `src/detect.js` to validate URL identity and return confirmed or possible availability, `src/probe.js` to pass the post-navigation URL, `src/transition.js` to alert on the first error, and `src/notifier.js` to format partial appointment data safely. Update user-facing documentation, run all tests and a live dry run, publish, and verify cron-job.org starts the new commit.

## Concrete steps

From `D:\Projects\Private\nudch_bot`, run `npm test` and expect every detector, transition, notifier, report, and heartbeat test to pass. Run `node src/cli.js --dry-run` and expect `result=unavailable`, the exact clinic name, and no notification or state write. After pushing, query the Actions API and expect an `External scheduled check` on the new commit with conclusion `success`.

## Validation and acceptance

- Tests: every parser, transition, delivery-order, and heartbeat test passes with `npm test`.
- Live behavior: a dry run reaches a final target-page result and does not require notification credentials.
- Security: the repository contains no ntfy topic, account credential, patient data, or booking automation.
- Workflow: external dispatch remains enabled with manual dry-run input, concurrency control, required secrets, Chromium install, and guarded state commit.

## Idempotence and recovery

All checks are read-only against NUDCH. Re-running a check with unchanged availability produces no duplicate alert. If notification fails, state is not persisted and a later run retries. The heartbeat writes one stable `YYYY-MM` value per month, so repeated runs are no-ops.

## Artifacts and notes

Evidence: `npm test` passed 28 tests; `npm audit --audit-level=high` reported zero vulnerabilities; the live dry run returned `unavailable` for `Psychiatrická ambulancia 03 (MUDr. Böhmer)`; GitHub external run `34519890612` completed successfully on commit `c968678`. No screenshots or portal response bodies containing unrelated information were committed.

## Interfaces and dependencies

`detectAvailability(text, targetUrl, finalUrl)` returns `{status, confidence?, clinic, appointment, fingerprint, reason}`. `confidence` is `confirmed` or `possible` for available observations. `validateTargetUrl(url, label)` returns `null` or a diagnostic string. `transitionState(previous, observation, checkedAt)` returns `{nextState, notifications}` with a stable notification key. `processObservation(options)` sends notifications in order and persists the next state only after delivery succeeds. `probePortal(options)` returns the rendered classification and validates the post-navigation URL. Playwright is the sole package dependency; Node's built-in `fetch`, test runner, and filesystem APIs cover the rest.

Revision note: Telegram was replaced with ntfy plus GitHub Issue/email after the user reported that Telegram was unavailable. Playwright was upgraded to 1.63.0 in response to a high-severity audit finding. On 2026-09-10 the native scheduler was replaced by cron-job.org after only six checks in 24 hours. The plan was reopened again the same day to require exact target identity, possible-slot alerts for partial parsing, and immediate deduplicated error notifications.
