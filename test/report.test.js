import assert from "node:assert/strict";
import test from "node:test";

import { collectWorkflowReport, formatDailyReport } from "../src/report.js";

function response(workflowRuns) {
  return { ok: true, status: 200, json: async () => ({ workflow_runs: workflowRuns }) };
}

test("daily report counts GitHub and externally scheduled checks but ignores manual runs", async () => {
  const report = await collectWorkflowReport({
    token: "token",
    repository: "owner/repo",
    now: new Date("2026-09-09T12:00:00.000Z"),
    fetchImpl: async () => response([
      { event: "schedule", display_title: "GitHub scheduled check", conclusion: "success", created_at: "2026-09-09T11:55:00.000Z", run_started_at: "2026-09-09T11:55:10.000Z" },
      { event: "workflow_dispatch", display_title: "External scheduled check", conclusion: "failure", created_at: "2026-09-09T11:50:00.000Z" },
      { event: "workflow_dispatch", display_title: "Manual check", conclusion: "success", created_at: "2026-09-09T11:45:00.000Z" },
      { event: "schedule", display_title: "GitHub scheduled check", conclusion: "success", created_at: "2026-09-08T11:00:00.000Z" }
    ])
  });

  assert.equal(report.total, 2);
  assert.equal(report.successful, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.githubScheduled, 1);
  assert.equal(report.externalScheduled, 1);
  assert.equal(report.lastSuccessfulAt, "2026-09-09T11:55:10.000Z");
  assert.match(formatDailyReport(report), /Úspešné kontroly.*1/);
  assert.match(formatDailyReport(report), /Externý plánovač: 1/);
});

test("daily report request is not restricted to GitHub schedule events", async () => {
  let requestedUrl;
  await collectWorkflowReport({
    token: "token",
    repository: "owner/repo",
    now: new Date("2026-09-09T12:00:00.000Z"),
    fetchImpl: async (url) => {
      requestedUrl = url;
      return response([]);
    }
  });

  assert.equal(requestedUrl.searchParams.has("event"), false);
});

test("daily report warns when there were no successful checks", () => {
  assert.match(formatDailyReport({ successful: 0, failed: 2, lastSuccessfulAt: null }), /Pozor/);
});
