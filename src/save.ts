import { emptyDashboard, readDashboard, type Dashboard } from './dashboard';
import { ECOM_ID, FIN_ID, type DomainId } from './domains';
import { addDays, MAX_BOX, type PracticeStats, type Review } from './practice';
import type { KV } from './storage';

export const SAVE_VERSION = 5;
export const SANDBOX_DRAFT_MAX = 20_000;
export const SAVE_KEY = 'cargo-query-save';

/** A domain's own dashboard cards/hidden tiles and Sandbox draft (Plan 9). */
export interface DomainSlot { dashboard: Dashboard; sandboxDraft: string }
const emptySlot = (): DomainSlot => ({ dashboard: emptyDashboard(), sandboxDraft: '' });

export interface Save {
  version: number;
  completed: string[];
  xp: number;
  hintsUsed: Record<string, number>;
  /** Key: "<ticketId>#<stepIndex>". */
  drafts: Record<string, string>;
  /**
   * SQL that passed the grader, same key as drafts (the Recap shows it). Optional on disk: a save without it
   * (older build) reads as {} and the Recap falls back to the draft, so no SAVE_VERSION bump is needed.
   */
  graded: Record<string, string>;
  // --- v2 (Plan 1c) ---
  /** Leitner card per skill id. `due` = real local day 'YYYY-MM-DD' of the player's machine, never the in-game date. */
  review: Review;
  /** Practice totals shown on Home's Review card; never affect unlocking or XP. */
  practice: PracticeStats;
  /** Sandbox editor content, at most SANDBOX_DRAFT_MAX chars. */
  sandboxDraft: string;
  /** Promotion-review step reached (0-based) for tickets not completed yet. Clamped to steps.length - 1 on use. */
  bossStep: Record<string, number>;
  // --- v3 (Plan 5, L48 D-A2) ---
  /** Player cards and hidden company tiles of the dashboard (src/dashboard.ts). */
  dashboard: Dashboard;
  /** Lane side tasks solved (content/lanes/). Never in `completed`: chapters, rank, the next ticket and KPIs ignore them. */
  lanes: string[];
  // --- v4 (Plan 9, D9-11) ---
  /** What a player owns per domain besides the shared fields. Logistics keeps the top-level dashboard and sandboxDraft. */
  byDomain: { ecommerce: DomainSlot; finance: DomainSlot };
}

/**
 * Ids that exist in the current content; saved ids not in here are dropped. `skills` is used from v2 (review).
 * `ticketIds` holds story tickets and lane side tasks (their drafts, graded SQL and hints are kept like a ticket's).
 */
/** `ticketIds` = story and lane task ids (drafts, hints, graded SQL); `laneIds` = lane task ids only (`lanes`). */
export interface Known { ticketIds: ReadonlySet<string>; laneIds: ReadonlySet<string>; skills: ReadonlySet<string> }

// Errors carry no user-facing text: the UI translates them by class / warning.kind.
export class NewerSaveError extends Error {
  name = 'NewerSaveError';
  constructor(readonly version: number) {
    super();
  }
}
export class InvalidSaveError extends Error {
  name = 'InvalidSaveError';
}
export interface SaveWarning { kind: 'corrupt' | 'newer'; version?: number }

export type Migration = (data: Record<string, unknown>, known: Known) => Record<string, unknown>;
/** Key = version migrated FROM. Keep every migration forever; deleting one strands old saves. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: pure, needs no content. Learned skills missing from `review` count as box 1 due today (practice.ts cardOf).
  1: (d) => ({ ...d, review: {}, practice: { solved: 0, weak: 0 }, sandboxDraft: '', bossStep: {} }),
  // v2 → v3: no cards, no lane task done. Bumped (not optional like `graded`) so an older build moves a v3 save to .bak
  // instead of rewriting it without the player's cards (product-design-v3 §6).
  2: (d) => ({ ...d, dashboard: emptyDashboard(), lanes: [] }),
  // v3 → v4 (Plan 9): an empty e-commerce slot. Bumped so a build from before Plan 9 moves a v4 save to .bak instead of
  // rewriting it without the e-commerce progress and cards (D9-11).
  3: (d) => ({ ...d, byDomain: { ecommerce: emptySlot() } }),
  // v4 → v5 (v14, product-design-v9 §6.1): an empty finance slot. Bumped for the same reason: a v4 build would drop the
  // fin- ids and the finance slot on its next write; with v5 it moves the save to .bak instead.
  4: (d) => ({ ...d, byDomain: { ...(isRecord(d.byDomain) ? d.byDomain : {}), finance: emptySlot() } }),
};

export const emptySave = (): Save => ({
  version: SAVE_VERSION,
  completed: [],
  xp: 0,
  hintsUsed: {},
  drafts: {},
  graded: {},
  review: {},
  practice: { solved: 0, weak: 0 },
  sandboxDraft: '',
  bossStep: {},
  dashboard: emptyDashboard(),
  lanes: [],
  byDomain: { ecommerce: emptySlot(), finance: emptySlot() },
});
export const serializeSave = (s: Save): string => JSON.stringify(s);

/** An old save is kept here (one per old version) before migrating, so a rolled-back build can still read it. */
export const oldSaveKey = (version: number): string => `${SAVE_KEY}.v${version}`;

