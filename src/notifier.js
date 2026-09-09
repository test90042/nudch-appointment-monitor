import { ensureGitHubIssue } from "./github.js";
import { sendNtfyNotification } from "./ntfy.js";

export async function sendNotification({ payload, targetUrl, github, ntfy, fetchImpl = fetch }) {
  const urgent = payload.notification.type !== "recovery";
  const title = notificationTitle(payload.notification);
  const text = formatNotification(payload.notification, targetUrl);

  await ensureGitHubIssue({
    ...github,
    key: payload.notification.key,
    title,
    text,
    targetUrl,
    fetchImpl
  });

  await sendNtfyNotification({
    ...ntfy,
    title,
    text,
    clickUrl: targetUrl,
    urgent,
    fetchImpl
  });
}

function formatNotification(notification, targetUrl) {
  const checked = new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Bratislava"
  }).format(new Date(notification.checkedAt));

  if (notification.type === "availability") {
    const { clinic, appointment } = notification.observation;
    return [
      "🚨 NOVÝ TERMÍN NÚDCH",
      `Ambulancia: ${clinic}`,
      `Termín: ${appointment.date} o ${appointment.time}`,
      `Skontrolované: ${checked}`,
      `Rezervácia: ${targetUrl}`,
      "⚠️ Na prvé vyšetrenie sa podľa stránky objednáva telefonicky; online termín môže byť zrušený."
    ].join("\n");
  }
  if (notification.type === "outage") {
    return [
      "⚠️ Monitor NÚDCH má problém",
      `Portál sa nepodarilo spoľahlivo skontrolovať ${notification.errorCount}-krát po sebe.`,
      `Dôvod: ${notification.observation.reason}`,
      `Skontrolované: ${checked}`
    ].join("\n");
  }
  return [
    "✅ Monitor NÚDCH opäť funguje",
    `Aktuálny stav: ${notification.observation.status === "available" ? "termín je dostupný" : "termín nie je dostupný"}.`,
    `Skontrolované: ${checked}`
  ].join("\n");
}

function notificationTitle(notification) {
  if (notification.type === "availability") {
    return `Nový termín NÚDCH: ${notification.observation.appointment.date} ${notification.observation.appointment.time}`;
  }
  return notification.type === "outage" ? "Monitor NÚDCH má problém" : "Monitor NÚDCH opäť funguje";
}
