import tailwindcss from '@tailwindcss/vite';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { contentJson } from './scripts/contentJson.mjs';
import { pgliteVersion, seedHash, writeServiceWorker } from './scripts/offline.mjs';

// GITHUB_SHA is set by GitHub Actions; local builds and tests report 'dev'.
// Read through loadEnv (it also reads process.env) because the repo has no @types/node.
const sha = loadEnv('', '.', 'GITHUB_SHA').GITHUB_SHA;

/** V16-OFFLINE (D-N6, L143): dist/sw.js (from public/sw.js) gets this build's file list and version once the bundle is written. */
const serviceWorker = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'cq-service-worker',
    apply: 'build',
    configResolved: (c) => void (outDir = c.build.outDir),
    closeBundle: () => void writeServiceWorker(outDir),
  };
};

export default defineConfig({
  // V22-E (L201): content/**/*.yml and `.md?fm` frontmatter become JSON at build time (dev and Vitest too): no `yaml` in the browser.
  plugins: [contentJson(), tailwindcss(), serviceWorker()],
  // No `base` here: GitHub Pages passes `--base=/<repo>/` on the CLI; '/' keeps dev and Cloudflare Pages unchanged.
  define: {
    __BUILD__: JSON.stringify(sha ? sha.slice(0, 7) : 'dev'),
    // V16-OFFLINE (L143): the seeded-DB snapshot key (src/db/snapshot.ts), computed here so the worker never fetches a seed to check it.
    __SEED_HASH__: JSON.stringify(seedHash()),
    __PGLITE__: JSON.stringify(pgliteVersion()),
  },
  // PGlite tự nạp file .wasm/.data qua import.meta.url; pre-bundle sẽ làm hỏng đường dẫn.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  // ui-ux-v6 §2.2: Vite 8 drops @license comments when it minifies; GSAP's licence forbids removing its notice (check-budget.mjs checks it).
  // ENG-VIZ (L236) was a second build entry until L247: src/engine/vizRegistry.ts now loads engineViz lazily.
  build: { rolldownOptions: { output: { comments: { legal: true } } } },
  // Vitest turns every .css import into '' unless included; tests/theme.test.ts and tests/mascots.test.ts read style.css?raw.
  test: { css: { include: [/style\.css/] }, exclude: ['**/node_modules/**', '.claude/**'], testTimeout: 60_000, hookTimeout: 60_000, setupFiles: ['tests/setup.ts'] },
});
