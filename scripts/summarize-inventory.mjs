import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const assetsPath = path.join(repoRoot, 'reports', 'assets.json');
const inventoryPath = path.join(repoRoot, 'reports', 'inventory.md');

async function main() {
  if (!(await fs.pathExists(assetsPath))) {
    console.log('No reports/assets.json found. Run npm run recover first.');
    return;
  }

  const data = await fs.readJson(assetsPath);
  const byType = (data.assets || []).reduce((acc, item) => {
    if (item.skipped) return acc;
    acc[item.assetType] = (acc[item.assetType] || 0) + 1;
    return acc;
  }, {});
  const skipped = (data.assets || []).reduce((acc, item) => {
    if (!item.skipped || !item.skipReason) return acc;
    acc[item.skipReason] = (acc[item.skipReason] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    '# Recovery Inventory',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Targets read from targets.txt',
    ...((await fs.readFile(path.join(repoRoot, 'targets.txt'), 'utf8')).split(/\r?\n/).filter(Boolean).map((t) => `- ${t}`)),
    '',
    '## Targets visited in the test run',
    ...(data.targetsVisited || []).map((t) => `- ${t}`),
    '',
    '## Assets captured by type',
    ...Object.entries(byType).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Skipped assets by reason',
    ...Object.entries(skipped).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Source-map findings',
    `- Source map probes: ${(data.sourceMaps || []).length}`,
    `- Source maps with reconstruction: ${(data.sourceMaps || []).filter((x) => x.status === 'sourcesContent_reconstructed').length}`,
    `- Source maps missing sourcesContent: ${(data.sourceMaps || []).filter((x) => x.status === 'no_sourcesContent').length}`,
    '',
    '## Reconstructed source findings',
    `- Reconstructed files from sourcesContent: ${data.reconstructedCount || 0}`,
    '',
    '## Failures and HTTP errors',
    ...((data.failures || []).map((f) => `- [${f.stage}] ${f.url} :: ${f.error}`)),
    '',
    '## Coverage gaps',
    '- Small pass only; not all targets and not deep interaction paths.',
    '- Analytics/media/fonts skipped by default policy.',
    '',
    '## Recommended next pass',
    '- Increase page/asset limits gradually and run across all targets.',
    '',
    '## Crawl status',
    '- Full crawl has NOT yet been run.',
    '',
  ];

  await fs.writeFile(inventoryPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${path.relative(repoRoot, inventoryPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
