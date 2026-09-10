import { sendNotification } from "./notifier.js";
import { probePortal } from "./probe.js";
import { loadState, processObservation, saveState } from "./runner.js";

const DEFAULT_TARGET_URL = "https://portal.nudch.eu/workplaces/reservation?idf=nuo4|2958571&step=2";

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const checkedAt = new Date().toISOString();
  const previousState = await loadState(options.statePath);
  const observation = await probePortal({ targetUrl: options.targetUrl });

  const transition = await processObservation({
    previousState,
    observation,
    checkedAt,
    dryRun: options.dryRun,
    targetUrl: options.targetUrl,
    sendNotification: (payload) => sendNotification({
      payload,
      targetUrl: options.targetUrl,
      github: {
        token: process.env.GITHUB_TOKEN,
        repository: process.env.GITHUB_REPOSITORY,
        assignee: process.env.GITHUB_NOTIFY_USER
      },
      ntfy: {
        server: process.env.NTFY_SERVER || "https://ntfy.sh",
        topic: process.env.NTFY_TOPIC
      }
    }),
    persistState: (state) => saveState(options.statePath, state)
  });

  console.log(JSON.stringify({
    checkedAt,
    dryRun: options.dryRun,
    result: observation.status,
    confidence: observation.confidence ?? null,
    clinic: observation.clinic,
    appointment: observation.appointment,
    reason: observation.reason,
    plannedNotifications: transition.notifications.map(({ type }) => type)
  }));

  if (observation.status === "error") {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ result: "error", reason: error.message }));
  process.exitCode = 1;
});

function parseCliArgs(argv) {
  const result = {
    dryRun: ["1", "true", "yes", "on"].includes(String(process.env.DRY_RUN ?? "").toLowerCase()),
    targetUrl: process.env.TARGET_URL || DEFAULT_TARGET_URL,
    statePath: process.env.STATE_PATH || "state.json"
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") result.dryRun = true;
    else if (argument === "--url") result.targetUrl = requiredValue(argv, ++index, "--url");
    else if (argument === "--state") result.statePath = requiredValue(argv, ++index, "--state");
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return result;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}
