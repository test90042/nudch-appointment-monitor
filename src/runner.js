import { readFile, writeFile } from "node:fs/promises";

import { initialState, transitionState } from "./transition.js";

export async function processObservation({
  previousState,
  observation,
  checkedAt,
  sendNotification,
  persistState,
  dryRun,
  targetUrl = ""
}) {
  const transition = transitionState(previousState, observation, checkedAt);

  if (!dryRun) {
    for (const notification of transition.notifications) {
      await sendNotification({
        notification,
        targetUrl
      });
    }
    await persistState(transition.nextState);
  }

  return transition;
}

export async function loadState(path) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    if (parsed.version !== 1) throw new Error(`Unsupported state version: ${parsed.version}`);
    return { ...initialState(), ...parsed };
  } catch (error) {
    if (error.code === "ENOENT") return initialState();
    throw error;
  }
}

export async function saveState(path, state) {
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
