import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import https from 'node:https';
import axios from 'axios';
import { Command } from 'commander';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import beautifyPkg from 'js-beautify';
import {
  CAPTURE_DIRS,
  buildStoragePath,
  extForContentType,
  inferAssetType,
  sha256,
  shouldSkipUrl,
} from './lib/recovery-utils.mjs';

const { js: beautifyJs, css: beautifyCss, html: beautifyHtml } = beautifyPkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const program = new Command();
program
  .option('--limit-targets <n>', 'limit number of targets', Number)
  .option('--target <url>', 'single target URL')
  .option('--dry-run', 'run without saving files', false)
  .option('--no-runtime', 'skip runtime pass')
  .option('--no-sourcemaps', 'skip source map probing')
  .option('--max-pages-per-origin <n>', 'max runtime pages per origin', Number, 2)
  .option('--max-assets <n>', 'max captured assets', Number, 600)
  .option('--timeout-ms <n>', 'request timeout ms', Number, 45000);
program.parse();
const options = program.opts();

const logPath = path.join(repoRoot, 'logs', 'recovery.log');
const assetRecords = [];
const capturedByUrl = new Map();
const failures = [];
const skippedByReason = {};
const mapFindings = [];
let reconstructedCount = 0;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(logPath, `${line}\n`);
}

function addRecord(record) {
  assetRecords.push(record);
  if (record.skipped && record.skipReason) {
    skippedByReason[record.skipReason] = (skippedByReason[record.skipReason] || 0) + 1;
  }
}

function resolveTargets() {
  const targetsPath = path.join(repoRoot, 'targets.txt');
  const raw = fs.readFileSync(targetsPath, 'utf8');
  let targets = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (options.target) targets = [options.target];
  if (options.limitTargets) targets = targets.slice(0, options.limitTargets);
  return targets;
}

function normalizeUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

async function saveBuffer(bucket, url, buffer, contentType) {
  const ext = extForContentType(contentType);
  const outPath = buildStoragePath(repoRoot, bucket, url, ext);
  if (!options.dryRun) {
    await fs.ensureDir(path.dirname(outPath));
    await fs.writeFile(outPath, buffer);
  }
  return path.relative(repoRoot, outPath);
}

async function saveExtracted(rawRelativePath, buffer, type) {
  const sourcePath = path.join(repoRoot, rawRelativePath);
  const extractedPath = sourcePath.replace(`${path.sep}raw${path.sep}`, `${path.sep}extracted${path.sep}`);
  if (sourcePath === extractedPath) return null;
  try {
    let text = buffer.toString('utf8');
    if (type === 'js') text = beautifyJs(text, { indent_size: 2 });
    else if (type === 'css') text = beautifyCss(text, { indent_size: 2 });
    else if (type === 'html') text = beautifyHtml(text, { indent_size: 2 });
    else return null;
    if (!options.dryRun) {
      await fs.ensureDir(path.dirname(extractedPath));
      await fs.writeFile(extractedPath, text, 'utf8');
    }
    return path.relative(repoRoot, extractedPath);
  } catch {
    return null;
  }
}

async function captureAsset({ targetUrl, requestUrl, finalUrl, status, contentType = '', resourceType = '', buffer, method }) {
  if (assetRecords.length >= options.maxAssets) return;
  const skipReason = shouldSkipUrl(finalUrl || requestUrl, resourceType, contentType);
  const kind = inferAssetType(finalUrl || requestUrl, contentType);
  if (skipReason) {
    addRecord({
      targetUrl,
      requestUrl,
      finalUrl,
      status,
      contentType,
      resourceType,
      savedPath: null,
      size: 0,
      hash: null,
      skipped: true,
      skipReason,
      sourceTarget: targetUrl,
      captureMethod: method,
      assetType: kind,
    });
    return;
  }

  const key = finalUrl || requestUrl;
  if (!buffer || capturedByUrl.has(key)) return;

  const hash = sha256(buffer);
  const savedPath = await saveBuffer('raw', key, buffer, contentType);
  const extractedPath = await saveExtracted(savedPath, buffer, kind);

  capturedByUrl.set(key, savedPath);
  addRecord({
    targetUrl,
    requestUrl,
    finalUrl,
    status,
    contentType,
    resourceType,
    savedPath,
    extractedPath,
    size: buffer.length,
    hash,
    skipped: false,
    skipReason: null,
    sourceTarget: targetUrl,
    captureMethod: method,
    assetType: kind,
  });
}

function extractStaticCandidates(html, baseUrl) {
  const $ = cheerio.load(html);
  const candidateSet = new Set();
  const scriptSrcs = $('script[src]').map((_, el) => $(el).attr('src')).get();
  const linkHrefs = $('link').map((_, el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase();
    const href = $(el).attr('href');
    if (!href) return null;
    if (/(modulepreload|preload|stylesheet|manifest)/.test(rel) || /manifest|build|route/.test(href)) return href;
    return null;
  }).get();
  for (const value of [...scriptSrcs, ...linkHrefs]) {
    const absolute = normalizeUrl(baseUrl, value);
    if (absolute) candidateSet.add(absolute);
  }
  return [...candidateSet];
}

