/**
 * Domains (product-design-v5 §B, v6 §4). Each domain owns one Postgres schema in the single PGlite DB; `public` stays empty.
 * Schema names come only from this file, never from player input. Imported by the worker: keep it free of UI imports.
 */
export const GAME_SCHEMA = 'logistics';
