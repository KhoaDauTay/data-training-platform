import type { Key } from './i18n';

/**
 * Domains (product-design-v5 §B, v6 §4). Each domain owns one Postgres schema in the single PGlite DB; `public` stays empty.
 * Schema names come only from this file, never from player input. Imported by the worker: type-only imports, no UI code.
 */
export const GAME_SCHEMA = 'logistics';

export type DomainId = 'logistics' | 'finance' | 'ecommerce';
/** `icon` is a name from src/ui/icons.ts, kept as a literal here so the worker never pulls UI code. */
export interface Domain { id: DomainId; live: boolean; icon: 'anchor' | 'percent' | 'box'; name: Key; desc: Key }
/** E-commerce is live from Plan 9, Finance from v14 T5 (the "Coming soon" page is gone, v9 D-F8). Order: Logistics, Finance, E-commerce. */
export const DOMAINS: readonly Domain[] = [
  { id: 'logistics', live: true, icon: 'anchor', name: 'domain.logistics', desc: 'domain.logisticsDesc' },
  { id: 'finance', live: true, icon: 'percent', name: 'domain.finance', desc: 'domain.financeDesc' },
  { id: 'ecommerce', live: true, icon: 'box', name: 'domain.ecommerce', desc: 'domain.ecommerceDesc' },
];

/** Every schema a request may name (Plan 8a D8a-4). Only these strings are ever inlined into SQL (never player input). */
export const SCHEMAS = { game: GAME_SCHEMA, lab: 'lab', ecom: 'ecom', fin: 'finance' } as const;

/** Tables of the ecom schema (src/db/ecom/schema.sql; tests/ecomSeed.test.ts checks the list). A CSV import with one of these names gets `_my` (Plan 9 D9-15). */
export const ECOM_TABLES = [
  'categories', 'sellers', 'products', 'customers', 'vouchers', 'orders', 'order_items',
  'payments', 'deliveries', 'returns', 'reviews', 'web_sessions', 'ad_spend',
] as const;
/** Tables of the finance schema (src/db/fin/schema.sql, in CREATE order; tests/finSeed.test.ts checks the list). Plan 11. */
export const FIN_TABLES = [
  'branches', 'products', 'customers', 'applications', 'loans', 'schedules', 'repayments', 'loan_snapshots',
  'accounts', 'budgets', 'gl_entries', 'collection_calls',
] as const;
/**
 * Tables of the Logistics schema (src/db/schema.sql; tests/startup.test.ts checks the list). Static because Logistics is
 * seeded lazily (v12.0 P1): a CSV import must avoid these names even before that seed (D10-11).
 */
export const LOGISTICS_TABLES = [
  'ports', 'carriers', 'employees', 'customers', 'shipments', 'containers', 'shipment_events', 'trucking_orders', 'cfs_receipts',
  'hs_codes', 'duties_taxes', 'customs_declarations', 'incoterms', 'exchange_rates', 'rate_contracts', 'quotations', 'invoices',
  'payments', 'vendor_bills', 'master_bills', 'house_bills', 'free_time_terms', 'container_events', 'claims', 'lane_profiles', 'bunker_prices',
] as const;
export type SchemaId = keyof typeof SCHEMAS;

/** Schema of each live domain's own tables (story, practice, sandbox, data, dashboard). Plan 9. */
export const DOMAIN_SCHEMA: Record<DomainId, SchemaId> = { logistics: 'game', ecommerce: 'ecom', finance: 'fin' };
export const isLiveDomain = (id: unknown): id is DomainId => DOMAINS.some((d) => d.id === id && d.live);

// ponytail: one module-level "open domain", since one domain's pages show at a time; pass the domain explicitly if a page ever shows two.
let active: DomainId = 'logistics';
/** The domain whose pages are open, or were last open while the player is on a General page (Plan 9 D9-12). */
export const activeDomain = (): DomainId => active;
/** Only enterDomain() (src/main.ts) and tests call this: the content of `id` must be loaded first (loadDomain). */
export const setActiveDomain = (id: DomainId): void => {
  active = id;
};
export const domainSchemaId = (d: DomainId = active): SchemaId => DOMAIN_SCHEMA[d];
export const domainSchemaName = (d: DomainId = active): string => SCHEMAS[domainSchemaId(d)];

/** E-commerce ticket ids. Save keeps them by pattern because the domain's content is a lazy chunk (D9-7, like DRILL_ID). */
export const ECOM_ID = /^ecom-ch\d{1,2}-\d{2}$/;
/** Finance ticket ids, kept by pattern in the Save like ECOM_ID (v14, Save v5). */
export const FIN_ID = /^fin-ch\d{1,2}-\d{2}$/;
/** Ticket ids of each non-Logistics domain (v9 §6.2): who owns an id, and the "{n} tasks done" line, read this one table. */
export const DOMAIN_ID: Record<Exclude<DomainId, 'logistics'>, RegExp> = { ecommerce: ECOM_ID, finance: FIN_ID };
/** The domain that owns a ticket id: Logistics unless a lazy domain's pattern matches. */
export const ownerOf = (id: string): DomainId =>
  (Object.keys(DOMAIN_ID) as (keyof typeof DOMAIN_ID)[]).find((d) => DOMAIN_ID[d].test(id)) ?? 'logistics';

/** Main-bundle words of each non-Logistics domain's pages (v9 §6.2): shown before, and without, its art chunk. */
/** `opensTo` (v20, L186): the last chapter whose promotion review opens a map point; later reviews say `domain.promotedRank`. */
export interface DomainText { story: Key; dataIntro: Key; sceneTitle: Key; mapTitle: Key; callout: Key; done: Key; promoted: Key; opensTo: number }
export const DOMAIN_TEXT: Record<Exclude<DomainId, 'logistics'>, DomainText> = {
  ecommerce: {
    story: 'ecom.briefStory', dataIntro: 'ecom.dataIntro', sceneTitle: 'ecom.scene.title', mapTitle: 'ecom.map.title',
    callout: 'ecom.scene.callout', done: 'ecom.done', promoted: 'ecom.promoted', opensTo: 5,
  },
  finance: {
    story: 'fin.briefStory', dataIntro: 'fin.dataIntro', sceneTitle: 'fin.scene.title', mapTitle: 'fin.map.title',
    callout: 'fin.scene.callout', done: 'fin.done', promoted: 'fin.promoted', opensTo: 6,
  },
};
/** The open (or given) domain's words; undefined in Logistics, whose pages have their own. */
export const domainText = (d: DomainId = active): DomainText | undefined => (d === 'logistics' ? undefined : DOMAIN_TEXT[d]);

/** Device pref: the last domain opened (a live DomainId; anything else reads as logistics). Never part of Save. */
export const DOMAIN_KEY = 'cargo-query/domain';
