// Spike only: the worktree's node_modules is a junction to the main checkout, so Vite must be allowed to serve from there.
import { defineConfig } from 'vite';
export default defineConfig({
  root: new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  publicDir: 'spike-pyodide/static',
  server: { fs: { allow: ['..', 'C:/Users/khoa.huynh/Documents/study/postgres-study/node_modules'] } },
});
