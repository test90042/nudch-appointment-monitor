import assert from "node:assert/strict";
import test from "node:test";

import { ensureGitHubIssue } from "../src/github.js";
import { sendNtfyNotification } from "../src/ntfy.js";
import { sendNotification } from "../src/notifier.js";

function response({ ok = true, status = 200, json = [] } = {}) {
  return { ok, status, json: async () => json };
}

test("GitHub notification does not recreate an issue with the same key", async () => {
  const calls = [];
  const result = await ensureGitHubIssue({
    token: "token", repository: "owner/repo", assignee: "owner",
    key: "availability:slot", title: "Slot", text: "Available",
    targetUrl: "https://example.test",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ json: [{ body: "<!-- nudch-notification:availability:slot -->" }] });
    }
  });

  assert.deepEqual(result, { created: false });
  assert.equal(calls.length, 1);
});

test("GitHub notification creates and assigns a new issue", async () => {
  const calls = [];
  await ensureGitHubIssue({
    token: "token", repository: "owner/repo", assignee: "owner",
    key: "availability:new-slot", title: "Slot", text: "Available",
    targetUrl: "https://example.test",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return calls.length === 1 ? response({ json: [] }) : response({ status: 201, json: {} });
    }
  });

  assert.equal(calls.length, 2);
  const body = JSON.parse(calls[1].options.body);
  assert.deepEqual(body.assignees, ["owner"]);
  assert.match(body.body, /nudch-notification:availability:new-slot/);
});

test("ntfy sends an urgent push with a click-through URL", async () => {
  const calls = [];
  await sendNtfyNotification({
    topic: "unguessable-topic", title: "New slot", text: "Available",
    clickUrl: "https://example.test", urgent: true,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response();
    }
  });

  assert.equal(calls[0].url, "https://ntfy.sh/unguessable-topic");
  assert.equal(calls[0].options.headers.priority, "urgent");
  assert.equal(calls[0].options.headers.click, "https://example.test");
});

test("combined delivery makes GitHub idempotent before sending ntfy", async () => {
  const urls = [];
  await sendNotification({
    payload: {
      notification: {
        type: "availability", key: "availability:slot",
        checkedAt: "2026-09-09T16:30:00.000Z",
        observation: { clinic: "Clinic", appointment: { date: "10.12.2026", time: "12:10" } }
      }
    },
    targetUrl: "https://example.test",
    github: { token: "token", repository: "owner/repo", assignee: "owner" },
    ntfy: { topic: "unguessable-topic" },
    fetchImpl: async (url, options = {}) => {
      urls.push(url);
      if (urls.length === 1) return response({ json: [] });
      if (urls.length === 2) return response({ status: 201, json: {} });
      return response();
    }
  });

  assert.match(urls[0], /api\.github\.com/);
  assert.match(urls[1], /api\.github\.com/);
  assert.equal(urls[2], "https://ntfy.sh/unguessable-topic");
});
