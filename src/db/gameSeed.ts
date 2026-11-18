// The Logistics schema and seed as raw SQL (v12.0 P1). Only src/db/lab.ts imports this, with import(), so the worker
// fetches it as its own chunk the first time ensureSchema(db, 'game') runs (budget group `gameseed`).
export { default as schema } from './schema.sql?raw';
export { default as seed } from './seed.sql?raw';
