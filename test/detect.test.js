import assert from "node:assert/strict";
import test from "node:test";

import { detectAvailability } from "../src/detect.js";

const targetUrl = "https://portal.nudch.eu/workplaces/reservation?idf=nuo4|2958571&step=2";

test("detects a reservable appointment and extracts its date and time", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Najbližší termín 14.09.2026 - 08:35
    Rezervovať termín
  `, targetUrl);

  assert.deepEqual(result, {
    status: "available",
    confidence: "confirmed",
    clinic: "Psychiatrická ambulancia 03 (MUDr. Böhmer)",
    appointment: { date: "14.09.2026", time: "08:35" },
    fingerprint: "14.09.2026T08:35",
    reason: "A reservable appointment is visible."
  });
});

test("detects the target's telephone-only state", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Kontaktujte nás telefonicky
  `, targetUrl);

  assert.equal(result.status, "unavailable");
  assert.equal(result.fingerprint, null);
});

test("rejects a loading shell", () => {
  const result = detectAvailability("Stránka sa načítava, počkajte prosím...", targetUrl);
  assert.equal(result.status, "error");
});

test("rejects a transient 404 shell", () => {
  const result = detectAvailability("Ojoj!!! Kód chyby - 404", targetUrl);
  assert.equal(result.status, "error");
});

test("rejects unfamiliar content instead of reporting no appointment", () => {
  const result = detectAvailability("Psychiatrická ambulancia 03 (MUDr. Böhmer)\nÚdržba", targetUrl);
  assert.equal(result.status, "error");
  assert.match(result.reason, /final availability signal/i);
});

test("treats the nearest-appointment label alone as possible availability", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Najbližší termín 14.09.2026 - 08:35
  `, targetUrl);
  assert.equal(result.status, "available");
  assert.equal(result.confidence, "possible");
  assert.deepEqual(result.appointment, { date: "14.09.2026", time: "08:35" });
});

test("treats the reservation action alone as possible availability without parsed values", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Rezervovať termín
  `, targetUrl);
  assert.equal(result.status, "available");
  assert.equal(result.confidence, "possible");
  assert.deepEqual(result.appointment, { date: null, time: null });
  assert.match(result.reason, /could not be fully parsed/i);
});

test("keeps a partially parsed date and still reports possible availability", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Najbližší termín 14.09.2026
  `, targetUrl);
  assert.equal(result.status, "available");
  assert.deepEqual(result.appointment, { date: "14.09.2026", time: null });
});

test("rejects a configured URL for another workplace", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Kontaktujte nás telefonicky
  `, "https://portal.nudch.eu/workplaces/reservation?idf=nuo4|3113371&step=2");
  assert.equal(result.status, "error");
  assert.match(result.reason, /idf/i);
});

test("rejects a redirect whose final URL no longer identifies the target", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 03 (MUDr. Böhmer)
    Kontaktujte nás telefonicky
  `, targetUrl, "https://portal.nudch.eu/workplaces/reservation?idf=nuo4|3113371&step=2");
  assert.equal(result.status, "error");
  assert.match(result.reason, /final URL/i);
});

test("rejects another psychiatric clinic even when it has a final signal", () => {
  const result = detectAvailability(`
    Psychiatrická ambulancia 04 (MUDr. Iný)
    Najbližší termín 14.09.2026 - 08:35
    Rezervovať termín
  `, targetUrl);
  assert.equal(result.status, "error");
  assert.match(result.reason, /exact clinic identity/i);
});
