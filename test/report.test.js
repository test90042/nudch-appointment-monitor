import assert from "node:assert/strict";
import test from "node:test";

import { collectWorkflowReport, formatDailyReport } from "../src/report.js";

function response(workflowRuns) {
  return { ok: true, status: 200, json: async () => ({ workflow_runs: workflowRuns }) };
}

test("daily report counts successful and failed scheduled checks from the last 24 hours", async () => {
  const report = await collectWorkflowReport({
    token: "token",
    repository: "owner/repo",
    now: new Date("2026-09-09T12:00:00.000Z"),
    fetchImpl: async () => response([
      { conclusion: "success", created_at: "2026-09-09T11:55:00.000Z", run_started_at: "2026-09-09T11:55:10.000Z" },
      { conclusion: "failure", created_at: "2026-09-09T11:50:00.000Z" },
      { conclusion: "success", created_at: "2026-09-08T11:00:00.000Z" }
    ])
  });

  assert.equal(report.total, 2);
  assert.equal(report.successful, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.lastSuccessfulAt, "2026-09-09T11:55:10.000Z");
  assert.match(formatDailyReport(report), /Úspešné kontroly.*1/);
});

test("daily report warns when there were no successful checks", () => {
  assert.match(formatDailyReport({ successful: 0, failed: 2, lastSuccessfulAt: null }), /Pozor/);
});
