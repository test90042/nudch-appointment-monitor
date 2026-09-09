export async function sendNtfyNotification({
  server = "https://ntfy.sh",
  topic,
  title,
  text,
  clickUrl,
  urgent = false,
  fetchImpl = fetch
}) {
  if (!topic) {
    throw new Error("NTFY_TOPIC is required to send a push notification.");
  }

  const baseUrl = server.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      topic,
      title,
      message: text,
      priority: urgent ? 5 : 3,
      tags: urgent ? ["rotating_light", "calendar"] : ["white_check_mark"],
      ...(clickUrl ? { click: clickUrl } : {})
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`ntfy delivery failed with HTTP ${response.status}.`);
  }
}
