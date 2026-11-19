import { activeDomain, isLiveDomain, type DomainId } from './domains';

/**
 * Hash routes without a framework (product-design-v5 §B.3, v6 §3.3). Practice runs and the Sandbox stay session modes
 * inside 'play' (Plan 7 V5); every reading page (home, learn, practice, overview, map) is drawn in <main id="home">.
 */
export const ROUTES = ['home', 'learn', 'practice', 'overview', 'play', 'data', 'dashboard', 'map', 'me', 'engine'] as const; // v16 (L142): 'me' = #/me, My progress; ENG-CORE (L220): 'engine' = #/engine…
// v14 T5 (v9 D-F8): 'soon' (the "Coming soon" page) is gone; a remembered 'soon' reads as home (isRoute). A fourth domain gets it back from git.
export type Route = (typeof ROUTES)[number];

/** Last route shown: a device convenience, never part of Save. Values saved before Plan 7 (home/play/data/dashboard) stay valid. */
export const ROUTE_KEY = 'cargo-query/route';

/** The open domain's base hash (Plan 9): domain pages follow activeDomain(); old hashes still mean Logistics (canonicalHash). */
const D = (): string => `#/d/${activeDomain()}`;
const hashTable = (): Record<Route, string> => ({
  home: '#/', learn: '#/learn', practice: '#/practice', overview: D(), play: `${D()}/play`, data: `${D()}/data`,
  dashboard: `${D()}/dashboard`, map: `${D()}/map`, me: '#/me', engine: '#/engine',
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
 * The workspace's hash for what it holds (`lab` = the General workspace's own hash while it holds a drill or an interview
 * question (drillHash) or a review of drills (LEARN_PLAY), else undefined). A drill hash is kept: a reload or Back reopens that
 * drill (main.ts). LEARN_PLAY without its review of drills (a reload drops the session, or Back after a drill replaced the
 * review) → the Practise SQL hub. Any other hash is returned as it is. FIX-1 (L147, amends L135): `#/d/<d>/play` is no longer
 * an alias of the open General work (Back to it seemed to do nothing); generalNav leaves the General work instead.
 */
export function workspaceHash(hash: string, lab: string | undefined): string {
  if (drillOfHash(hash)) return hash;
  return /^#\/?learn\/play(?=$|[/?])/.test(hash) && lab !== LEARN_PLAY ? '#/practice' : hash;
}

/**
 * FIX-1 (L147): what a hashchange (Back, Forward, a link) means for the General work. `{ open }`: the hash names another drill or
 * interview question than the open one (`lab`), so main.ts opens it (drafts are already saved on every edit). `'leave'`: General
 * work is open and the hash is a domain's workspace or LEARN_PLAY without its review, so the session drops back to the story.
 */
export function generalNav(hash: string, lab: string | undefined): { open: string } | 'leave' | undefined {
  const id = drillOfHash(hash);
  if (id) return lab && drillOfHash(lab) === id ? undefined : { open: id };
  if (!lab || hash === lab) return undefined;
  return /^#\/?(d\/[a-z]+|learn)\/play(?=$|[/?])/.test(hash) ? 'leave' : undefined;
}

/** The General workspace holding one drill: `#/learn/play/<drill id>`, so a reload reopens that drill (its draft is in the save). */
export const drillHash = (id: string): string => `${LEARN_PLAY}/${id}`;
/** The drill id in a drill workspace hash, else undefined. Ids are checked against the drill id pattern (never free text). */
export const drillOfHash = (hash: string): string | undefined => /^#\/?learn\/play\/(g-[a-z0-9-]+)$/.exec(hash)?.[1];

/** v17 I5 (L144): the interview room's list page, in the General area. A run uses drillHash(<question or step id>). */
export const INTERVIEW_PAGE = '#/learn/interview';
export const isInterviewPage = (hash: string): boolean => /^#\/?learn\/interview(?=$|[/?])/.test(hash);
/** Interview questions and take-home steps (`g-iv-…`): drillOfHash matches them too, so the boot reopens them as an interview. */
export const isInterviewId = (id: string): boolean => id.startsWith('g-iv-');

/** '' (no hash) → undefined, so the remembered route can be used; any unknown path falls back to home. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === '') return undefined;
  const [a = '', b = '', c = ''] = canonicalHash(hash).replace(/^#\/?/, '').split('?')[0].split('/');
  if (a === '') return 'home';
  if (a === 'learn' && b === 'play') return 'play'; // v15 Q1: the General workspace (a drill or a review of drills)
  if (a === 'learn' || a === 'practice' || a === 'me' || a === 'engine') return a;
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

/**
 * ENG-CORE (L220): `#/engine/<engine>[/<level>/<lesson id>]` → its parts; kept forever. Only known engine names, `L1`–`L5`
 * (either case) and lesson ids `e-…` pass; anything else is dropped (the page falls back to the engine or the overview).
 */
export function engineRouteOf(hash: string): { engine?: string; level?: string; lesson?: string } {
  const m = /^#\/?engine(?:\/(postgres|mongodb|dynamodb)(?:\/([lL][1-5])\/(e-[a-z0-9-]+))?)?(?=$|[/?])/.exec(hash);
  return m ? { engine: m[1], level: m[2]?.toUpperCase(), lesson: m[3] } : {};
}
/**
 * L248: `#/engine/mongodb/path[/<skill>]` → the NoSQL path page ('') or one skill's page (its slug: `mg.lookup_pipeline` is
 * `lookup-pipeline`); undefined elsewhere. Kept forever, like the lesson hashes.
 */
export const enginePathOf = (hash: string): string | undefined => /^#\/?engine\/mongodb\/path(?:\/([a-z0-9-]+))?(?=$|[/?])/.exec(hash)?.[1] ?? (/^#\/?engine\/mongodb\/path(?=$|[/?])/.test(hash) ? '' : undefined);
export const enginePathHash = (skill?: string): string => `#/engine/mongodb/path${skill ? `/${skill}` : ''}`;
/** The lesson page's hash. */
export const engineHash =(engine: string, level?: string, lesson?: string): string =>
  `#/engine/${engine}${level && lesson ? `/${level}/${lesson}` : ''}`;

/** v16 (v7 §5.3): a shared query is at most as long as a dashboard card's SQL. */
export const SHARE_MAX = 4000;
/** `#/share?d=<domain>&sql=<base64url of the UTF-8 text>`: opens that domain's Sandbox with the SQL in the editor, never run. */
export const shareHash = (sql: string, d: DomainId): string =>
  `#/share?d=${d}&sql=${btoa(String.fromCharCode(...new TextEncoder().encode(sql))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
/** The shared query in a `#/share?…` hash; undefined for any other hash, an unknown domain, bad base64/UTF-8 or SQL over SHARE_MAX. */
export function sharedOf(hash: string): { sql: string; d: DomainId } | undefined {
  const q = /^#\/?share\?(.*)$/.exec(hash)?.[1];
  if (q === undefined) return undefined;
  const p = new URLSearchParams(q);
  const d = p.get('d') ?? undefined;
  try {
    const sql = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob((p.get('sql') ?? '').replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
    return isLiveDomain(d) && sql.trim() && sql.length <= SHARE_MAX ? { sql, d } : undefined;
  } catch {
    return undefined;
  }
}

/** `#/d/<id>…` of a live domain (old hashes count as Logistics) → that domain; any other page → undefined (keeps the last domain). */
export function domainOfHash(hash: string): DomainId | undefined {
  const id = /^#\/?d\/([a-z]+)(?=$|[/?])/.exec(canonicalHash(hash))?.[1];
  return isLiveDomain(id) ? id : undefined;
}
