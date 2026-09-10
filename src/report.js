export async function collectWorkflowReport({
  token,
  repository,
  workflow = "monitor.yml",
  now = new Date(),
  fetchImpl = fetch
}) {
  if (!token) throw new Error("GITHUB_TOKEN is required for the daily report.");
  if (!repository) throw new Error("GITHUB_REPOSITORY is required for the daily report.");

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const runs = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(`https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs`);
    url.searchParams.set("status", "completed");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetchImpl(url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28"
      },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`GitHub workflow-runs request failed with HTTP ${response.status}.`);

    const body = await response.json();
    const pageRuns = body.workflow_runs ?? [];
    runs.push(...pageRuns.filter((run) =>
      new Date(run.created_at) >= since && isScheduledMonitorRun(run)
    ));

    if (pageRuns.length < 100 || pageRuns.some((run) => new Date(run.created_at) < since)) break;
  }

  const successful = runs.filter((run) => run.conclusion === "success");
  const failed = runs.filter((run) => run.conclusion !== "success");
  const lastSuccessfulAt = successful
    .map((run) => run.run_started_at ?? run.created_at)
    .sort()
    .at(-1) ?? null;
  const githubScheduled = runs.filter((run) => run.event === "schedule").length;
  const externalScheduled = runs.filter((run) =>
    run.event === "workflow_dispatch" && run.display_title === "External scheduled check"
  ).length;

  return {
    since: since.toISOString(),
    until: now.toISOString(),
    total: runs.length,
    successful: successful.length,
    failed: failed.length,
    lastSuccessfulAt,
    githubScheduled,
    externalScheduled
  };
}

export function isScheduledMonitorRun(run) {
  return run.event === "schedule" || (
    run.event === "workflow_dispatch" && run.display_title === "External scheduled check"
  );
}

export function formatDailyReport(report) {
  const lastCheck = report.lastSuccessfulAt
    ? new Intl.DateTimeFormat("sk-SK", {
        timeZone: "Europe/Bratislava",
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(report.lastSuccessfulAt))
    : "žiadna";

  return [
    `Úspešné kontroly za posledných 24 hodín: ${report.successful}`,
    `Neúspešné kontroly: ${report.failed}`,
    `Externý plánovač: ${report.externalScheduled ?? 0}`,
    `GitHub plánovač: ${report.githubScheduled ?? 0}`,
    `Posledná úspešná kontrola: ${lastCheck}`,
    report.successful > 0
      ? "Monitor termínov NÚDCH funguje."
      : "Pozor: monitor nemal ani jednu úspešnú kontrolu."
  ].join("\n");
}
