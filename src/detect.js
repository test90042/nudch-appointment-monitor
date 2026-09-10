const CLINIC_PATTERN = /Psychiatrick[aá] ambulancia[^\r\n]*/i;
const EXPECTED_CLINIC = "Psychiatrická ambulancia 03 (MUDr. Böhmer)";
const EXPECTED_URL = {
  protocol: "https:",
  hostname: "portal.nudch.eu",
  pathname: "/workplaces/reservation",
  idf: "nuo4|2958571",
  step: "2"
};
const DATE_PATTERN = /([0-3]\d\.[01]\d\.\d{4})/;
const TIME_PATTERN = /([0-2]\d:[0-5]\d)/;
const NEAREST_PATTERN = /Najbli[žz][šs][ií] term[ií]n/i;
const RESERVATION_PATTERN = /Rezervova[ťt] term[ií]n/i;

export function detectAvailability(rawText, targetUrl, finalUrl = targetUrl) {
  const text = String(rawText ?? "").replace(/\u00a0/g, " ").trim();
  const clinic = cleanClinic(text.match(CLINIC_PATTERN)?.[0] ?? null);
  const configuredUrlError = validateTargetUrl(targetUrl, "Configured URL");
  if (configuredUrlError) return errorResult(clinic, configuredUrlError);
  const finalUrlError = validateTargetUrl(finalUrl, "Final URL");
  if (finalUrlError) return errorResult(clinic, finalUrlError);

  if (!text || /Str[aá]nka sa na[čc][ií]tava|K[oó]d chyby\s*-?\s*404/i.test(text)) {
    return errorResult(clinic, "The portal is still loading or returned its transient error shell.");
  }

  if (!clinic || normalizeIdentity(clinic) !== normalizeIdentity(EXPECTED_CLINIC)) {
    return errorResult(clinic, "The exact clinic identity is not visible on the page.");
  }

  const nearestIndex = text.search(NEAREST_PATTERN);
  const reservationIndex = text.search(RESERVATION_PATTERN);
  const hasNearest = nearestIndex >= 0;
  const hasReservationAction = reservationIndex >= 0;

  if (hasNearest || hasReservationAction) {
    const appointmentText = markerContext(text, [nearestIndex, reservationIndex]);
    const date = appointmentText.match(DATE_PATTERN)?.[1] ?? null;
    const time = appointmentText.match(TIME_PATTERN)?.[1] ?? null;
    const confirmed = hasNearest && hasReservationAction && date && time;
    const markerKey = [hasNearest ? "nearest" : null, hasReservationAction ? "reservation" : null]
      .filter(Boolean)
      .join("+");

    const appointment = { date, time };
    return {
      status: "available",
      confidence: confirmed ? "confirmed" : "possible",
      clinic,
      appointment,
      fingerprint: confirmed
        ? `${date}T${time}`
        : `possible:${markerKey}:${date ?? "unknown"}T${time ?? "unknown"}`,
      reason: confirmed
        ? "A reservable appointment is visible."
        : date && time
          ? "An appointment marker is visible, but the full reservation signal set is incomplete."
          : "An appointment marker is visible, but the date and time could not be fully parsed."
    };
  }

  if (/Kontaktujte n[aá]s telefonicky/i.test(text)) {
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

export function validateTargetUrl(value, label = "URL") {
  let url;
  try {
    url = new URL(value);
  } catch {
    return `${label} is not a valid URL.`;
  }

  if (url.protocol !== EXPECTED_URL.protocol || url.hostname !== EXPECTED_URL.hostname || url.pathname !== EXPECTED_URL.pathname) {
    return `${label} does not point to the expected NÚDCH reservation page.`;
  }
  if (url.searchParams.get("idf") !== EXPECTED_URL.idf) {
    return `${label} has an unexpected idf value.`;
  }
  if (url.searchParams.get("step") !== EXPECTED_URL.step) {
    return `${label} has an unexpected step value.`;
  }
  return null;
}

function markerContext(text, indexes) {
  return indexes
    .filter((index) => index >= 0)
    .map((index) => text.slice(Math.max(0, index - 120), index + 220))
    .join("\n");
}

function cleanClinic(value) {
  return value?.replace(/\s+/g, " ").trim() ?? null;
}

function normalizeIdentity(value) {
  return String(value).normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("sk");
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
