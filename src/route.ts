import { activeDomain, isLiveDomain, type DomainId } from './domains';

/**
 * Hash routes without a framework (product-design-v5 §B.3, v6 §3.3). Practice runs and the Sandbox stay session modes
 * inside 'play' (Plan 7 V5); every reading page (home, learn, practice, overview, map) is drawn in <main id="home">.
 */
export const ROUTES = ['home', 'learn', 'practice', 'overview', 'play', 'data', 'dashboard', 'map'] as const;
// v14 T5 (v9 D-F8): 'soon' (the "Coming soon" page) is gone; a remembered 'soon' reads as home (isRoute). A fourth domain gets it back from git.
export type Route = (typeof ROUTES)[number];

/** Last route shown: a device convenience, never part of Save. Values saved before Plan 7 (home/play/data/dashboard) stay valid. */
export const ROUTE_KEY = 'cargo-query/route';

/** The open domain's base hash (Plan 9): domain pages follow activeDomain(); old hashes still mean Logistics (canonicalHash). */
const D = (): string => `#/d/${activeDomain()}`;
const hashTable = (): Record<Route, string> => ({
  home: '#/', learn: '#/learn', practice: '#/practice', overview: D(), play: `${D()}/play`, data: `${D()}/data`,
  dashboard: `${D()}/dashboard`, map: `${D()}/map`,
});
const DOMAIN_PAGE: Record<string, Route> = { '': 'overview', play: 'play', data: 'data', dashboard: 'dashboard', map: 'map' };

export const hashOf = (r: Route): string => hashTable()[r];
export const isRoute = (v: unknown): v is Route => ROUTES.includes(v as Route);
/** A domain's pages: the sidebar lists the domain's items and the top bar shows its chapter and rank (v6 §3.1). */
export const inDomain = (r: Route): boolean => r === 'overview' || r === 'play' || r === 'data' || r === 'dashboard' || r === 'map';
export const domainHash = (id: DomainId): string => `#/d/${id}`;

/** Hashes from before Plan 7 (#/play, #/data/<t>, #/dashboard) → the same page, tail kept. Kept forever (v5 §B.3). */
export function canonicalHash(hash: string): string {
  const m = /^#\/?(play|data|dashboard)(?=$|[/?])(.*)$/.exec(hash);
  return m ? `#/d/logistics/${m[1]}${m[2]}` : hash;
}

/** v15 Q1 (D-N2): a drill and a review of drills open the workspace here, outside every domain. */
export const LEARN_PLAY = '#/learn/play';
/**
 * The workspace's hash for what it holds (`lab` = the General workspace's own hash while it holds a drill (drillHash) or a
 * review of drills (LEARN_PLAY), else undefined). `#/d/<d>/play` holding one is an alias of
 * LEARN_PLAY, kept forever like canonicalHash; LEARN_PLAY holding nothing General (a reload drops the session) → the
 * Practise SQL hub. Any other hash is returned as it is.
 */
export function workspaceHash(hash: string, lab: string | undefined): string {
  if (lab) return /^#\/?(d\/[a-z]+|learn)\/play(?=$|[/?])/.test(hash) ? lab : hash;
  if (drillOfHash(hash)) return hash; // a reload on a drill reopens it (main.ts), never the hub: the player keeps their place
  return /^#\/?learn\/play(?=$|[/?])/.test(hash) ? '#/practice' : hash;
}

/** The General workspace holding one drill: `#/learn/play/<drill id>`, so a reload reopens that drill (its draft is in the save). */
export const drillHash = (id: string): string => `${LEARN_PLAY}/${id}`;
/** The drill id in a drill workspace hash, else undefined. Ids are checked against the drill id pattern (never free text). */
export const drillOfHash = (hash: string): string | undefined => /^#\/?learn\/play\/(g-[a-z0-9-]+)$/.exec(hash)?.[1];

/** '' (no hash) → undefined, so the remembered route can be used; any unknown path falls back to home. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === '') return undefined;
  const [a = '', b = '', c = ''] = canonicalHash(hash).replace(/^#\/?/, '').split('?')[0].split('/');
  if (a === '') return 'home';
  if (a === 'learn' && b === 'play') return 'play'; // v15 Q1: the General workspace (a drill or a review of drills)
  if (a === 'learn' || a === 'practice') return a;
  if (a !== 'd') return 'home';
  return isLiveDomain(b) && Object.hasOwn(DOMAIN_PAGE, c) ? DOMAIN_PAGE[c] : 'home';
}

export function initialRoute(hash: string, saved: unknown): Route {
  return parseRoute(hash) ?? (isRoute(saved) ? saved : 'home');
}

/** `#/d/<domain>/data/<table>` (or the old `#/data/<table>`) → the table (ui-ux-v4 §5); anything but a plain identifier is ignored. */
export function dataTableOf(hash: string): string | undefined {
  const m = /^#\/?d\/[a-z]+\/data\/([^/?]*)/.exec(canonicalHash(hash));
  return m && /^[a-z_][a-z0-9_]*$/.test(m[1]) ? m[1] : undefined;
}

/** `#/learn/sql/<n>` → module n (1–12, one per chapter, L27); else undefined (the page opens the current chapter's module). */
export function learnModuleOf(hash: string): number | undefined {
  const n = Number(/^#\/?learn\/sql\/(\d{1,2})(?=$|[/?])/.exec(hash)?.[1]);
  return n >= 1 && n <= 12 ? n : undefined;
}

/** `#/learn/skill/<id>` → the skill page (Plan 8a); anything but `[a-z0-9_]+` → undefined (the page shows #/learn). */
export const learnSkillOf = (hash: string): string | undefined => /^#\/?learn\/skill\/([a-z0-9_]+)(?=$|[/?])/.exec(hash)?.[1];
/** `#/learn/adv/<node>` → the advanced node page (Plan 8a). */
export const learnAdvOf = (hash: string): string | undefined => /^#\/?learn\/adv\/([a-z0-9_]+)(?=$|[/?])/i.exec(hash)?.[1].toLowerCase(); // #/learn/adv/A1 = a1 (L93): pages print ids in capitals

/** `#/d/<id>…` of a live domain (old hashes count as Logistics) → that domain; any other page → undefined (keeps the last domain). */
export function domainOfHash(hash: string): DomainId | undefined {
  const id = /^#\/?d\/([a-z]+)(?=$|[/?])/.exec(canonicalHash(hash))?.[1];
  return isLiveDomain(id) ? id : undefined;
}
