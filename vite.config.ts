import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// GITHUB_SHA is set by GitHub Actions; local builds and tests report 'dev'.
// Read through loadEnv (it also reads process.env) because the repo has no @types/node.
const sha = loadEnv('', '.', 'GITHUB_SHA').GITHUB_SHA;

export default defineConfig({
  plugins: [tailwindcss()],
  // No `base` here: GitHub Pages passes `--base=/<repo>/` on the CLI; '/' keeps dev and Cloudflare Pages unchanged.
  define: { __BUILD__: JSON.stringify(sha ? sha.slice(0, 7) : 'dev') },
  // PGlite tự nạp file .wasm/.data qua import.meta.url; pre-bundle sẽ làm hỏng đường dẫn.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  test: { testTimeout: 60_000, hookTimeout: 60_000, setupFiles: ['tests/setup.ts'] },
});
