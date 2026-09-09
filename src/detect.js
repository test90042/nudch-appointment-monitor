const CLINIC_PATTERN = /Psychiatrick[aá] ambulancia[^\r\n]*/i;
const DATE_PATTERN = /([0-3]\d\.[01]\d\.\d{4})\s*(?:[-–]\s*([0-2]\d:[0-5]\d))?/;

export function detectAvailability(rawText, targetUrl) {
  const text = String(rawText ?? "").replace(/\u00a0/g, " ").trim();
  const clinic = cleanClinic(text.match(CLINIC_PATTERN)?.[0] ?? null);

  if (!text || /Str[aá]nka sa na[čc][ií]tava|K[oó]d chyby\s*-?\s*404/i.test(text)) {
    return errorResult(clinic, "The portal is still loading or returned its transient error shell.");
  }

  if (!clinic) {
    return errorResult(null, "The expected clinic identity is not visible on the page.");
  }

  const nearestIndex = text.search(/Najbli[žz][šs][ií] term[ií]n/i);
  const hasReservationAction = /Rezervova[ťt] term[ií]n/i.test(text);

  if (nearestIndex >= 0 && hasReservationAction) {
    const appointmentText = text.slice(nearestIndex, nearestIndex + 100);
    const match = appointmentText.match(DATE_PATTERN);
    if (!match || !match[2]) {
      return errorResult(clinic, "Availability markers are visible, but a complete appointment date and time could not be extracted.");
    }

    const appointment = { date: match[1], time: match[2] };
    return {
      status: "available",
      clinic,
      appointment,
      fingerprint: `${appointment.date}T${appointment.time}`,
      reason: "A reservable appointment is visible."
    };
  }

  if (/Kontaktujte n[aá]s telefonicky/i.test(text) && nearestIndex < 0 && !hasReservationAction) {
    return {
      status: "unavailable",
      clinic,
      appointment: null,
      fingerprint: null,
      reason: "The clinic currently asks visitors to contact it by telephone."
    };
  }

  return errorResult(clinic, `The page for ${new URL(targetUrl).hostname} did not expose a recognized final availability signal.`);
}

function cleanClinic(value) {
  return value?.replace(/\s+/g, " ").trim() ?? null;
}

function errorResult(clinic, reason) {
  return {
    status: "error",
    clinic,
    appointment: null,
    fingerprint: null,
    reason
  };
}
