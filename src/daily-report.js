import { sendNtfyNotification } from "./ntfy.js";
import { collectWorkflowReport, formatDailyReport } from "./report.js";

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const report = await collectWorkflowReport({
    token: process.env.GITHUB_TOKEN,
    repository
  });

  await sendNtfyNotification({
    server: process.env.NTFY_SERVER || "https://ntfy.sh",
    topic: process.env.NTFY_TOPIC,
    title: report.successful > 0 ? "NÚDCH – denný súhrn" : "NÚDCH – monitor nefunguje",
    text: formatDailyReport(report),
    clickUrl: `https://github.com/${repository}/actions/workflows/monitor.yml`,
    urgent: report.successful === 0
  });

  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
