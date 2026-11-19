import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { pgliteVersion, seedHash } from './scripts/offline.mjs';

// GITHUB_SHA is set by GitHub Actions; local builds and tests report 'dev'.
// Read through loadEnv (it also reads process.env) because the repo has no @types/node.
const sha = loadEnv('', '.', 'GITHUB_SHA').GITHUB_SHA;

export default defineConfig({
  plugins: [tailwindcss()],
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
  build: { rolldownOptions: { output: { comments: { legal: true } } } },
  // Vitest turns every .css import into '' unless included; tests/theme.test.ts and tests/mascots.test.ts read style.css?raw.
  test: { css: { include: [/style\.css/] }, exclude: ['**/node_modules/**', '.claude/**'], testTimeout: 60_000, hookTimeout: 60_000, setupFiles: ['tests/setup.ts'] },
});
