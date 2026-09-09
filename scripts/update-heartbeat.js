import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";

export function getMonthStamp(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

async function main() {
  await writeFile("heartbeat.txt", `${getMonthStamp()}\n`, "utf8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
