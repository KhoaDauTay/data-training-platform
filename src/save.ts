import type { KV } from './storage';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'cargo-query-save';

export interface Save {
  version: number;
  completed: string[];
  xp: number;
  hintsUsed: Record<string, number>;
  /** Key: "<ticketId>#<stepIndex>". */
  drafts: Record<string, string>;
}

/** Ids that exist in the current content; saved ids not in here are dropped. `skills` is used from v2 (review). */
export interface Known { ticketIds: ReadonlySet<string>; skills: ReadonlySet<string> }

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
export const MIGRATIONS: Record<number, Migration> = {};

export const emptySave = (): Save => ({ version: SAVE_VERSION, completed: [], xp: 0, hintsUsed: {}, drafts: {} });
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

const ticketOf = (key: string) => key.split('#')[0];

function pickRecord<T>(v: unknown, ok: (x: unknown) => x is T, ticketIds: ReadonlySet<string>): Record<string, T> {
  const out: Record<string, T> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) if (ticketIds.has(ticketOf(k)) && ok(x)) out[k] = x;
  }
  return out;
}

/**
 * Throws InvalidSaveError (not JSON, bad version, missing migration) or NewerSaveError.
 * `migrations`/`version` let tests exercise the migration path while SAVE_VERSION is 1.
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
  const completed = Array.isArray(d.completed)
    ? d.completed.filter((x): x is string => typeof x === 'string' && known.ticketIds.has(x))
    : [];
  return {
    version,
    completed: [...new Set(completed)],
    xp: typeof d.xp === 'number' && Number.isFinite(d.xp) && d.xp >= 0 ? d.xp : 0,
    hintsUsed: pickRecord(d.hintsUsed, (x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0, known.ticketIds),
    drafts: pickRecord(d.drafts, (x): x is string => typeof x === 'string', known.ticketIds),
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
