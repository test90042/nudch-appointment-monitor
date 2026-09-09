import { chromium } from "playwright";

import { detectAvailability } from "./detect.js";

export async function probePortal({ targetUrl, timeoutMs = 30_000, chromiumImpl = chromium }) {
  let browser;
  try {
    browser = await chromiumImpl.launch({ headless: true });
    const page = await browser.newPage({ locale: "sk-SK" });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    try {
      await page.waitForFunction(
        () => {
          const text = document.body?.innerText ?? "";
          const hasClinic = /Psychiatrick[aá] ambulancia/i.test(text);
          const hasFinalSignal = /Najbli[žz][šs][ií] term[ií]n|Kontaktujte n[aá]s telefonicky|Rezervova[ťt] term[ií]n/i.test(text);
          return hasClinic && hasFinalSignal;
        },
        { timeout: timeoutMs }
      );
    } catch {
      // The parser below turns incomplete or unfamiliar content into a controlled error.
    }

    const text = await page.locator("body").innerText({ timeout: 5_000 });
    return detectAvailability(text, targetUrl);
  } catch (error) {
    return {
      status: "error",
      clinic: null,
      appointment: null,
      fingerprint: null,
      reason: `Portal probe failed: ${safeErrorMessage(error)}`
    };
  } finally {
    await browser?.close();
  }
}

function safeErrorMessage(error) {
  const firstLine = String(error?.message ?? error).split(/\r?\n/, 1)[0];
  return firstLine.replace(/https?:\/\/[^\s]+/g, "[URL]").slice(0, 240);
}