function parseObject(raw: string): Record<string, unknown> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new InvalidSaveError();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new InvalidSaveError();
  return data as Record<string, unknown>;
}

function versionOf(data: Record<string, unknown>): number {
  const v = Number(data.version ?? 1);
  if (!Number.isInteger(v) || v < 1) throw new InvalidSaveError();
  return v;
}

/** The one place the "<ticketId>#<stepIndex>" key of drafts, graded SQL and LastRun is built and read. */
export const stepKey = (ticketId: string, stepIndex: number): string => `${ticketId}#${stepIndex}`;
export const ticketOfKey = (key: string): string => key.split('#')[0];
const isString = (x: unknown): x is string => typeof x === 'string';

/**
 * Plan 8a D8a-9: General drill ids (`g-…`) live in completed, drafts, graded and hintsUsed like ticket ids. Recognised by
 * pattern, not by a list, so reading a save never needs the lazy General chunk. src/general.ts holds the same pattern.
 */
export const DRILL_ID = /^g-[a-z0-9-]+$/;
// Plan 9 D9-7 / v14: e-commerce and finance ticket ids (ECOM_ID, FIN_ID) are kept by pattern for the same reason (lazy domain chunks).
/**
 * v17 I5 (L144): interview questions and take-home steps (`g-iv-…`) match DRILL_ID so the drill engine runs them on `lab`, but
 * the interview room writes nothing to the save (its results are the device pref `cargo-query/interview`). A save that holds
 * one anyway (an old bug, an edited file) drops it on read: it never counts as completed or learned.
 */
export const INTERVIEW_ID = /^g-iv-/;
/**
 * ENG-CORE (L220): Database Engine lessons (`e-pg-l1-01`, `e-mg-…`, `e-dy-…`) live in `completed` only, kept by pattern
 * (no SAVE_VERSION bump). Loose on purpose: a later id shape must survive a read; tests/engineContent.test.ts holds the
 * exact shape. Never a ticket, so no chapter, rank, Lily stage or "tasks done" count reads them.
 */
export const ENGINE_ID = /^e-(pg|mg|dy|ds|st|ol|bp)-[a-z0-9-]+$/; // v47 (L990): + ol // v24 BP-T (L345): Best Practice cards e-bp-<code>; v28 R4 (L420): design lessons e-ds-…; no SAVE_VERSION bump
export const isWorkId = (ids: ReadonlySet<string>, id: string): boolean =>
  !INTERVIEW_ID.test(id) && (ids.has(id) || DRILL_ID.test(id) || ECOM_ID.test(id) || FIN_ID.test(id) || ENGINE_ID.test(id));

function pickRecord<T>(v: unknown, ok: (x: unknown) => x is T, ticketIds: ReadonlySet<string>): Record<string, T> {
  const out: Record<string, T> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) if (isWorkId(ticketIds, ticketOfKey(k)) && ok(x)) out[k] = x;
  }
  return out;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day: the round-trip through Date rejects 2026-13-45 and 2026-02-30. */
const isDay = (v: unknown): v is string => typeof v === 'string' && DAY_RE.test(v) && addDays(v, 0) === v;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

type V2Fields = Pick<Save, 'review' | 'practice' | 'sandboxDraft' | 'bossStep'>;

