import type { Key } from './i18n';

/**
 * Domains (product-design-v5 §B, v6 §4). Each domain owns one Postgres schema in the single PGlite DB; `public` stays empty.
 * Schema names come only from this file, never from player input. Imported by the worker: type-only imports, no UI code.
 */
export const GAME_SCHEMA = 'logistics';

export type DomainId = 'logistics' | 'finance' | 'ecommerce';
/** `icon` is a name from src/ui/icons.ts, kept as a literal here so the worker never pulls UI code. */
export interface Domain { id: DomainId; live: boolean; icon: 'anchor' | 'percent' | 'box'; name: Key; desc: Key }
/** v5 §B.2, D-N3: Finance and E-commerce show as "Coming soon" (a page, no date promised). Plan 8 adds schema and art per domain. */
export const DOMAINS: readonly Domain[] = [
  { id: 'logistics', live: true, icon: 'anchor', name: 'domain.logistics', desc: 'domain.logisticsDesc' },
  { id: 'finance', live: false, icon: 'percent', name: 'domain.finance', desc: 'domain.financeDesc' },
  { id: 'ecommerce', live: false, icon: 'box', name: 'domain.ecommerce', desc: 'domain.ecommerceDesc' },
];

/** Every schema a request may name (Plan 8a D8a-4). Only these strings are ever inlined into SQL (never player input). */
export const SCHEMAS = { game: GAME_SCHEMA, lab: 'lab', ecom: 'ecom' } as const;

/** Tables of the ecom schema (src/db/ecom/schema.sql; tests/ecomSeed.test.ts checks the list). A CSV import with one of these names gets `_my` (Plan 9 D9-15). */
export const ECOM_TABLES = [
  'categories', 'sellers', 'products', 'customers', 'vouchers', 'orders', 'order_items',
  'payments', 'deliveries', 'returns', 'reviews', 'web_sessions', 'ad_spend',
] as const;
export type SchemaId = keyof typeof SCHEMAS;