async function fetchWithAxios(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: options.timeoutMs,
    maxRedirects: 12,
    validateStatus: () => true,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Exoape-Recovery/1.0)',
      accept: '*/*',
    },
  });
  return response;
}

async function runStaticPass(targetUrl) {
  log(`static:start ${targetUrl}`);
  const seen = new Set();
  const queue = [targetUrl];
  while (queue.length) {
    if (assetRecords.length >= options.maxAssets) break;
    const nextUrl = queue.shift();
    if (seen.has(nextUrl)) continue;
    seen.add(nextUrl);
    try {
      const response = await fetchWithAxios(nextUrl);
      const contentType = response.headers['content-type'] || '';
      const finalUrl = response.request?.res?.responseUrl || nextUrl;
      const buffer = Buffer.from(response.data);
      await captureAsset({
        targetUrl,
        requestUrl: nextUrl,
        finalUrl,
        status: response.status,
        contentType,
        resourceType: 'document',
        buffer,
        method: 'static',
      });
      if (contentType.includes('text/html')) {
        const candidates = extractStaticCandidates(buffer.toString('utf8'), finalUrl);
        for (const candidate of candidates) {
          if (!seen.has(candidate)) queue.push(candidate);
        }
      }
    } catch (error) {
      failures.push({ url: nextUrl, stage: 'static', error: error.message });
      log(`static:error ${nextUrl} ${error.message}`);
    }
  }
  log(`static:done ${targetUrl}`);
}

async function scrollPage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total >= document.body.scrollHeight * 1.5) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
    window.scrollTo(0, 0);
  });
}

