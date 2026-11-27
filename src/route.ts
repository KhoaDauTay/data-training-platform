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
// FIX-FB (L310): the Sandbox has its own hash, `#/d/<domain>/sandbox`, still the 'play' route (the same mounted workspace,
// session mode 'sandbox'); the router enters the mode from the hash (main.ts) and go('play') picks it while the Sandbox is open.
const DOMAIN_PAGE: Record<string, Route> = { '': 'overview', play: 'play', sandbox: 'play', data: 'data', dashboard: 'dashboard', map: 'map' };
/** L310: the domain's Sandbox. */
export const sandboxHash = (d: DomainId): string => `#/d/${d}/sandbox`;
export const isSandboxHash = (hash: string): boolean => /^#\/?d\/[a-z]+\/sandbox(?=$|[/?])/.test(hash);

export const hashOf = (r: Route): string => hashTable()[r];
export const isRoute = (v: unknown): v is Route => ROUTES.includes(v as Route);
/** A domain's pages: the sidebar lists the domain's items and the top bar shows its chapter and rank (v6 §3.1). */
export const inDomain = (r: Route): boolean => r === 'overview' || r === 'play' || r === 'data' || r === 'dashboard' || r === 'map';
export const domainHash = (id: DomainId): string => `#/d/${id}`;

