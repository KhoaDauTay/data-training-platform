// The finance schema and seed as raw SQL (Plan 11). Only src/db/lab.ts imports this, with import(), so the worker
// fetches it as its own chunk the first time ensureSchema(db, 'fin') runs (budget group `finseed`).
export { default as schema } from './fin/schema.sql?raw';
export { default as seed } from './fin/seed.sql?raw';
