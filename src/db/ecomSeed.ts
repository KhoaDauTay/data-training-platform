// The e-commerce schema and seed as raw SQL (Plan 9). Only src/db/lab.ts imports this, with import(), so the worker
// fetches it as its own chunk the first time ensureSchema(db, 'ecom') runs (budget group `ecomseed`).
export { default as schema } from './ecom/schema.sql?raw';
export { default as seed } from './ecom/seed.sql?raw';
