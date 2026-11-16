import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss()],
  // PGlite tự nạp file .wasm/.data qua import.meta.url; pre-bundle sẽ làm hỏng đường dẫn.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  test: { testTimeout: 60_000, hookTimeout: 60_000 },
});
