import assert from "node:assert/strict";
import test from "node:test";

import { initialState, transitionState } from "../src/transition.js";
import { processObservation } from "../src/runner.js";
import { getMonthStamp } from "../scripts/update-heartbeat.js";

const checkedAt = "2026-09-09T16:30:00.000Z";
const unavailable = { status: "unavailable", fingerprint: null, clinic: "Clinic", appointment: null, reason: "No slot." };
const available = { status: "available", fingerprint: "10.12.2026T12:10", clinic: "Clinic", appointment: { date: "10.12.2026", time: "12:10" }, reason: "Slot." };

test("notifies once when availability first appears", () => {
  const first = transitionState(initialState(), available, checkedAt);
  assert.deepEqual(first.notifications.map((item) => item.type), ["availability"]);

  const repeat = transitionState(first.nextState, available, checkedAt);
  assert.deepEqual(repeat.notifications, []);
});

test("notifies when the appointment fingerprint changes", () => {
  const first = transitionState(initialState(), available, checkedAt);
  const changed = { ...available, fingerprint: "11.12.2026T09:00", appointment: { date: "11.12.2026", time: "09:00" } };
  const result = transitionState(first.nextState, changed, checkedAt);
  assert.deepEqual(result.notifications.map((item) => item.type), ["availability"]);
});

test("does not notify when an unavailable state repeats", () => {
  const first = transitionState(initialState(), unavailable, checkedAt);
  const repeat = transitionState(first.nextState, unavailable, checkedAt);
  assert.deepEqual(first.notifications, []);
  assert.deepEqual(repeat.notifications, []);
});

test("sends one outage alert after three errors and a recovery after success", () => {
  const error = { status: "error", fingerprint: null, clinic: null, appointment: null, reason: "Portal timeout." };
  const one = transitionState(initialState(), error, checkedAt);
  const two = transitionState(one.nextState, error, checkedAt);
  const three = transitionState(two.nextState, error, checkedAt);
  const four = transitionState(three.nextState, error, checkedAt);

  assert.deepEqual(one.notifications, []);
  assert.deepEqual(two.notifications, []);
  assert.deepEqual(three.notifications.map((item) => item.type), ["outage"]);
  assert.deepEqual(four.notifications, []);

  const recovered = transitionState(three.nextState, unavailable, checkedAt);
  assert.deepEqual(recovered.notifications.map((item) => item.type), ["recovery"]);
  assert.equal(recovered.nextState.consecutiveErrors, 0);
});

test("does not persist an available state when notification delivery fails", async () => {
  const persisted = [];
  await assert.rejects(
    processObservation({
      previousState: initialState(),
      observation: available,
      checkedAt,
      sendNotification: async () => { throw new Error("Telegram unavailable"); },
      persistState: async (state) => persisted.push(state),
      dryRun: false
    }),
    /Telegram unavailable/
  );
  assert.deepEqual(persisted, []);
});

test("dry run neither sends nor persists", async () => {
  let sends = 0;
  let saves = 0;
  const result = await processObservation({
    previousState: initialState(),
    observation: available,
    checkedAt,
    sendNotification: async () => { sends += 1; },
    persistState: async () => { saves += 1; },
    dryRun: true
  });
  assert.equal(sends, 0);
  assert.equal(saves, 0);
  assert.equal(result.notifications.length, 1);
});

test("heartbeat uses a stable UTC month stamp", () => {
  assert.equal(getMonthStamp(new Date("2026-09-30T23:59:59Z")), "2026-09");
  assert.equal(getMonthStamp(new Date("2026-10-01T00:00:00Z")), "2026-10");
});