async function runRuntimePass(targetUrl) {
  log(`runtime:start ${targetUrl}`);
  const origin = new URL(targetUrl).origin;
  const visited = new Set();
  const queue = [targetUrl];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  page.on('response', async (response) => {
    if (assetRecords.length >= options.maxAssets) return;
    try {
      const url = response.url();
      const resourceType = response.request().resourceType();
      const contentType = response.headers()['content-type'] || '';
      const status = response.status();
      const responseSkipReason = shouldSkipUrl(url, resourceType, contentType);
      if (responseSkipReason) {
        addRecord({ targetUrl, requestUrl: url, finalUrl: url, status, contentType, resourceType, savedPath: null, size: 0, hash: null, skipped: true, skipReason: responseSkipReason, sourceTarget: targetUrl, captureMethod: 'runtime', assetType: inferAssetType(url, contentType) });
        return;
      }
      const buffer = await response.body();
      await captureAsset({
        targetUrl,
        requestUrl: url,
        finalUrl: url,
        status,
        contentType,
        resourceType,
        buffer,
        method: 'runtime',
      });
    } catch (error) {
      failures.push({ url: response.url(), stage: 'runtime-response', error: error.message });
    }
  });

  while (queue.length && visited.size < options.maxPagesPerOrigin && assetRecords.length < options.maxAssets) {
    const next = queue.shift();
    if (visited.has(next)) continue;
    visited.add(next);
    try {
      await page.goto(next, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
      await page.waitForLoadState('networkidle', { timeout: Math.min(options.timeoutMs, 12000) }).catch(() => {});
      await scrollPage(page).catch(() => {});
      const links = await page.$$eval('a[href]', (els) => els.map((e) => e.getAttribute('href')).filter(Boolean));
      for (const href of links) {
        const url = normalizeUrl(next, href);
        if (!url) continue;
        if (!url.startsWith(origin)) continue;
        if (!visited.has(url) && queue.length + visited.size < options.maxPagesPerOrigin) queue.push(url);
      }
    } catch (error) {
      failures.push({ url: next, stage: 'runtime-page', error: error.message });
      log(`runtime:error ${next} ${error.message}`);
    }
  }

  await context.close();
  await browser.close();
  log(`runtime:done ${targetUrl}`);
}

function sourcemapCandidates(jsUrl, jsBodyText) {
  const candidates = [];
  const match = jsBodyText.match(/sourceMappingURL=([^\s*]+)/);
  if (match?.[1]) {
    const u = normalizeUrl(jsUrl, match[1].trim());
    if (u) candidates.push(u);
  }
  candidates.push(`${jsUrl}.map`);
  if (jsUrl.endsWith('.js')) candidates.push(jsUrl.replace(/\.js$/i, '.map'));
  return [...new Set(candidates)];
}

async function processMap(mapUrl, jsRecord) {
  try {
    const response = await fetchWithAxios(mapUrl);
    if (response.status >= 400) {
      mapFindings.push({ jsUrl: jsRecord.finalUrl, mapUrl, status: 'http_error', detail: response.status });
      return;
    }
    const contentType = response.headers['content-type'] || 'application/json';
    const buffer = Buffer.from(response.data);
    const savedPath = await saveBuffer('maps', mapUrl, buffer, extForContentType(contentType, '.map'));

    let reconstructed = 0;
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
      mapFindings.push({ jsUrl: jsRecord.finalUrl, mapUrl, status: 'invalid_json', savedPath });
      return;
    }

    if (Array.isArray(parsed.sourcesContent) && parsed.sourcesContent.length > 0) {
      for (let i = 0; i < parsed.sourcesContent.length; i += 1) {
        const content = parsed.sourcesContent[i];
        if (typeof content !== 'string') continue;
        const sourceName = parsed.sources?.[i] || `source-${i}.txt`;
        const safeName = sourceName.replace(/^([a-z]+:)?\/\//i, '').replace(/\.\.+/g, '_');
        const digest = crypto.createHash('sha1').update(mapUrl).digest('hex').slice(0, 8);
        const outPath = path.join(repoRoot, 'reconstructed', digest, safeName.replace(/^\/+/, ''));
        if (!options.dryRun) {
          await fs.ensureDir(path.dirname(outPath));
          await fs.writeFile(outPath, content, 'utf8');
        }
        reconstructed += 1;
      }
    }

    reconstructedCount += reconstructed;
    mapFindings.push({ jsUrl: jsRecord.finalUrl, mapUrl, status: reconstructed ? 'sourcesContent_reconstructed' : 'no_sourcesContent', savedPath, reconstructed });
  } catch (error) {
    mapFindings.push({ jsUrl: jsRecord.finalUrl, mapUrl, status: 'fetch_error', detail: error.message });
  }
}

async function runSourceMapPass() {
  const jsRecords = assetRecords.filter((r) => !r.skipped && r.assetType === 'js' && r.savedPath);
  for (const jsRecord of jsRecords) {
    if (assetRecords.length >= options.maxAssets) break;
    try {
      const jsPath = path.join(repoRoot, jsRecord.savedPath);
      const jsBody = await fs.readFile(jsPath, 'utf8').catch(() => '');
      const candidates = sourcemapCandidates(jsRecord.finalUrl || jsRecord.requestUrl, jsBody);
      if (!candidates.length) {
        mapFindings.push({ jsUrl: jsRecord.finalUrl, status: 'no_candidates' });
      }
      for (const candidate of candidates) {
        await processMap(candidate, jsRecord);
      }
    } catch (error) {
      mapFindings.push({ jsUrl: jsRecord.finalUrl, status: 'probe_error', detail: error.message });
    }
  }
}

function toMarkdownSummary(targets, visitedTargets) {
  const byType = assetRecords.reduce((acc, item) => {
    if (item.skipped) return acc;
    acc[item.assetType] = (acc[item.assetType] || 0) + 1;
    return acc;
  }, {});

  const mapFound = mapFindings.filter((m) => m.status === 'sourcesContent_reconstructed' || m.status === 'no_sourcesContent' || m.status === 'invalid_json').length;
  const lines = [
    '# Recovery Inventory',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Targets read from targets.txt',
    ...targets.map((t) => `- ${t}`),
    '',
    '## Targets visited in this test run',
    ...visitedTargets.map((t) => `- ${t}`),
    '',
    '## Assets captured by type',
    ...Object.entries(byType).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Skipped assets by reason',
    ...Object.entries(skippedByReason).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Source-map findings',
    `- Source map probes: ${mapFindings.length}`,
    `- Source maps found/parsed attempts: ${mapFound}`,
    '',
    '## Reconstructed source findings',
    `- Reconstructed files from sourcesContent: ${reconstructedCount}`,
    '',
    '## Failures and HTTP errors',
    ...failures.map((f) => `- [${f.stage}] ${f.url} :: ${f.error}`),
    '',
    '## Coverage gaps',
    '- Interactions are limited to scrolling and conservative same-origin link following.',
    '- Media, font, analytics, and tracking URLs are skipped by design.',
    '',
    '## Recommended next pass',
    '- Increase --max-pages-per-origin and --max-assets gradually per origin.',
    '- Run on all targets once this small test output is validated.',
    '',
    '## Crawl status',
    '- Full crawl has NOT yet been run.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  for (const dir of CAPTURE_DIRS) await fs.ensureDir(path.join(repoRoot, dir));
  if (!options.dryRun) await fs.writeFile(logPath, '');

  const targets = resolveTargets();
  log(`targets: ${targets.length}`);
  const visitedTargets = [];

  for (const targetUrl of targets) {
    if (assetRecords.length >= options.maxAssets) break;
    visitedTargets.push(targetUrl);
    await runStaticPass(targetUrl);
    if (options.runtime) await runRuntimePass(targetUrl);
  }

  if (options.sourcemaps) await runSourceMapPass();

  const assetsPath = path.join(repoRoot, 'reports', 'assets.json');
  const inventoryPath = path.join(repoRoot, 'reports', 'inventory.md');
  if (!options.dryRun) {
    await fs.writeJson(assetsPath, {
      generatedAt: new Date().toISOString(),
      options,
      targetsVisited: visitedTargets,
      assets: assetRecords,
      failures,
      sourceMaps: mapFindings,
      reconstructedCount,
    }, { spaces: 2 });
    await fs.writeFile(inventoryPath, toMarkdownSummary(targets, visitedTargets), 'utf8');
  }

  log(`done assets=${assetRecords.length} failures=${failures.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
