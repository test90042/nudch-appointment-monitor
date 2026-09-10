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

  if (ntfy?.topic) {
    await sendNtfyNotification({
      ...ntfy,
      title,
      text,
      clickUrl: targetUrl,
      urgent,
      fetchImpl
    });
  }
}

function formatNotification(notification, targetUrl) {
  const checked = new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Bratislava"
  }).format(new Date(notification.checkedAt));

  if (notification.type === "availability") {
    const { clinic, appointment } = notification.observation;
    const complete = appointment?.date && appointment?.time && notification.observation.confidence !== "possible";
    if (!complete) {
      return [
        "🚨 MOŽNÝ NOVÝ TERMÍN NÚDCH",
        `Ambulancia: ${clinic}`,
        `Dátum: ${appointment?.date ?? "nepodarilo sa prečítať"}`,
        `Čas: ${appointment?.time ?? "nepodarilo sa prečítať"}`,
        "Na stránke sa objavil signál termínu, ale nepodarilo sa potvrdiť všetky údaje.",
        `Dôvod: ${notification.observation.reason}`,
        `Skontrolované: ${checked}`,
        `Skontrolujte rezerváciu ihneď: ${targetUrl}`,
        "⚠️ Na prvé vyšetrenie sa podľa stránky objednáva telefonicky; online termín môže byť zrušený."
      ].join("\n");
    }
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
      "Kontrolu portálu sa nepodarilo spoľahlivo dokončiť.",
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
    if (!notification.observation.appointment?.date ||
        !notification.observation.appointment?.time ||
        notification.observation.confidence === "possible") {
      return "Možný nový termín NÚDCH – skontrolujte stránku";
    }
    return `Nový termín NÚDCH: ${notification.observation.appointment.date} ${notification.observation.appointment.time}`;
  }
  return notification.type === "outage" ? "Monitor NÚDCH má problém" : "Monitor NÚDCH opäť funguje";
}
