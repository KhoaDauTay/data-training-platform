// node spike-nosql/build.mjs <scratch>: bundles into <scratch>/dist using <scratch>/node_modules (no deps in the repo).
import { cpSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { build } = await import(pathToFileURL(join(process.argv[2], 'node_modules/esbuild/lib/main.js')).href);

const scratch = process.argv[2], here = dirname(fileURLToPath(import.meta.url)), dist = join(scratch, 'dist');
mkdirSync(join(dist, 'dynoxide'), { recursive: true });
await build({ entryPoints: [join(here, 'main.js'), join(here, 'mongo-worker.js')], bundle: true, minify: true, format: 'esm', outdir: dist, nodePaths: [join(scratch, 'node_modules')] });
cpSync(join(here, 'index.html'), join(dist, 'index.html'));
const dx = join(scratch, 'node_modules/@dynoxide/wasm-engine');
for (const f of ['dynoxide-worker.js', 'dynoxide_bg.wasm', 'sqlite3.wasm', 'manifest.json']) cpSync(join(dx, f), join(dist, 'dynoxide', f));
const walk = (d) => readdirSync(d).flatMap((f) => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
for (const f of walk(dist)) { const b = readFileSync(f); console.log(f.slice(dist.length + 1).padEnd(32), String(b.length).padStart(9), 'gz', String(gzipSync(b, { level: 9 }).length).padStart(8)); }
