// V16-OFFLINE (L143): build-time helpers for vite.config.ts, kept in .mjs because tsconfig has no Node types.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const sha256 = (...parts) => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p).update('\0');
  return h.digest('hex').slice(0, 16);
};

// The seeded-DB snapshot key (src/db/snapshot.ts): one hash per lazily seeded schema (src/db/lab.ts LAZY_SEEDS) over its
// seed files. A changed file drops the whole snapshot. A new seeded schema needs its files here.
const SEED_FILES = {
  game: ['src/db/schema.sql', 'src/db/seed.sql'],
  lab: ['src/db/lab.sql'],
  ecom: ['src/db/ecom/schema.sql', 'src/db/ecom/seed.sql'],
  fin: ['src/db/fin/schema.sql', 'src/db/fin/seed.sql'],
};
export const seedHash = () =>
  Object.fromEntries(Object.entries(SEED_FILES).map(([id, files]) => [id, sha256(...files.map((f) => readFileSync(f)))]));

/** The installed PGlite version (part of the snapshot key), read from its package, not a literal. */
export const pgliteVersion = () => JSON.parse(readFileSync('node_modules/@electric-sql/pglite/package.json', 'utf8')).version;

/**
 * Turns dist/sw.js (copied from public/sw.js) into this build's service worker: prepends VERSION (hash of every file
 * name in dist/ and of index.html), FILES (every file in dist/: worker chunks, .wasm, .data and public files included)
 * and ENTRY (the entry chunk index.html must name, so a stale index.html from the HTTP cache is never precached).
 */
export function writeServiceWorker(outDir) {
  const files = [];
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir)) {
      const path = `${dir}/${name}`;
      if (statSync(path).isDirectory()) walk(path, `${rel}${name}/`);
      else if (!/^(sw\.js|_headers)$/.test(rel + name)) files.push(rel + name);
    }
  };
  walk(outDir, '');
  files.sort();
  const html = readFileSync(`${outDir}/index.html`, 'utf8');
  const entry = /assets\/(index-[\w-]+\.js)/.exec(html)?.[1];
  if (!entry) throw new Error('sw: no entry chunk in index.html');
  const head = `const VERSION = ${JSON.stringify(sha256(files.join('\n'), html))};\nconst FILES = ${JSON.stringify(files)};\nconst ENTRY = ${JSON.stringify(entry)};\n`;
  writeFileSync(`${outDir}/sw.js`, head + readFileSync(`${outDir}/sw.js`, 'utf8'));
  return files.length;
}
