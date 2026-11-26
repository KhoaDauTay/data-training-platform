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

/**
 * v22 (P2-1, L271): libpg-query's ESM entry starts loading its wasm on import, from `<chunk dir>/libpg-query.wasm`, a file
 * the build never emits (404 HTML, "Aborted(CompileError…)" in the worker). src/viz/parser.ts hands it the hashed `?url`
 * file through loadModule({ wasm }), which instantiates on demand, so the eager call is dropped. Vitest (Node) loads
 * node_modules untransformed and keeps the library's own load; dev pre-bundles it (CJS inside), so the extra 404 stays
 * there (dev only). Throws when an upgrade changes the line.
 */
const pgQueryNoEagerLoad = (): Plugin => ({
  name: 'cq-libpg-query-lazy',
  transform(code, id) {
    if (!/libpg-query\/wasm\/index\.js$/.test(id.split('?')[0])) return;
    const out = code.replace(/^instantiate\(\);$/m, '');
    if (out === code) throw new Error('cq-libpg-query-lazy: top-level instantiate() not found; re-check libpg-query');
    return out;
  },
});

export default defineConfig({
  // V22-E (L201): content/**/*.yml and `.md?fm` frontmatter become JSON at build time (dev and Vitest too): no `yaml` in the browser.
  plugins: [contentJson(), tailwindcss(), serviceWorker(), pgQueryNoEagerLoad()],
  // No `base` here: GitHub Pages passes `--base=/<repo>/` on the CLI; '/' keeps dev and Cloudflare Pages unchanged.
  define: {
    __BUILD__: JSON.stringify(sha ? sha.slice(0, 7) : 'dev'),
    // V16-OFFLINE (L143): the seeded-DB snapshot key (src/db/snapshot.ts), computed here so the worker never fetches a seed to check it.
    __SEED_HASH__: JSON.stringify(seedHash()),
    __PGLITE__: JSON.stringify(pgliteVersion()),
  },
  // PGlite tự nạp file .wasm/.data qua import.meta.url; pre-bundle sẽ làm hỏng đường dẫn.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es', plugins: () => [pgQueryNoEagerLoad()] },
  // ui-ux-v6 §2.2: Vite 8 drops @license comments when it minifies; GSAP's licence forbids removing its notice (check-budget.mjs checks it).
  // ENG-VIZ (L236) was a second build entry until L248: src/engine/vizRegistry.ts now loads engineViz lazily.
  // v24 R0 (L337): one chunk per General full lesson, named `gl-<skill>-<hash>.js` so check-budget can hold each to its budget.
  // v39 (L601): one chunk per figure spec, `fig-<name>-<hash>.js` (content/figures/<name>.yml as JSON), budget `figureSpec` per file.
  build: { rolldownOptions: { output: { comments: { legal: true },
    chunkFileNames: (c) => (c.facadeModuleId?.includes('/content/general/lessons/') ? 'assets/gl-[name]-[hash].js'
      : c.facadeModuleId?.includes('/content/figures/') ? 'assets/fig-[name]-[hash].js' : 'assets/[name]-[hash].js') } } },
  // Vitest turns every .css import into '' unless included; tests/theme.test.ts and tests/mascots.test.ts read style.css?raw.
  test: { css: { include: [/style\.css/] }, exclude: ['**/node_modules/**', '.claude/**'], testTimeout: 60_000, hookTimeout: 60_000, setupFiles: ['tests/setup.ts'] },
});
