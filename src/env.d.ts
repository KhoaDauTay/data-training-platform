/** Short git SHA of the build, injected by `define` in vite.config.ts ('dev' locally). */
declare const __BUILD__: string;
/** V16-OFFLINE (L143): hash of each lazily seeded schema's seed files (`game`, `lab`, `ecom`, `fin`), from vite.config.ts. */
declare const __SEED_HASH__: Record<string, string>;
/** Installed @electric-sql/pglite version (part of the snapshot key). */
declare const __PGLITE__: string;
