// Offline fallback: renders /print into exports/next-1.0-slides.pdf plus one PNG per slide.
//
//   npm run dev            (or npm run local) in another terminal, then:
//   npm run export:pdf                          # from http://localhost:3000
//   npm run export:pdf -- https://<deployment>  # from the live site (the QR then points there)
//
// Uses the Chrome or Edge already installed on the laptop; no browser download.
// Set CHROME_PATH to use a specific browser binary.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const out = new URL('../exports/', import.meta.url).pathname;
mkdirSync(out + 'slides', { recursive: true });

async function launch() {
  const tries = [
    process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH },
    { channel: 'chrome' },
    { channel: 'msedge' },
    {},
  ].filter(Boolean);
  for (const opts of tries) {
    try {
      return await chromium.launch(opts);
    } catch {}
  }
  throw new Error('No Chrome or Edge found. Install Chrome, or set CHROME_PATH to a Chromium binary.');
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(base + '/print', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const pdf = out + 'next-1.0-slides.pdf';
await page.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

const pages = await page.$$('.print-page');
for (const [i, el] of pages.entries()) {
  const id = await el.getAttribute('data-slide');
  await el.screenshot({ path: `${out}slides/${String(i + 1).padStart(2, '0')}-${id.replace(':', '-')}.png` });
}
await browser.close();
console.log(`Wrote ${pdf} and ${pages.length} PNGs in exports/slides/ from ${base}/print`);