/** Hashes from before Plan 7 (#/play, #/data/<t>, #/dashboard) → the same page, tail kept. Kept forever (v5 §B.3). */
export function canonicalHash(hash: string): string {
  const m = /^#\/?(play|data|dashboard)(?=$|[/?])(.*)$/.exec(hash);
  if (m) return `#/d/logistics/${m[1]}${m[2]}`;
  // v47 S4 (L981): the Engine interview room merged into #/learn/interview; `#/engine/interview[/<set|take-home>]` kept forever
  const iv = /^#\/?engine\/interview(?:\/([a-z0-9-]+))?(?=$|[/?])/.exec(hash);
  if (!iv) return hash;
  return ivRun(iv[1]) ? `${INTERVIEW_PAGE}/${iv[1]}` : interviewTabHash('pg'); // an unknown tail opened the room (then on PostgreSQL)
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
  return /^#\/?(d\/[a-z]+|learn)\/play(?=$|[/?])/.test(hash) ? 'leave' : undefined; // L310: also Back from the Sandbox (`lab` = its hash) to the workspace
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

/** `#/learn/sql/<n>` → Part n of content/general/route.yml (v24, L335; was one per chapter, L27); else undefined (the page opens the current chapter's module). */
export function learnModuleOf(hash: string): number | undefined {
  const n = Number(/^#\/?learn\/sql\/(\d{1,2})(?=$|[/?])/.exec(hash)?.[1]);
  return n >= 1 && n <= 12 ? n : undefined;
}

/** `#/learn/skill/<id>` → the skill page (Plan 8a); anything but `[a-z0-9_]+` → undefined (the page shows #/learn). */
export const learnSkillOf = (hash: string): string | undefined => /^#\/?learn\/skill\/([a-z0-9_]+)(?=$|[/?])/.exec(hash)?.[1];
/** `#/learn/adv/<node>` → the advanced node page (Plan 8a). */
export const learnAdvOf = (hash: string): string | undefined => /^#\/?learn\/adv\/([a-z0-9_]+)(?=$|[/?])/i.exec(hash)?.[1].toLowerCase(); // #/learn/adv/A1 = a1 (L93): pages print ids in capitals

/**
 * ENG-CORE (L220): `#/engine/<engine>[/<level>[/<lesson id>]]` → its parts (a level alone = the level page, L280); kept forever. Only known engine names, `L1`–`L5`
 * (either case) and lesson ids `e-…` pass; anything else is dropped (the page falls back to the engine or the overview).
 */
export function engineRouteOf(hash: string): { engine?: string; level?: string; lesson?: string } {
  const m = /^#\/?engine(?:\/(postgres|mongodb|dynamodb|redis|design|stack|olap|search|timeseries|telemetry|graph|stream)(?:\/([lL][1-5]|ext)(?:\/(e-[a-z0-9-]+))?)?)?(?=$|[/?])/.exec(hash);
  if (m?.[2] === 'ext' && m[1] !== 'postgres') return { engine: m[1] }; // v43 (L720): the Extensions shelf is PostgreSQL's only
  return m ? { engine: m[1], level: m[2]?.toUpperCase(), lesson: m[3] } : {};
}
/**
 * L248: `#/engine/mongodb/path[/<skill>]` → the NoSQL path page ('') or one skill's page (its slug: `mg.lookup_pipeline` is
 * `lookup-pipeline`); undefined elsewhere. Kept forever, like the lesson hashes.
 */
export const enginePathOf = (hash: string): string | undefined => /^#\/?engine\/mongodb\/path(?:\/([a-z0-9-]+))?(?=$|[/?])/.exec(hash)?.[1] ?? (/^#\/?engine\/mongodb\/path(?=$|[/?])/.test(hash) ? '' : undefined);
export const enginePathHash = (skill?: string): string => `#/engine/mongodb/path${skill ? `/${skill}` : ''}`;
/**
 * v27 (L410): `#/engine/terms[/<term id>]` → '' (the glossary page) or the term's id (a slug: the page scrolls to it, or shows
 * the list when no term has that id); undefined elsewhere. Checked before engineRouteOf, which drops `terms`.
 */
export function engineTermsOf(hash: string): string | undefined {
  const m = /^#\/?engine\/terms(?:\/([a-z0-9-]+))?(?=$|[/?])/.exec(hash);
  return m ? (m[1] ?? '') : undefined;
}
export const engineTermsHash = (id?: string): string => `#/engine/terms${id ? `/${id}` : ''}`;
/** An engine bank's set (`pg-mid-2`, `again` = the questions due for review) or take-home (`e-iv-pg-th-1`), else undefined. */
function ivRun(x = ''): { set?: string; th?: string } | undefined {
  return /^(pg|mg|dy)-(junior|mid|senior|staff)-[1-3]$|^(mg|dy)-senior-4$|^(rd|ts|ol|sr|tm|sm|gr)-(junior|mid)-1$|^again$/.test(x) ? { set: x } : /^e-iv-(pg|mg|dy)-th-[1-9]$/.test(x) ? { th: x } : undefined; // v48 (L1144): + one Junior and one Mid set per track
}
/**
 * v47 S4 (I5, L980–L981): ONE interview room, `#/learn/interview`, with tabs SQL (no query) / PostgreSQL / MongoDB / DynamoDB
 * (`?e=pg|mg|dy`). An engine bank's set run or take-home is `#/learn/interview/<set|take-home id>` → `{ set }` / `{ th }`;
 * undefined elsewhere (an unknown tail draws the room). The v27 hashes `#/engine/interview…` are aliases (canonicalHash).
 */
export type IvTab = 'sql' | 'pg' | 'mg' | 'dy' | 'more'; // v48 (L1145): 'more' = the seven tracks' banks
export const engineInterviewOf = (hash: string): { set?: string; th?: string } | undefined => ivRun(/^#\/?learn\/interview\/([a-z0-9-]+)(?=$|[/?])/.exec(hash)?.[1]);
export const interviewTabOf = (hash: string): IvTab => (/^#\/?learn\/interview\/?\?(?:.*&)?e=(pg|mg|dy|more)(?=$|&)/.exec(hash)?.[1] as IvTab | undefined) ?? 'sql';
export const interviewTabHash = (tab: IvTab): string => (tab === 'sql' ? INTERVIEW_PAGE : `${INTERVIEW_PAGE}?e=${tab}`);
/** A set run or take-home; no argument = the room on its PostgreSQL tab (the Databases hub and sidebar link there). */
export const engineInterviewHash = (x?: string): string => (x ? `${INTERVIEW_PAGE}/${x}` : interviewTabHash('pg'));
/** v28 (L430): `#/engine/compare` (the "Which engine?" page) → true; checked before engineRouteOf, which drops `compare`. */
export const engineCompareOf = (hash: string): boolean => /^#\/?engine\/compare(?=$|[/?])/.test(hash);
export const engineCompareHash = (): string => '#/engine/compare';
/** The engine, level or lesson page's hash; level `EXT` = `#/engine/postgres/ext` (v43 L720: the Extensions shelf, kept forever). */
export const engineHash = (engine: string, level?: string, lesson?: string): string =>
  `#/engine/${engine}${level ? `/${level === 'EXT' ? 'ext' : level}${lesson ? `/${lesson}` : ''}` : ''}`;
const ENGINE_OF: Record<string, string> = { pg: 'postgres', mg: 'mongodb', dy: 'dynamodb', rd: 'redis', ds: 'design', st: 'stack', ol: 'olap', sr: 'search', ts: 'timeseries', tm: 'telemetry', gr: 'graph', sm: 'stream' };
/** L280: `#/engine/play/<lesson id>` (named by engine-ux-spec §5.1, never built) → that lesson's hash; undefined elsewhere. */
export function enginePlayOf(hash: string): string | undefined {
  const m = /^#\/?engine\/play\/(e-(pg|mg|dy|rd|ds|st|ol|sr|ts|tm|gr|sm)-l([1-5])-[a-z0-9-]+)(?=$|[/?])/.exec(hash);
  return m ? engineHash(ENGINE_OF[m[2]], `L${m[3]}`, m[1]) : undefined;
}

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
