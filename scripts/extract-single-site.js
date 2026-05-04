#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'node:path';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const TARGET_URL = process.argv[2] || 'https://fluid.glass';
const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'work', 'sources', 'fluid');
const RAW_DIR = path.join(OUT_ROOT, 'raw');
const REPORTS_DIR = path.join(OUT_ROOT, 'reports');

const allowedTypes = new Set(['script', 'stylesheet', 'document', 'xhr']);
const jsonContentHints = ['application/json', 'text/json', '+json'];

const captured = new Map();
const mapChecks = [];
const failures = [];

function safeName(input, fallbackExt = '.txt') {
  const hash = crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
  let pathname = '';
  try {
    pathname = new URL(input).pathname;
  } catch {
    pathname = '/unknown';
  }
  const base = path.basename(pathname) || 'index';
  const ext = path.extname(base) || fallbackExt;
  const stem = base.replace(ext, '') || 'file';
  return `${stem}-${hash}${ext}`;
}

function shouldCapture(resourceType, contentType, url) {
  if (!allowedTypes.has(resourceType)) return false;
  if (resourceType === 'xhr') {
    const ct = (contentType || '').toLowerCase();
    return jsonContentHints.some((hint) => ct.includes(hint)) || /\/api\//i.test(url);
  }
  return true;
}

async function saveAsset({ url, resourceType, status, contentType, buffer }) {
  const extFromType = (() => {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('javascript') || ct.includes('ecmascript')) return '.js';
    if (ct.includes('css')) return '.css';
    if (ct.includes('html')) return '.html';
    if (ct.includes('json')) return '.json';
    if (ct.includes('wasm')) return '.wasm';
    return path.extname(new URL(url).pathname) || '.txt';
  })();

  const filename = safeName(url, extFromType);
  const outPath = path.join(RAW_DIR, filename);
  await fs.ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, buffer);

  captured.set(url, {
    url,
    resourceType,
    status,
    contentType,
    bytes: buffer.length,
    file: path.relative(ROOT, outPath),
  });
}

async function detectSourceMap(entry) {
  if (!entry.file.endsWith('.js')) return;
  const abs = path.join(ROOT, entry.file);
  let text = '';
  try {
    text = await fs.readFile(abs, 'utf8');
  } catch {
    mapChecks.push({ jsUrl: entry.url, status: 'not-found', reason: 'non-utf8-js' });
    return;
  }

  const match = text.match(/[#@]\s*sourceMappingURL\s*=\s*([^\s*]+)/);
  const candidates = [];
  if (match?.[1]) {
    if (match[1].startsWith('data:')) {
      mapChecks.push({ jsUrl: entry.url, status: 'found-inline', sourcesContent: 'unknown' });
      return;
    }
    candidates.push(new URL(match[1], entry.url).toString());
  }
  candidates.push(`${entry.url}.map`);
  if (entry.url.endsWith('.js')) {
    candidates.push(entry.url.replace(/\.js($|\?)/, '.map$1'));
  }

  for (const candidate of [...new Set(candidates)]) {
    try {
      const res = await fetch(candidate, { headers: { 'user-agent': 'Mozilla/5.0 Exoape-Targeted-Extract' } });
      if (!res.ok) {
        mapChecks.push({ jsUrl: entry.url, mapUrl: candidate, status: `http-${res.status}` });
        continue;
      }
      const ct = res.headers.get('content-type') || '';
      const body = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        mapChecks.push({ jsUrl: entry.url, mapUrl: candidate, status: 'invalid-json', contentType: ct });
        continue;
      }
      const hasSourcesContent = Array.isArray(parsed.sourcesContent) && parsed.sourcesContent.some((s) => typeof s === 'string' && s.length > 0);
      mapChecks.push({ jsUrl: entry.url, mapUrl: candidate, status: 'found', sourcesContent: hasSourcesContent ? 'yes' : 'no' });
      return;
    } catch (error) {
      mapChecks.push({ jsUrl: entry.url, mapUrl: candidate, status: 'fetch-error', reason: error.message });
    }
  }

  mapChecks.push({ jsUrl: entry.url, status: 'not-found' });
}

async function run() {
  await fs.ensureDir(RAW_DIR);
  await fs.ensureDir(REPORTS_DIR);

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('response', async (response) => {
    const req = response.request();
    const resourceType = req.resourceType();
    const url = response.url();
    const status = response.status();
    const headers = response.headers();
    const contentType = headers['content-type'] || '';

    if (!shouldCapture(resourceType, contentType, url)) return;
    if (captured.has(url)) return;

    try {
      const buffer = await response.buffer();
      await saveAsset({ url, resourceType, status, contentType, buffer });
    } catch (error) {
      failures.push({ url, stage: 'buffer', error: error.message });
    }
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.evaluate(async () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await new Promise((resolve) => setTimeout(resolve, 1800));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await new Promise((resolve) => setTimeout(resolve, 2500));
  } finally {
    await browser.close();
  }

  const entries = [...captured.values()];
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    await detectSourceMap(entry);
  }

  const summary = {
    target: TARGET_URL,
    capturedCount: entries.length,
    jsCount: entries.filter((e) => e.file.endsWith('.js')).length,
    cssCount: entries.filter((e) => e.file.endsWith('.css')).length,
    htmlCount: entries.filter((e) => e.file.endsWith('.html')).length,
    jsonCount: entries.filter((e) => e.file.endsWith('.json')).length,
    failures,
    captured: entries,
    sourceMaps: mapChecks,
  };

  await fs.writeJson(path.join(REPORTS_DIR, 'extraction-summary.json'), summary, { spaces: 2 });
  console.log(`Captured ${entries.length} assets from ${TARGET_URL}`);
  console.log(`JS files: ${summary.jsCount}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