/** Runs for every version, so tests with custom `migrations`/`version` still get a complete Save. */
function readV2(d: Record<string, unknown>, known: Known): V2Fields {
  const review: Save['review'] = {};
  if (isRecord(d.review)) {
    for (const [skill, c] of Object.entries(d.review)) {
      if (known.skills.has(skill) && isRecord(c) && isCount(c.box) && c.box >= 1 && c.box <= MAX_BOX && isDay(c.due)) {
        review[skill] = { box: c.box, due: c.due };
      }
    }
  }
  const bossStep: Save['bossStep'] = {};
  if (isRecord(d.bossStep)) {
    for (const [id, n] of Object.entries(d.bossStep)) if (isWorkId(known.ticketIds, id) && isCount(n)) bossStep[id] = n;
  }
  const p = isRecord(d.practice) ? d.practice : {};
  return {
    review,
    practice: { solved: isCount(p.solved) ? p.solved : 0, weak: isCount(p.weak) ? p.weak : isCount(p.failed) ? p.failed : 0 }, // `failed` = name before 9dacae2
    sandboxDraft: typeof d.sandboxDraft === 'string' ? d.sandboxDraft.slice(0, SANDBOX_DRAFT_MAX) : '',
    bossStep,
  };
}

function readSlot(v: unknown): DomainSlot {
  const o = isRecord(v) ? v : {};
  return { dashboard: readDashboard(o.dashboard), sandboxDraft: typeof o.sandboxDraft === 'string' ? o.sandboxDraft.slice(0, SANDBOX_DRAFT_MAX) : '' };
}

/** The one place a domain's dashboard and Sandbox draft are read or written (Plan 9): Logistics = the Save itself (v3 fields), others = byDomain[id]. */
export const domainSlot = (save: Save, id: DomainId): DomainSlot => (id === 'logistics' ? save : save.byDomain[id]);

/**
 * Throws InvalidSaveError (not JSON, bad version, missing migration) or NewerSaveError.
 * `migrations`/`version` let tests exercise the migration path with made-up versions.
 */
export function parseSave(raw: string, known: Known, migrations = MIGRATIONS, version = SAVE_VERSION): Save {
  let d = parseObject(raw);
  let v = versionOf(d);
  if (v > version) throw new NewerSaveError(v);
  while (v < version) {
    const migrate = migrations[v];
    if (!migrate) throw new InvalidSaveError();
    v++;
    d = { ...migrate(d, known), version: v };
  }
  const by = isRecord(d.byDomain) ? d.byDomain : {};
  const completed = Array.isArray(d.completed)
    ? d.completed.filter((x): x is string => typeof x === 'string' && isWorkId(known.ticketIds, x))
    : [];
  return {
    version,
    completed: [...new Set(completed)],
    xp: typeof d.xp === 'number' && Number.isFinite(d.xp) && d.xp >= 0 ? d.xp : 0,
    hintsUsed: pickRecord(d.hintsUsed, (x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0, known.ticketIds),
    drafts: pickRecord(d.drafts, isString, known.ticketIds),
    graded: pickRecord(d.graded, isString, known.ticketIds),
    ...readV2(d, known),
    dashboard: readDashboard(d.dashboard),
    lanes: Array.isArray(d.lanes) ? [...new Set(d.lanes.filter((x): x is string => typeof x === 'string' && known.laneIds.has(x)))] : [],
    byDomain: { ecommerce: readSlot(by.ecommerce), finance: readSlot(by.finance) },
  };
}

function keep(storage: KV | undefined, key: string, raw: string): void {
  try {
    storage?.setItem(key, raw);
  } catch {
    /* storage unusable: nothing more we can keep */
  }
}

/**
 * Never throws. Unreadable or newer save → empty save + warning, raw copy kept at SAVE_KEY + '.bak'.
 * Older save → raw copy kept at oldSaveKey(old) before migrating.
 */
export function loadSave(
  storage: KV | undefined,
  known: Known,
  migrations = MIGRATIONS,
  version = SAVE_VERSION,
): { save: Save; warning?: SaveWarning } {
  let raw: string | null;
  try {
    raw = storage?.getItem(SAVE_KEY) ?? null;
  } catch {
    return { save: emptySave() }; // storage blocked: writeSave returns false and the UI says so
  }
  if (!raw) return { save: emptySave() };
  try {
    const old = versionOf(parseObject(raw));
    if (old < version) keep(storage, oldSaveKey(old), raw);
    return { save: parseSave(raw, known, migrations, version) };
  } catch (e) {
    keep(storage, `${SAVE_KEY}.bak`, raw);
    const warning: SaveWarning = e instanceof NewerSaveError ? { kind: 'newer', version: e.version } : { kind: 'corrupt' };
    return { save: emptySave(), warning };
  }
}

export function writeSave(storage: KV | undefined, save: Save): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}
