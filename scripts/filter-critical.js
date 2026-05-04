#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'work', 'sources', 'fluid', 'raw');
const OUT_DIR = path.join(ROOT, 'work', 'sources', 'fluid', 'filtered');
const REPORT_FILE = path.join(ROOT, 'work', 'sources', 'fluid', 'reports', 'filter-summary.json');

const keywords = [
  'raf',
  'requestAnimationFrame',
  'scroll',
  'progress',
  'timeline',
  'gsap',
  'transition',
  'overlay',
  'loader',
  'menu',
];

function hasKeyword(text) {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

async function run() {
  await fs.ensureDir(OUT_DIR);
  const files = (await fs.readdir(SOURCE_DIR)).filter((name) => /\.(js|css|html|json|txt)$/i.test(name));

  const matched = [];
  for (const name of files) {
    const sourcePath = path.join(SOURCE_DIR, name);
    let text = '';
    try {
      text = await fs.readFile(sourcePath, 'utf8');
    } catch {
      continue;
    }

    if (!hasKeyword(text)) continue;

    const targetPath = path.join(OUT_DIR, name);
    await fs.copyFile(sourcePath, targetPath);
    matched.push({ file: path.relative(ROOT, targetPath), source: path.relative(ROOT, sourcePath) });
  }

  const summary = {
    keywordCount: keywords.length,
    sourceFileCount: files.length,
    matchedCount: matched.length,
    keywords,
    matched,
  };

  await fs.ensureDir(path.dirname(REPORT_FILE));
  await fs.writeJson(REPORT_FILE, summary, { spaces: 2 });

  console.log(`Scanned ${files.length} files.`);
  console.log(`Matched ${matched.length} files.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
