import { parseLine } from './parse';

/**
 * v47 spike: a Redis teaching subset in pure TS (no Node built-ins, no Date.now()). One in-memory keyspace, a virtual clock
 * (`now`, `advance(ms)`; expiry is lazy on access, like Redis' lazy path), several clients (`exec(line, client)`) so WATCH and
 * pub/sub can be shown. Replies are RESP2-shaped and `format()` prints them like redis-cli in a terminal.
 * v47 R1 (L951): error texts, reply shapes and the expiry rules were read against the Valkey 8.1 source (BSD-3, commit 38316e6c):
 * server.c, networking.c, multi.c, expire.c, db.c, t_*.c, util.c d2string, sds.c, valkey-cli.c cliFormatReplyTTY. A source
 * read, not a differential run against a live server (still owed).
 * v48 E1 (L1170–L1173), same commit: container commands (server.c commandCheckExistence: "unknown subcommand", arity as
 * 'xgroup|create'), processCommand order (unknown → arity → NO_MULTI → cluster → maxmemory → subscribe → queue), consumer
 * groups (t_stream.c xreadCommand, xgroupCommand, xack, xpending, xclaim, xautoclaim, streamTrim), maxmemory + eviction
 * (evict.c performEvictions, LFULogIncr/LFUDecrAndReturn, LFU_INIT_VAL 5, LRU clock 1 s; db.c lookupKey: TYPE/EXISTS/TTL/OBJECT
 * do not touch, an overwrite keeps the old access data), OBJECT ENCODING with valkey.conf's listpack/intset limits, CONFIG
 * GET/SET (config.c), CLUSTER KEYSLOT (cluster.c keyHashSlot, crc16.c XMODEM) and CROSSSLOT, ZUNIONSTORE/ZCOUNT/ZREMRANGEBY*.
 * Simulator rules (said in the lessons): MEMORY USAGE is BoonData's own estimate (`usage()`), not the allocator's number;
 * eviction picks the exact best key (ties by name), real Redis samples `maxmemory-samples` keys; the LFU increment uses a fixed
 * pseudo-random sequence (lessons set lfu-log-factor 0, which makes Redis' own increment deterministic: +1 per access).
 * ponytail: no Lua, no blocking (XREAD BLOCK returns at once), no keyspace events, SCAN cursors are our own slot numbers
 * (opaque, like Redis'), KEYS/SMEMBERS/HGETALL come back in insertion order (Redis leaves it unspecified: grade those unordered).
 */
export type Reply =
  | { t: 'status'; v: string }
  /** `cli`: printed by redis-cli itself, without `(error)` (an input line it cannot split). */
  | { t: 'err'; v: string; cli?: true }
  | { t: 'int'; v: number }
  | { t: 'bulk'; v: string }
  | { t: 'nil' }
  | { t: 'arr'; v: Reply[] }
  /** Several pushes for one command (SUBSCRIBE a b): redis-cli prints each one. */
  | { t: 'seq'; v: Reply[] };

class RedisError extends Error {}
const fail = (m: string): never => {
  throw new RedisError(m);
};
const WRONGTYPE = 'WRONGTYPE Operation against a key holding the wrong kind of value';
const NOT_INT = 'ERR value is not an integer or out of range';
const NOT_FLOAT = 'ERR value is not a valid float';
const SYNTAX = 'ERR syntax error';
const BAD_ID = 'ERR Invalid stream ID specified as stream command argument';
const MINMAX = 'ERR min or max is not a float';
const OOM = "OOM command not allowed when used memory > 'maxmemory'.";
const arity = (name: string): string => `ERR wrong number of arguments for '${name}' command`;

const status = (v: string): Reply => ({ t: 'status', v });
const int = (v: number): Reply => ({ t: 'int', v });
const bulk = (v: string | undefined): Reply => (v === undefined ? NIL : { t: 'bulk', v });
const arr = (v: (Reply | string)[]): Reply => ({ t: 'arr', v: v.map((x) => (typeof x === 'string' ? bulk(x) : x)) });
const NIL: Reply = { t: 'nil' };
const OK = status('OK');

const I64 = [-(2n ** 63n), 2n ** 63n - 1n] as const;
function toBig(s: string, msg = NOT_INT): bigint {
  if (!/^(0|-?[1-9]\d{0,18})$/.test(s)) fail(msg);
  const b = BigInt(s);
  if (b < I64[0] || b > I64[1]) fail(msg);
  return b;
}
const toInt = (s: string, msg = NOT_INT): number => Number(toBig(s, msg));
const isInt = (s: string): boolean => /^(0|-?[1-9]\d{0,18})$/.test(s) && BigInt(s) >= I64[0] && BigInt(s) <= I64[1];
function toFloat(s: string, msg = NOT_FLOAT): number {
  const l = s.toLowerCase();
  if (l === 'inf' || l === '+inf' || l === 'infinity' || l === '+infinity') return Infinity;
  if (l === '-inf' || l === '-infinity') return -Infinity;
  const n = s.trim() === s && s !== '' ? Number(s) : NaN;
  return Number.isNaN(n) ? fail(msg) : n;
}
/** ponytail: JS shortest round-trip, close to Redis 7's fpconv_dtoa; differs only on exotic exponents. */
const fmtScore = (n: number): string => (n === Infinity ? 'inf' : n === -Infinity ? '-inf' : Object.is(n, -0) ? '-0' : String(n)); // util.c d2string
const bytes = (s: string): number => new TextEncoder().encode(s).length;

/** LRANGE/ZRANGE index rules: negatives from the end, clamped; null = empty. */
function span(len: number, a: number, b: number): [number, number] | null {
  if (a < 0) a += len;
  if (b < 0) b += len;
  if (a < 0) a = 0;
  if (a > b || a >= len) return null;
  return [a, Math.min(b, len - 1)];
}

/** Redis glob (stringmatchlen): `* ? [abc] [^a] [a-z] \x`. */
export function glob(p: string): RegExp {
  const esc = (c: string) => c.replace(/[\\^$.*+?()[\]{}|/-]/g, '\\$&');
  let r = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') r += '[\\s\\S]*';
    else if (c === '?') r += '[\\s\\S]';
    else if (c === '\\' && i + 1 < p.length) r += esc(p[++i]);
    else if (c === '[') {
      let j = i + 1;
      let cls = '';
      if (p[j] === '^') { cls = '^'; j++; }
      for (; j < p.length && p[j] !== ']'; j++) {
        if (p[j] === '\\' && j + 1 < p.length) cls += esc(p[++j]);
        else if (p[j + 1] === '-' && j + 2 < p.length && p[j + 2] !== ']') { cls += `${esc(p[j])}-${esc(p[j + 2])}`; j += 2; }
        else cls += esc(p[j]);
      }
      r += `[${cls}]`;
      i = j;
    } else r += esc(c);
  }
  return new RegExp(`^${r}$`);
}

/** crc16.c: CRC-16/XMODEM (poly 0x1021, init 0), bitwise instead of the 256-entry table. */
function crc16(b: Uint8Array): number {
  let crc = 0;
  for (const x of b) {
    crc ^= x << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
/** cluster.c keyHashSlot: only the part between the first `{` and the next `}` is hashed, when it is not empty. */
export function keySlot(key: string): number {
  const b = new TextEncoder().encode(key);
  const s = b.indexOf(123);
  const e = s < 0 ? -1 : b.indexOf(125, s + 1);
  return crc16(s < 0 || e < 0 || e === s + 1 ? b : b.subarray(s + 1, e)) & 0x3fff;
}

type Id = [number, number];
interface Nack { consumer: string; time: number; count: number }
interface Group { last: Id; pel: Map<string, Nack>; consumers: Set<string> }
/** `n` = the rax node the entry was appended to (stream-node-max-entries 100), for MAXLEN ~ trimming whole nodes. */
interface Stream { entries: { id: Id; f: string[]; n: number }[]; last: Id; added: number; groups: Map<string, Group> }
interface Val { string: string; hash: Map<string, string>; list: string[]; set: Set<string>; zset: Map<string, number>; stream: Stream }
type Kind = keyof Val;
/** `lru` = last access (ms, virtual clock); `lfu`/`ldt` = LFU counter and its minute stamp; `enc` = container encoding reached. */
interface Entry { type: Kind; v: unknown; exp?: number; lru: number; lfu: number; ldt: number; enc?: string }
interface Queued { spec: Spec; name: string; args: string[] }
interface Client { id: number; multi?: Queued[]; dirty?: boolean; watched: Map<string, number>; subs: Set<string>; inbox: Reply[] }
interface Spec { arity: number; fn: (a: string[], c: Client) => Reply; oom?: true }

const idStr = (id: Id): string => `${id[0]}-${id[1]}`;
const cmpId = (a: Id, b: Id): number => a[0] - b[0] || a[1] - b[1];
const idOf = (s: string): Id => s.split('-').map(Number) as Id;
function parseId(s: string, seqDefault: number): Id {
  const m = /^(\d+)(?:-(\d+))?$/.exec(s);
  return m ? [Number(m[1]), m[2] === undefined ? seqDefault : Number(m[2])] : fail(BAD_ID);
}
/** streamParseIntervalIDOrReply: `-`, `+`, `(id` exclusive. */
function intervalId(s: string, seqDefault: number, end: boolean): Id {
  if (s === '-') return [0, 0];
  if (s === '+') return [Infinity, Infinity];
  if (!s.startsWith('(')) return parseId(s, seqDefault);
  const id = parseId(s.slice(1), seqDefault);
  return end ? (id[1] > 0 ? [id[0], id[1] - 1] : [id[0] - 1, Infinity]) : [id[0], id[1] + 1];
}
const byScore = (x: [string, number], y: [string, number]): number => (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0);
const TX = new Set(['multi', 'exec', 'discard', 'watch']);
/** Valkey flag NO_MULTI (commands/multi.json, watch.json): refused inside MULTI, which also dooms the EXEC (rejectCommand → flagTransaction). */
const NO_MULTI = new Set(['multi', 'watch']);
const IN_SUB = new Set(['subscribe', 'unsubscribe', 'psubscribe', 'punsubscribe', 'ping', 'quit', 'reset']);
const CONTAINERS = new Set(['xgroup', 'object', 'config', 'memory', 'cluster', 'pubsub']);
/** Commands without key arguments (no cluster slot check). */
const NO_KEYS = new Set(['ping', 'echo', 'dbsize', 'flushall', 'multi', 'exec', 'discard', 'unwatch', 'time', 'publish', 'subscribe', 'unsubscribe',
  'scan', 'keys', 'config', 'cluster', 'pubsub']);
const RANK: Record<string, number> = { intset: 0, listpack: 1, hashtable: 2, skiplist: 2 };
const POLICIES = ['volatile-lru', 'volatile-lfu', 'volatile-random', 'volatile-ttl', 'allkeys-lru', 'allkeys-lfu', 'allkeys-random', 'noeviction'];
const MEM_UNIT: Record<string, number> = { '': 1, b: 1, k: 1000, kb: 1024, m: 1e6, mb: 1048576, g: 1e9, gb: 1073741824 };

/** In-game "today" (CLAUDE.md: 2026-10-31), so stream ids and TTLs are the same on every run. */
export const START_MS = Date.UTC(2026, 9, 31);

export class RedisSim {
  private data = new Map<string, Entry>();
  private ver = new Map<string, number>();
  private clients = new Map<number, Client>();
  private cmds: Record<string, Spec>;
  private slots = new Map<string, number>();
  private nextSlot = 0;
  private seed = 0x5eed;
  /** The subcommand as typed (networking.c addReplySubcommandSyntaxError quotes it). */
  private sub = '';
  /** Set by the lab runner's `@cluster` setup directive: a cluster node that owns every slot (CLUSTER KEYSLOT, CROSSSLOT). */
  cluster = false;
  cfg = { maxmemory: 0, policy: 'noeviction', lfuLog: 10, lfuDecay: 1, samples: 5 };

  constructor(public now = START_MS) {
    this.cmds = this.table();
  }

  /** The virtual clock: the only time source. */
  advance(ms: number): void {
    this.now += ms;
  }

  /** One redis-cli line as client `client`. */
  exec(line: string, client = 0): Reply {
    const args = parseLine(line);
    if (!args) return { t: 'err', v: 'Invalid argument(s)', cli: true };
    return args.length ? this.call(args, client) : { t: 'seq', v: [] };
  }

  /** Messages delivered to a subscribed client since the last call (PUBLISH pushes them). */
  messages(client = 0): Reply[] {
    const c = this.client(client);
    return c.inbox.splice(0);
  }
  /** Every client's undelivered messages, in client order (the runner prints them as that client's lines). */
  pushes(): [number, Reply][] {
    return [...this.clients.values()].sort((a, b) => a.id - b.id).flatMap((c) => c.inbox.splice(0).map((r) => [c.id, r] as [number, Reply]));
  }

  /** State for grading a write: every live key (type, value with sets/hashes sorted, stream groups, PTTL), plus the memory config. */
  dump(): Record<string, { type: string; value: unknown; pttl: number }> {
    const out: Record<string, { type: string; value: unknown; pttl: number }> = {};
    for (const k of [...this.data.keys()].sort()) {
      const en = this.entry(k);
      if (!en) continue;
      const v = en.v as Val[Kind];
      const value = v instanceof Set ? [...v].sort()
        : v instanceof Map ? [...v].sort((a, b) => (a[0] < b[0] ? -1 : 1))
        : typeof v === 'object' && !Array.isArray(v) ? this.streamDump(v as Stream)
        : v;
      out[k] = { type: en.type, value, pttl: en.exp === undefined ? -1 : en.exp - this.now };
    }
    const { maxmemory, policy, lfuLog, lfuDecay } = this.cfg;
    if (maxmemory || policy !== 'noeviction' || lfuLog !== 10 || lfuDecay !== 1) out['(config)'] = { type: 'config', value: [maxmemory, policy, lfuLog, lfuDecay], pttl: -1 };
    return out;
  }
  private streamDump(s: Stream): unknown {
    const groups = [...s.groups].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([name, g]) => [name, idStr(g.last), [...g.consumers].sort(),
      [...g.pel].sort((a, b) => cmpId(idOf(a[0]), idOf(b[0]))).map(([id, n]) => [id, n.consumer, this.now - n.time, n.count])]);
    return { entries: s.entries.map((e) => [idStr(e.id), e.f]), groups };
  }

  call(args: string[], client = 0): Reply {
    const c = this.client(client);
    const refuse = (v: string): Reply => {
      if (c.multi) c.dirty = true;
      return { t: 'err', v };
    };
    // server.c processCommand order: unknown command, arity, NO_MULTI, cluster redirection, maxmemory, subscribe mode, MULTI queue
    const q = this.resolve(args);
    if (typeof q === 'string') return refuse(q);
    const { spec, name } = q;
    if (c.multi && NO_MULTI.has(name)) return refuse('ERR Command not allowed inside a transaction');
    if (this.cluster) {
      const keys = name === 'exec' ? (c.multi ?? []).flatMap((x) => this.keysOf(x.name, x.args)) : this.keysOf(name, args);
      if (new Set(keys.map(keySlot)).size > 1) {
        if (name !== 'exec') return refuse("CROSSSLOT Keys in request don't hash to the same slot");
        if (c.multi) { c.multi = undefined; c.watched.clear(); } // discardTransaction
        return { t: 'err', v: "CROSSSLOT Keys in request don't hash to the same slot" };
      }
    }
    if (this.cfg.maxmemory && !this.evict() && (spec.oom || (name === 'exec' && c.multi?.some((x) => x.spec.oom)))) return refuse(OOM);
    if (c.subs.size && !IN_SUB.has(name)) {
      return refuse(`ERR Can't execute '${name}': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context`);
    }
    if (c.multi && !TX.has(name)) {
      c.multi.push(q);
      return status('QUEUED');
    }
    return this.invoke(q, c);
  }

  /** commandCheckExistence + commandCheckArity: a container's subcommand is `name|sub`, its arity counts the whole line. */
  private resolve(args: string[]): Queued | string {
    let name = args[0].toLowerCase();
    if (CONTAINERS.has(name) && args.length < 2) return arity(name);
    if (CONTAINERS.has(name)) {
      this.sub = args[1];
      name = `${name}|${args[1].toLowerCase()}`;
      if (!this.cmds[name]) return `ERR unknown subcommand '${args[1]}'. Try ${args[0].toUpperCase()} HELP.`;
    }
    const spec = this.cmds[name];
    if (!spec) return `ERR unknown command '${args[0]}', with args beginning with: ${args.slice(1).map((a) => `'${a}' `).join('')}`;
    if (spec.arity > 0 ? args.length !== spec.arity : args.length < -spec.arity) return arity(name);
    return { spec, name, args };
  }
  private invoke(q: Queued, c: Client): Reply {
    try {
      return q.spec.fn(q.args.slice(q.name.includes('|') ? 2 : 1), c);
    } catch (e) {
      if (e instanceof RedisError) return { t: 'err', v: e.message };
      throw e;
    }
  }
  /** The key arguments of a command line (cluster slot check). */
  private keysOf(name: string, args: string[]): string[] {
    const a = args.slice(1);
    if (name.includes('|')) return /^(object|memory|xgroup)\|/.test(name) && args[2] !== undefined ? [args[2]] : [];
    if (NO_KEYS.has(name)) return [];
    if (['del', 'exists', 'mget', 'watch', 'sinter', 'sunion'].includes(name)) return a;
    if (name === 'mset') return a.filter((_, i) => i % 2 === 0);
    if (name === 'zunionstore') return [a[0], ...a.slice(2, 2 + Math.max(0, Number(a[1]) || 0))];
    if (name === 'xread' || name === 'xreadgroup') {
      const i = a.findIndex((x) => x.toLowerCase() === 'streams');
      const r = i < 0 ? [] : a.slice(i + 1);
      return r.slice(0, Math.floor(r.length / 2));
    }
    return a.slice(0, 1);
  }

  private client(id: number): Client {
    let c = this.clients.get(id);
    if (!c) this.clients.set(id, (c = { id, watched: new Map(), subs: new Set(), inbox: [] }));
    return c;
  }
  /** After a write: WATCH version, and a container's encoding can only grow (listpack → hashtable never goes back). */
  private touch(key: string): void {
    this.ver.set(key, (this.ver.get(key) ?? 0) + 1);
    const en = this.data.get(key);
    if (en && en.type !== 'string' && en.type !== 'list' && en.type !== 'stream') {
      const need = this.needEnc(en);
      if (!en.enc || RANK[need] > RANK[en.enc]) en.enc = need;
    }
  }
  private entry(key: string): Entry | undefined {
    const en = this.data.get(key);
    if (en?.exp !== undefined && en.exp < this.now) { // db.c keyIsExpired: now > when
      this.data.delete(key);
      this.touch(key);
      return undefined;
    }
    return en;
  }
  private lfuPolicy(): boolean {
    return this.cfg.policy.endsWith('-lfu');
  }
  /** evict.c LFUDecrAndReturn: the counter loses one per lfu-decay-time minutes (minutes = unixtime / 60, 16 bits). */
  private decayed(en: Entry): number {
    const now = Math.floor(this.now / 60000) & 65535;
    const el = now >= en.ldt ? now - en.ldt : 65535 - en.ldt + now;
    const periods = this.cfg.lfuDecay ? Math.floor(el / this.cfg.lfuDecay) : 0;
    return periods > en.lfu ? 0 : en.lfu - periods;
  }
  /** mulberry32, fixed seed: the simulator's stand-in for rand() in LFULogIncr. */
  private rand(): number {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** db.c lookupKey without LOOKUP_NOTOUCH: updateLFU under an LFU policy, else the LRU clock. */
  private access(en: Entry): void {
    if (!this.lfuPolicy()) { en.lru = this.now; return; }
    let n = this.decayed(en);
    if (n < 255 && this.rand() < 1 / (Math.max(0, n - 5) * this.cfg.lfuLog + 1)) n++; // LFULogIncr, LFU_INIT_VAL 5
    en.lfu = n;
    en.ldt = Math.floor(this.now / 60000) & 65535;
  }
  private fresh(type: Kind, v: unknown, exp?: number): Entry {
    return { type, v, exp, lru: this.now, lfu: 5, ldt: Math.floor(this.now / 60000) & 65535 };
  }
  private get<K extends Kind>(key: string, type: K): Val[K] | undefined {
    const en = this.entry(key);
    if (!en) return undefined;
    if (en.type !== type) fail(WRONGTYPE);
    this.access(en);
    return en.v as Val[K];
  }
  private make<K extends Kind>(key: string, type: K, init: () => Val[K]): Val[K] {
    const v = this.get(key, type);
    if (v !== undefined) return v;
    const nv = init();
    this.data.set(key, this.fresh(type, nv));
    return nv;
  }
  /** Set a string; `keepExp` keeps the TTL (INCR/APPEND do, SET does not unless KEEPTTL). An overwrite keeps the access data (db.c dbSetValue). */
  private put(key: string, v: string, keepExp: boolean, exp?: number, enc?: string, looked = false): void {
    const old = this.entry(key);
    const en = this.fresh('string', v, keepExp ? old?.exp : exp);
    if (old) { if (!looked) this.access(old); Object.assign(en, { lru: old.lru, lfu: old.lfu, ldt: old.ldt }); }
    en.enc = enc ?? (isInt(v) && v.length <= 20 ? 'int' : bytes(v) <= 44 ? 'embstr' : 'raw');
    this.data.set(key, en);
    this.touch(key);
  }
  /** After a container write: an empty container is deleted, like Redis. */
  private wrote(key: string): void {
    const v = this.data.get(key)?.v as { size?: number; length?: number } | undefined;
    if (v && (v.size ?? v.length) === 0) this.data.delete(key);
    this.touch(key);
  }
  private zsorted(key: string): [string, number][] {
    return [...(this.get(key, 'zset') ?? [])].sort(byScore);
  }
  private unwatch(c: Client): void {
    c.watched.clear();
  }

  /** valkey.conf defaults: hash/zset listpack ≤ 128 entries and ≤ 64-byte values; set intset ≤ 512 integers, listpack ≤ 128. */
  private needEnc(en: Entry): string {
    const small = (xs: string[], n: number) => n <= 128 && xs.every((x) => bytes(x) <= 64);
    if (en.type === 'hash') { const h = en.v as Map<string, string>; return small([...h].flat(), h.size) ? 'listpack' : 'hashtable'; }
    if (en.type === 'zset') { const z = en.v as Map<string, number>; return small([...z.keys()], z.size) ? 'listpack' : 'skiplist'; }
    const s = [...(en.v as Set<string>)];
    return s.every(isInt) && s.length <= 512 ? 'intset' : small(s, s.length) ? 'listpack' : 'hashtable';
  }
  private encoding(en: Entry): string {
    if (en.type === 'stream') return 'stream';
    if (en.type === 'list') return (en.v as string[]).reduce((n, x) => n + bytes(x) + 2, 0) <= 8192 ? 'listpack' : 'quicklist'; // list-max-listpack-size -2 = 8 KB
    return en.enc ?? this.needEnc(en);
  }
  /**
   * BoonData's memory rule, not the allocator's number: 48 bytes per key + the key's bytes + the data's bytes, plus 2 bytes per
   * element in a compact encoding (int/embstr/listpack/intset) or 40 bytes per element in a table encoding (hashtable,
   * skiplist, quicklist nodes, raw strings). Enough to compare encodings and key layouts; the lessons say it is an estimate.
   */
  usage(key: string): number | undefined {
    const en = this.data.get(key);
    if (!en) return undefined;
    const enc = this.encoding(en);
    const per = enc === 'hashtable' || enc === 'skiplist' || enc === 'quicklist' ? 40 : 2;
    const v = en.v as Val[Kind];
    const parts: string[][] = typeof v === 'string' ? [[enc === 'int' ? '12345678' : v]]
      : Array.isArray(v) ? v.map((x) => [x])
      : v instanceof Set ? [...v].map((x) => [x])
      : v instanceof Map ? [...v].map(([a, b]) => [a, typeof b === 'number' ? '12345678' : b])
      : (v as Stream).entries.map((e) => [idStr(e.id), ...e.f]);
    const data = parts.reduce((n, p) => n + p.reduce((m, x) => m + bytes(x), 0) + (enc === 'raw' ? 40 : per), 0);
    return 48 + bytes(key) + data;
  }
  private used(): number {
    return [...this.data.keys()].filter((k) => this.entry(k)).reduce((n, k) => n + this.usage(k)!, 0);
  }
  /** evict.c performEvictions before every command: free keys until used ≤ maxmemory; false = could not (policy or no candidate). */
  private evict(): boolean {
    while (this.used() > this.cfg.maxmemory) {
      const p = this.cfg.policy;
      if (p === 'noeviction') return false;
      const pool = [...this.data.keys()].filter((k) => this.entry(k) && (p.startsWith('allkeys') || this.data.get(k)!.exp !== undefined)).sort();
      if (!pool.length) return false;
      const sc = (k: string): number => {
        const en = this.data.get(k)!;
        return p.endsWith('-lru') ? Math.floor(en.lru / 1000) : p.endsWith('-lfu') ? this.decayed(en) : en.exp!;
      };
      const best = p.endsWith('random') ? pool[Math.floor(this.rand() * pool.length)] : pool.reduce((b, k) => (sc(k) < sc(b) ? k : b));
      this.data.delete(best);
      this.touch(best);
    }
    return true;
  }

  private incrBy(key: string, delta: bigint): Reply {
    const cur = toBig(this.get(key, 'string') ?? '0');
    const n = cur + delta;
    if (n < I64[0] || n > I64[1]) fail('ERR increment or decrement would overflow');
    this.put(key, String(n), true, undefined, undefined, true);
    return int(Number(n));
  }
  private push(key: string, items: string[], left: boolean): Reply {
    const l = this.make(key, 'list', () => []);
    for (const x of items) left ? l.unshift(x) : l.push(x);
    this.touch(key);
    return int(l.length);
  }
  private pop(a: string[], left: boolean): Reply {
    if (a.length > 2) fail(arity(left ? 'lpop' : 'rpop'));
    const n = a[1] === undefined ? undefined : toInt(a[1]);
    if (n !== undefined && n < 0) fail('ERR value is out of range, must be positive');
    const l = this.get(a[0], 'list');
    if (!l) return NIL;
    const out = left ? l.splice(0, n ?? 1) : l.splice(Math.max(0, l.length - (n ?? 1))).reverse();
    this.wrote(a[0]);
    return n === undefined ? bulk(out[0]) : arr(out);
  }
  private zrange(a: string[], rev: boolean): Reply {
    // ZRANGE takes REV (6.2+); ponytail: no BYSCORE/BYLEX/LIMIT forms (ZRANGEBYSCORE covers scores).
    const opts = a.slice(3).map((x) => x.toLowerCase());
    if (opts.some((o) => o !== 'withscores' && (o !== 'rev' || rev))) fail(SYNTAX);
    const z = this.zsorted(a[0]);
    if (rev || opts.includes('rev')) z.reverse();
    const s = span(z.length, toInt(a[1]), toInt(a[2]));
    return arr(s ? z.slice(s[0], s[1] + 1).flatMap(([m, sc]) => (opts.includes('withscores') ? [m, fmtScore(sc)] : [m])) : []);
  }
  private zrank(a: string[], rev: boolean): Reply {
    const z = this.zsorted(a[0]);
    const i = z.findIndex(([m]) => m === a[1]);
    return i < 0 ? NIL : int(rev ? z.length - 1 - i : i);
  }
  /** zslParseRange: `(` exclusive, ±inf. */
  private scoreRange(lo: string, hi: string): (s: number) => boolean {
    const bound = (s: string): [number, boolean] => {
      const ex = s.startsWith('(');
      return [toFloat(ex ? s.slice(1) : s, MINMAX), ex];
    };
    const [min, minEx] = bound(lo);
    const [max, maxEx] = bound(hi);
    return (s) => (minEx ? s > min : s >= min) && (maxEx ? s < max : s <= max);
  }
  private setOp(keys: string[], inter: boolean): Reply {
    const sets = keys.map((k) => this.get(k, 'set') ?? new Set<string>());
    if (!inter) return arr([...new Set(sets.flatMap((s) => [...s]))]);
    return arr([...sets[0]].filter((m) => sets.every((s) => s.has(m))));
  }
  private entryReply(s: Stream, id: Id): Reply {
    const e = s.entries.find((x) => cmpId(x.id, id) === 0);
    return e ? arr([idStr(e.id), arr(e.f)]) : arr([idStr(id), NIL]);
  }
  private xrangeOut(s: Stream | undefined, after: (id: Id) => boolean, count?: number): Reply[] {
    const hit = (s?.entries ?? []).filter((e) => after(e.id));
    return hit.slice(0, count || hit.length).map((e) => arr([idStr(e.id), arr(e.f)]));
  }
  /** streamParseAddOrTrimArgsOrReply (MAXLEN/MINID [=|~], LIMIT, NOMKSTREAM for XADD). Returns the options and the ID position. */
  private trimArgs(a: string[], xadd: boolean): { kind?: 'maxlen' | 'minid'; approx: boolean; maxlen: number; minid: Id; limit: number; at: number; nomk: boolean } {
    const o = { kind: undefined as 'maxlen' | 'minid' | undefined, approx: false, maxlen: 0, minid: [0, 0] as Id, limit: 0, at: -1, nomk: false };
    let limitGiven = false, i = 1;
    for (; i < a.length; i++) {
      const more = a.length - 1 - i, opt = a[i].toLowerCase();
      if (xadd && a[i] === '*') break;
      if ((opt === 'maxlen' || opt === 'minid') && more) {
        if (o.kind) fail('ERR syntax error, MAXLEN and MINID options at the same time are not compatible');
        o.approx = false;
        if (more >= 2 && (a[i + 1] === '~' || a[i + 1] === '=')) { o.approx = a[i + 1] === '~'; i++; }
        if (opt === 'maxlen') {
          o.maxlen = toInt(a[i + 1]);
          if (o.maxlen < 0) fail('ERR The MAXLEN argument must be >= 0.');
        } else o.minid = parseId(a[i + 1], 0);
        o.kind = opt;
        i++;
      } else if (opt === 'limit' && more) {
        o.limit = toInt(a[i + 1]);
        if (o.limit < 0) fail('ERR The LIMIT argument must be >= 0.');
        limitGiven = true;
        i++;
      } else if (xadd && opt === 'nomkstream') o.nomk = true;
      else if (xadd) break;
      else fail(SYNTAX);
    }
    if (o.limit && !o.kind) fail('ERR syntax error, LIMIT cannot be used without specifying a trimming strategy');
    if (!xadd && !o.kind) fail('ERR syntax error, XTRIM must be called with a trimming strategy');
    if (limitGiven && !o.approx) fail('ERR syntax error, LIMIT cannot be used without the special ~ option');
    if (!limitGiven) o.limit = o.approx ? 10000 : 0; // 100 * stream-node-max-entries
    o.at = i;
    return o;
  }
  /** streamTrim: whole rax nodes first (the only thing `~` does), then entries inside the first node when exact. */
  private trim(s: Stream, o: ReturnType<RedisSim['trimArgs']>): number {
    let deleted = 0;
    while (s.entries.length && o.kind) {
      if (o.kind === 'maxlen' && s.entries.length <= o.maxlen) break;
      const node = s.entries.filter((e) => e.n === s.entries[0].n);
      if (o.limit && deleted + node.length > o.limit) break;
      const whole = o.kind === 'maxlen' ? s.entries.length - node.length >= o.maxlen : cmpId(node[node.length - 1].id, o.minid) < 0;
      if (whole) { s.entries.splice(0, node.length); deleted += node.length; continue; }
      if (o.approx) break;
      const cut = o.kind === 'maxlen' ? s.entries.length - o.maxlen : node.filter((e) => cmpId(e.id, o.minid) < 0).length;
      s.entries.splice(0, cut);
      deleted += cut;
      break;
    }
    return deleted;
  }
  private group(key: string, name: string, cmd: string): [Stream, Group] {
    const s = this.get(key, 'stream');
    const g = s?.groups.get(name);
    return s && g ? [s, g] : fail(`NOGROUP No such key '${key}' or consumer group '${name}'${cmd}`);
  }

  private table(): Record<string, Spec> {
    const T: Record<string, Spec> = {
      ping: { arity: -1, fn: (a) => (a.length > 1 ? fail(arity('ping')) : a[0] === undefined ? status('PONG') : bulk(a[0])) },
      echo: { arity: 2, fn: (a) => bulk(a[0]) },
      dbsize: { arity: 1, fn: () => int([...this.data.keys()].filter((k) => this.entry(k)).length) },
      flushall: { arity: -1, fn: () => { [...this.data.keys()].forEach((k) => this.touch(k)); this.data.clear(); return OK; } },
      time: { arity: 1, fn: () => arr([String(Math.floor(this.now / 1000)), String((this.now % 1000) * 1000)]) },

      // strings
      get: { arity: 2, fn: (a) => bulk(this.get(a[0], 'string')) },
      set: { arity: -3, oom: true, fn: (a) => {
        let nx = false, xx = false, get = false, keep = false, exp: number | undefined;
        for (let i = 2; i < a.length; i++) {
          const o = a[i].toLowerCase();
          if (o === 'nx' && !xx) nx = true;
          else if (o === 'xx' && !nx) xx = true;
          else if (o === 'get') get = true;
          else if (o === 'keepttl' && exp === undefined) keep = true;
          else if ((o === 'ex' || o === 'px') && exp === undefined && !keep && a[i + 1] !== undefined) {
            const n = toInt(a[++i]);
            if (n <= 0) fail("ERR invalid expire time in 'set' command");
            exp = this.now + (o === 'ex' ? n * 1000 : n);
          } else fail(SYNTAX);
        }
        const old = get ? this.get(a[0], 'string') : undefined;
        const exists = !!this.entry(a[0]);
        if ((nx && exists) || (xx && !exists)) return get ? bulk(old) : NIL;
        this.put(a[0], a[1], keep, exp);
        return get ? bulk(old) : OK;
      } },
      incr: { arity: 2, oom: true, fn: (a) => this.incrBy(a[0], 1n) },
      decr: { arity: 2, oom: true, fn: (a) => this.incrBy(a[0], -1n) },
      incrby: { arity: 3, oom: true, fn: (a) => this.incrBy(a[0], toBig(a[1])) },
      decrby: { arity: 3, oom: true, fn: (a) => this.incrBy(a[0], -toBig(a[1])) },
      mget: { arity: -2, fn: (a) => arr(a.map((k) => { const en = this.entry(k); if (en) this.access(en); return en?.type === 'string' ? bulk(en.v as string) : NIL; })) },
      mset: { arity: -3, oom: true, fn: (a) => {
        if (a.length % 2) fail(arity('mset'));
        for (let i = 0; i < a.length; i += 2) this.put(a[i], a[i + 1], false);
        return OK;
      } },
      append: { arity: 3, oom: true, fn: (a) => { const v = (this.get(a[0], 'string') ?? '') + a[1]; this.put(a[0], v, true, undefined, 'raw', true); return int(bytes(v)); } },
      strlen: { arity: 2, fn: (a) => int(bytes(this.get(a[0], 'string') ?? '')) },

      // keys
      del: { arity: -2, fn: (a) => int(a.filter((k) => { const had = !!this.entry(k); if (had) { this.data.delete(k); this.touch(k); } return had; }).length) },
      exists: { arity: -2, fn: (a) => int(a.filter((k) => this.entry(k)).length) },
      expire: { arity: -3, fn: (a) => this.expire(a, 1000) },
      pexpire: { arity: -3, fn: (a) => this.expire(a, 1) },
      ttl: { arity: 2, fn: (a) => this.ttl(a[0], false) },
      pttl: { arity: 2, fn: (a) => this.ttl(a[0], true) },
      persist: { arity: 2, fn: (a) => { const en = this.entry(a[0]); if (en) this.access(en); if (en?.exp === undefined) return int(0); delete en.exp; this.touch(a[0]); return int(1); } },
      type: { arity: 2, fn: (a) => status(this.entry(a[0])?.type ?? 'none') },
      keys: { arity: 2, fn: (a) => { const re = glob(a[0]); return arr([...this.data.keys()].filter((k) => this.entry(k) && re.test(k))); } },
      scan: { arity: -2, fn: (a) => {
        const cur = toInt(a[0], 'ERR invalid cursor');
        if (cur < 0) fail('ERR invalid cursor');
        let re: RegExp | undefined, type: string | undefined, count = 10;
        for (let i = 1; i < a.length; i += 2) {
          const o = a[i].toLowerCase();
          if (a[i + 1] === undefined) fail(SYNTAX);
          if (o === 'match') re = glob(a[i + 1]);
          else if (o === 'type') type = a[i + 1].toLowerCase();
          else if (o === 'count') { count = toInt(a[i + 1]); if (count < 1) fail(SYNTAX); }
          else fail(SYNTAX);
        }
        // v48 (L1173): a real cursor. Each key gets a slot number the first time a SCAN sees it, never reused while it lives,
        // so a key present for the whole walk is returned (Redis' guarantee); COUNT = slots examined, MATCH/TYPE filter after
        // (a page can be empty, as in Redis). The numbers are ours, not Redis' reverse-binary bucket cursor: treat them as opaque.
        for (const k of this.data.keys()) if (!this.slots.has(k)) this.slots.set(k, this.nextSlot++);
        for (const k of [...this.slots.keys()]) if (!this.data.has(k)) this.slots.delete(k);
        const order = [...this.slots].filter(([, s]) => s >= cur).sort((x, y) => x[1] - y[1]);
        const page = order.slice(0, count).map(([k]) => k).filter((k) => { const en = this.entry(k); return en && (!re || re.test(k)) && (!type || en.type === type); });
        return arr([String(order.length > count ? order[count][1] : 0), arr(page)]);
      } },

      // hashes
      hset: { arity: -4, oom: true, fn: (a) => {
        if (a.length % 2 === 0) fail(arity('hset'));
        const h = this.make(a[0], 'hash', () => new Map());
        let added = 0;
        for (let i = 1; i < a.length; i += 2) { if (!h.has(a[i])) added++; h.set(a[i], a[i + 1]); }
        this.touch(a[0]);
        return int(added);
      } },
      hget: { arity: 3, fn: (a) => bulk(this.get(a[0], 'hash')?.get(a[1])) },
      hgetall: { arity: 2, fn: (a) => arr([...(this.get(a[0], 'hash') ?? [])].flat()) },
      hkeys: { arity: 2, fn: (a) => arr([...(this.get(a[0], 'hash')?.keys() ?? [])]) },
      hvals: { arity: 2, fn: (a) => arr([...(this.get(a[0], 'hash')?.values() ?? [])]) },
      hlen: { arity: 2, fn: (a) => int(this.get(a[0], 'hash')?.size ?? 0) },
      hexists: { arity: 3, fn: (a) => int(this.get(a[0], 'hash')?.has(a[1]) ? 1 : 0) },
      hdel: { arity: -3, fn: (a) => {
        const h = this.get(a[0], 'hash');
        const n = h ? a.slice(1).filter((f) => h.delete(f)).length : 0;
        if (n) this.wrote(a[0]);
        return int(n);
      } },
      hincrby: { arity: 4, oom: true, fn: (a) => {
        const by = toBig(a[2]);
        const h = this.make(a[0], 'hash', () => new Map());
        const n = toBig(h.get(a[1]) ?? '0', 'ERR hash value is not an integer') + by;
        if (n < I64[0] || n > I64[1]) fail('ERR increment or decrement would overflow');
        h.set(a[1], String(n));
        this.touch(a[0]);
        return int(Number(n));
      } },

      // lists
      lpush: { arity: -3, oom: true, fn: (a) => this.push(a[0], a.slice(1), true) },
      rpush: { arity: -3, oom: true, fn: (a) => this.push(a[0], a.slice(1), false) },
      lpop: { arity: -2, fn: (a) => this.pop(a, true) },
      rpop: { arity: -2, fn: (a) => this.pop(a, false) },
      llen: { arity: 2, fn: (a) => int(this.get(a[0], 'list')?.length ?? 0) },
      lrange: { arity: 4, fn: (a) => {
        const l = this.get(a[0], 'list') ?? [];
        const s = span(l.length, toInt(a[1]), toInt(a[2]));
        return arr(s ? l.slice(s[0], s[1] + 1) : []);
      } },

      // sets
      sadd: { arity: -3, oom: true, fn: (a) => {
        const s = this.make(a[0], 'set', () => new Set());
        const n = a.slice(1).filter((m) => !s.has(m) && s.add(m)).length;
        this.touch(a[0]);
        return int(n);
      } },
      srem: { arity: -3, fn: (a) => {
        const s = this.get(a[0], 'set');
        const n = s ? a.slice(1).filter((m) => s.delete(m)).length : 0;
        if (n) this.wrote(a[0]);
        return int(n);
      } },
      smembers: { arity: 2, fn: (a) => arr([...(this.get(a[0], 'set') ?? [])]) },
      sismember: { arity: 3, fn: (a) => int(this.get(a[0], 'set')?.has(a[1]) ? 1 : 0) },
      scard: { arity: 2, fn: (a) => int(this.get(a[0], 'set')?.size ?? 0) },
      sinter: { arity: -2, fn: (a) => this.setOp(a, true) },
      sunion: { arity: -2, fn: (a) => this.setOp(a, false) },

      // sorted sets
      zadd: { arity: -4, oom: true, fn: (a) => {
        // t_zset.c zaddGenericCommand: options, the pair count (syntax error), then incompatible options, then the scores.
        // ponytail: no INCR option (ZINCRBY teaches it); `INCR` is read as a score and refused as a float.
        let i = 1, nx = false, xx = false, ch = false, gt = false, lt = false;
        for (; i < a.length; i++) {
          const o = a[i].toLowerCase();
          if (o === 'nx') nx = true;
          else if (o === 'xx') xx = true;
          else if (o === 'ch') ch = true;
          else if (o === 'gt') gt = true;
          else if (o === 'lt') lt = true;
          else break;
        }
        const rest = a.slice(i);
        if (!rest.length || rest.length % 2) fail(SYNTAX);
        if (nx && xx) fail('ERR XX and NX options at the same time are not compatible');
        if ((gt && nx) || (lt && nx) || (gt && lt)) fail('ERR GT, LT, and/or NX options at the same time are not compatible');
        const pairs: [number, string][] = [];
        for (let j = 0; j < rest.length; j += 2) pairs.push([toFloat(rest[j]), rest[j + 1]]);
        if (xx && !this.get(a[0], 'zset')) return int(0);
        const z = this.make(a[0], 'zset', () => new Map());
        let added = 0, changed = 0;
        for (const [sc, m] of pairs) {
          const old = z.get(m);
          if (old === undefined ? xx : nx || (gt && sc <= old) || (lt && sc >= old)) continue;
          if (old === undefined) added++;
          else if (old !== sc) changed++;
          z.set(m, sc);
        }
        this.wrote(a[0]);
        return int(ch ? added + changed : added);
      } },
      zincrby: { arity: 4, oom: true, fn: (a) => {
        const by = toFloat(a[1]);
        const z = this.make(a[0], 'zset', () => new Map());
        const n = (z.get(a[2]) ?? 0) + by;
        if (Number.isNaN(n)) fail('ERR resulting score is not a number (NaN)');
        z.set(a[2], n);
        this.touch(a[0]);
        return bulk(fmtScore(n));
      } },
      zrange: { arity: -4, fn: (a) => this.zrange(a, false) },
      zrevrange: { arity: -4, fn: (a) => this.zrange(a, true) },
      zrank: { arity: 3, fn: (a) => this.zrank(a, false) },
      zrevrank: { arity: 3, fn: (a) => this.zrank(a, true) },
      zscore: { arity: 3, fn: (a) => { const s = this.get(a[0], 'zset')?.get(a[1]); return s === undefined ? NIL : bulk(fmtScore(s)); } },
      zcard: { arity: 2, fn: (a) => int(this.get(a[0], 'zset')?.size ?? 0) },
      zcount: { arity: 4, fn: (a) => { const ok = this.scoreRange(a[1], a[2]); return int(this.zsorted(a[0]).filter(([, s]) => ok(s)).length); } },
      zrem: { arity: -3, fn: (a) => {
        const z = this.get(a[0], 'zset');
        const n = z ? a.slice(1).filter((m) => z.delete(m)).length : 0;
        if (n) this.wrote(a[0]);
        return int(n);
      } },
      zrangebyscore: { arity: -4, fn: (a) => {
        const ok = this.scoreRange(a[1], a[2]);
        let ws = false, off = 0, cnt = -1;
        for (let i = 3; i < a.length; i++) {
          const o = a[i].toLowerCase();
          if (o === 'withscores') ws = true;
          else if (o === 'limit' && a[i + 2] !== undefined) { off = toInt(a[i + 1]); cnt = toInt(a[i + 2]); i += 2; }
          else fail(SYNTAX);
        }
        const hit = this.zsorted(a[0]).filter(([, s]) => ok(s));
        const page = off < 0 ? [] : hit.slice(off, cnt < 0 ? undefined : off + cnt);
        return arr(page.flatMap(([m, s]) => (ws ? [m, fmtScore(s)] : [m])));
      } },
      zremrangebyscore: { arity: 4, fn: (a) => {
        const ok = this.scoreRange(a[1], a[2]);
        const z = this.get(a[0], 'zset');
        if (!z) return int(0);
        const gone = [...z].filter(([, s]) => ok(s)).map(([m]) => m);
        gone.forEach((m) => z.delete(m));
        if (gone.length) this.wrote(a[0]);
        return int(gone.length);
      } },
      zremrangebyrank: { arity: 4, fn: (a) => {
        const [lo, hi] = [toInt(a[1]), toInt(a[2])];
        const z = this.get(a[0], 'zset');
        if (!z) return int(0);
        const all = this.zsorted(a[0]);
        const s = span(all.length, lo, hi);
        if (!s) return int(0);
        all.slice(s[0], s[1] + 1).forEach(([m]) => z.delete(m));
        this.wrote(a[0]);
        return int(s[1] - s[0] + 1);
      } },
      zunionstore: { arity: -4, oom: true, fn: (a) => {
        // t_zset.c zunionInterDiffGenericCommand: numkeys, then the sources (zsets or sets, a set member scores 1), WEIGHTS, AGGREGATE
        const n = toInt(a[1]);
        if (n < 1) fail("ERR at least 1 input key is needed for 'zunionstore' command");
        if (n > a.length - 2) fail(SYNTAX);
        const src = a.slice(2, 2 + n).map((k) => {
          const en = this.entry(k);
          if (en && en.type !== 'zset' && en.type !== 'set') fail(WRONGTYPE);
          if (en) this.access(en);
          return !en ? new Map<string, number>() : en.type === 'set' ? new Map([...(en.v as Set<string>)].map((m) => [m, 1])) : (en.v as Map<string, number>);
        });
        const w = src.map(() => 1);
        let agg = 'sum';
        for (let j = 2 + n; j < a.length;) {
          const o = a[j].toLowerCase(), rem = a.length - j;
          if (o === 'weights' && rem >= n + 1) { for (let i = 0; i < n; i++) w[i] = toFloat(a[j + 1 + i], 'ERR weight value is not a float'); j += n + 1; }
          else if (o === 'aggregate' && rem >= 2 && ['sum', 'min', 'max'].includes(a[j + 1].toLowerCase())) { agg = a[j + 1].toLowerCase(); j += 2; }
          else fail(SYNTAX);
        }
        const out = new Map<string, number>();
        src.forEach((z, i) => z.forEach((s, m) => {
          const v = s * w[i], o = out.get(m);
          out.set(m, o === undefined ? v : agg === 'sum' ? (Number.isNaN(o + v) ? 0 : o + v) : agg === 'min' ? Math.min(o, v) : Math.max(o, v));
        }));
        if (this.entry(a[0])) this.data.delete(a[0]);
        if (out.size) this.data.set(a[0], this.fresh('zset', out));
        this.touch(a[0]);
        return int(out.size);
      } },

      // transactions
      multi: { arity: 1, fn: (_a, c) => {
        if (c.multi) fail('ERR MULTI calls can not be nested');
        c.multi = [];
        c.dirty = false;
        return OK;
      } },
      discard: { arity: 1, fn: (_a, c) => {
        if (!c.multi) fail('ERR DISCARD without MULTI');
        c.multi = undefined;
        this.unwatch(c);
        return OK;
      } },
      exec: { arity: 1, fn: (_a, c) => {
        const q = c.multi ?? fail('ERR EXEC without MULTI');
        c.multi = undefined;
        const broken = [...c.watched].some(([k, v]) => (this.entry(k), (this.ver.get(k) ?? 0) !== v));
        this.unwatch(c);
        if (c.dirty) fail('EXECABORT Transaction discarded because of previous errors.');
        if (broken) return NIL;
        // Runtime errors (WRONGTYPE…) land in their slot; the other commands still run: Redis has no rollback.
        return arr(q.map((x) => this.invoke(x, c)));
      } },
      watch: { arity: -2, fn: (a, c) => {
        if (c.multi) fail('ERR WATCH inside MULTI is not allowed');
        for (const k of a) { this.entry(k); c.watched.set(k, this.ver.get(k) ?? 0); }
        return OK;
      } },
      unwatch: { arity: 1, fn: (_a, c) => { this.unwatch(c); return OK; } },

      // streams
      xadd: { arity: -5, oom: true, fn: (a) => {
        const o = this.trimArgs(a, true);
        const fv = a.slice(o.at + 1);
        if (fv.length < 2 || fv.length % 2) fail(arity('xadd'));
        const pe = this.entry(a[0]);
        if (pe && pe.type !== 'stream') fail(WRONGTYPE);
        const prev = pe?.v as Stream | undefined;
        if (!prev && o.nomk) return NIL;
        const last: Id = prev?.last ?? [0, 0];
        const raw = a[o.at];
        let id: Id;
        if (raw === '*') {
          const ms = Math.max(this.now, last[0]);
          id = [ms, ms === last[0] ? last[1] + 1 : 0];
        } else if (/^\d+-\*$/.test(raw)) {
          const ms = Number(raw.slice(0, -2));
          id = [ms, ms === last[0] ? last[1] + 1 : 0];
          if (ms === 0 && id[1] === 0) id[1] = 1;
        } else id = parseId(raw, 0);
        if (id[0] === 0 && id[1] === 0) fail('ERR The ID specified in XADD must be greater than 0-0');
        if (cmpId(id, last) <= 0) fail('ERR The ID specified in XADD is equal or smaller than the target stream top item');
        const s = this.make(a[0], 'stream', () => ({ entries: [], last: [0, 0], added: 0, groups: new Map() }));
        s.entries.push({ id, f: fv, n: Math.floor(s.added++ / 100) });
        s.last = id;
        this.trim(s, o);
        this.touch(a[0]);
        return bulk(idStr(id));
      } },
      xtrim: { arity: -4, fn: (a) => {
        const o = this.trimArgs(a, false);
        const s = this.get(a[0], 'stream');
        if (!s) return int(0);
        const n = this.trim(s, o);
        if (n) this.touch(a[0]);
        return int(n);
      } },
      xlen: { arity: 2, fn: (a) => int(this.get(a[0], 'stream')?.entries.length ?? 0) },
      xrange: { arity: -4, fn: (a) => {
        const lo = intervalId(a[1], 0, false);
        const hi = intervalId(a[2], Infinity, true);
        let count: number | undefined;
        if (a.length > 3) {
          if (a.length !== 5 || a[3].toLowerCase() !== 'count') fail(SYNTAX);
          count = Math.max(0, toInt(a[4]));
        }
        const s = this.get(a[0], 'stream');
        if (s && count === 0) return NIL;
        return arr(this.xrangeOut(s, (id) => cmpId(id, lo) >= 0 && cmpId(id, hi) <= 0, count));
      } },
      xread: { arity: -4, fn: (a, c) => this.xread(a, c, false) },
      xreadgroup: { arity: -7, fn: (a, c) => this.xread(a, c, true) },
      'xgroup|create': { arity: -5, oom: true, fn: (a) => {
        let mk = false;
        for (let i = 3; i < a.length; i++) {
          if (a[i].toLowerCase() === 'mkstream') mk = true;
          else if (a[i].toLowerCase() === 'entriesread' && i + 1 < a.length) { toInt(a[++i]); }
          else fail(`ERR unknown subcommand or wrong number of arguments for '${this.sub}'. Try XGROUP HELP.`);
        }
        const s = this.get(a[0], 'stream');
        if (!s && !mk) fail('ERR The XGROUP subcommand requires the key to exist. Note that for CREATE you may want to use the MKSTREAM option to create an empty stream automatically.');
        const id = a[2] === '$' ? (s?.last ?? [0, 0]) as Id : parseId(a[2], 0);
        const st = s ?? this.make(a[0], 'stream', () => ({ entries: [], last: [0, 0], added: 0, groups: new Map() }));
        if (st.groups.has(a[1])) fail('BUSYGROUP Consumer Group name already exists');
        st.groups.set(a[1], { last: [...id] as Id, pel: new Map(), consumers: new Set() });
        this.touch(a[0]);
        return OK;
      } },
      'xgroup|destroy': { arity: 4, fn: (a) => {
        const s = this.xgroupKey(a);
        const had = s.groups.delete(a[1]);
        if (had) this.touch(a[0]);
        return int(had ? 1 : 0);
      } },
      'xgroup|createconsumer': { arity: 5, oom: true, fn: (a) => {
        const g = this.xgroupNeed(a);
        if (g.consumers.has(a[2])) return int(0);
        g.consumers.add(a[2]);
        this.touch(a[0]);
        return int(1);
      } },
      'xgroup|delconsumer': { arity: 5, fn: (a) => {
        const g = this.xgroupNeed(a);
        if (!g.consumers.has(a[2])) return int(0);
        const mine = [...g.pel].filter(([, n]) => n.consumer === a[2]).map(([id]) => id);
        mine.forEach((id) => g.pel.delete(id));
        g.consumers.delete(a[2]);
        this.touch(a[0]);
        return int(mine.length);
      } },
      'xgroup|setid': { arity: -5, fn: (a) => {
        const g = this.xgroupNeed(a);
        g.last = a[2] === '$' ? [...this.get(a[0], 'stream')!.last] as Id : parseId(a[2], 0);
        this.touch(a[0]);
        return OK;
      } },
      xack: { arity: -4, fn: (a) => {
        const s = this.get(a[0], 'stream');
        const g = s?.groups.get(a[1]);
        if (!g) return int(0);
        const ids = a.slice(2).map((x) => idStr(parseId(x, 0)));
        const n = ids.filter((id) => g.pel.delete(id)).length;
        if (n) this.touch(a[0]);
        return int(n);
      } },
      xpending: { arity: -3, fn: (a) => {
        if (a.length !== 2 && (a.length < 5 || a.length > 8)) fail(SYNTAX);
        let minidle = 0, i = 2, lo: Id = [0, 0], hi: Id = [0, 0], count = 0, who: string | undefined;
        if (a.length >= 5) {
          if (a[2].toLowerCase() === 'idle') {
            minidle = toInt(a[3]);
            if (a.length < 7) fail(SYNTAX);
            i = 4;
          }
          count = Math.max(0, toInt(a[i + 2]));
          lo = intervalId(a[i], 0, false);
          hi = intervalId(a[i + 1], Infinity, true);
          who = a[i + 3];
        }
        const [, g] = this.group(a[0], a[1], '');
        const pel = [...g.pel].sort((x, y) => cmpId(idOf(x[0]), idOf(y[0])));
        if (a.length === 2) {
          if (!pel.length) return arr([int(0), NIL, NIL, NIL]);
          const per = new Map<string, number>();
          pel.forEach(([, n]) => per.set(n.consumer, (per.get(n.consumer) ?? 0) + 1));
          return arr([int(pel.length), pel[0][0], pel[pel.length - 1][0], arr([...per].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([k, v]) => arr([k, String(v)])))]);
        }
        if (who !== undefined && !g.consumers.has(who)) return arr([]);
        return arr(pel.filter(([id, n]) => cmpId(idOf(id), lo) >= 0 && cmpId(idOf(id), hi) <= 0 && (who === undefined || n.consumer === who) && this.now - n.time >= minidle)
          .slice(0, count).map(([id, n]) => arr([id, n.consumer, int(Math.max(0, this.now - n.time)), int(n.count)])));
      } },
      xclaim: { arity: -6, fn: (a) => {
        const [s, g] = this.group(a[0], a[1], '');
        const minidle = Math.max(0, toInt(a[3], 'ERR Invalid min-idle-time argument for XCLAIM'));
        const ids: Id[] = [];
        let j = 4;
        for (; j < a.length && /^\d+(-\d+)?$/.test(a[j]); j++) ids.push(parseId(a[j], 0));
        let force = false, justid = false, time = -1, retry = -1;
        for (; j < a.length; j++) {
          const o = a[j].toLowerCase(), more = a.length - 1 - j;
          if (o === 'force') force = true;
          else if (o === 'justid') justid = true;
          else if (o === 'idle' && more) time = this.now - toInt(a[++j], 'ERR Invalid IDLE option argument for XCLAIM');
          else if (o === 'time' && more) time = toInt(a[++j], 'ERR Invalid TIME option argument for XCLAIM');
          else if (o === 'retrycount' && more) retry = toInt(a[++j], 'ERR Invalid RETRYCOUNT option argument for XCLAIM');
          else if (o === 'lastid' && more) { const l = parseId(a[++j], 0); if (cmpId(l, g.last) > 0) g.last = l; }
          else fail(`ERR Unrecognized XCLAIM option '${a[j]}'`);
        }
        if (time < 0 || time > this.now) time = this.now;
        g.consumers.add(a[2]);
        const out: Reply[] = [];
        for (const id of ids) {
          const k = idStr(id);
          let n = g.pel.get(k);
          if (!s.entries.some((e) => cmpId(e.id, id) === 0)) { g.pel.delete(k); continue; }
          if (force && !n) g.pel.set(k, (n = { consumer: '', time: this.now, count: 0 }));
          if (!n) continue;
          if (n.consumer && minidle && this.now - n.time < minidle) continue;
          n.time = time;
          if (retry >= 0) n.count = retry;
          else if (!justid) n.count++;
          n.consumer = a[2];
          out.push(justid ? bulk(k) : this.entryReply(s, id));
        }
        this.touch(a[0]);
        return arr(out);
      } },
      xautoclaim: { arity: -6, fn: (a) => {
        const minidle = Math.max(0, toInt(a[3], 'ERR Invalid min-idle-time argument for XAUTOCLAIM'));
        const start = intervalId(a[4], 0, false);
        let count = 100, justid = false;
        for (let j = 5; j < a.length; j++) {
          const o = a[j].toLowerCase();
          if (o === 'count' && a.length - 1 - j) { count = toInt(a[++j], 'ERR COUNT must be > 0'); if (count < 1) fail('ERR COUNT must be > 0'); }
          else if (o === 'justid') justid = true;
          else fail(SYNTAX);
        }
        const [s, g] = this.group(a[0], a[1], '');
        g.consumers.add(a[2]);
        const pel = [...g.pel].sort((x, y) => cmpId(idOf(x[0]), idOf(y[0]))).filter(([id]) => cmpId(idOf(id), start) >= 0);
        const out: Reply[] = [], gone: string[] = [];
        let i = 0, attempts = count * 10;
        for (; i < pel.length && count && attempts--; i++) {
          const [k, n] = pel[i];
          if (!s.entries.some((e) => idStr(e.id) === k)) { g.pel.delete(k); gone.push(k); count--; continue; }
          if (minidle && this.now - n.time < minidle) continue;
          n.time = this.now;
          if (!justid) n.count++;
          n.consumer = a[2];
          out.push(justid ? bulk(k) : this.entryReply(s, idOf(k)));
          count--;
        }
        this.touch(a[0]);
        return arr([i < pel.length ? pel[i][0] : '0-0', arr(out), arr(gone)]);
      } },

      // pub/sub, simulated: PUBLISH drops the message into each subscriber's inbox (messages(client), pushes()).
      subscribe: { arity: -2, fn: (a, c) => ({ t: 'seq', v: a.map((ch) => { c.subs.add(ch); return arr(['subscribe', ch, int(c.subs.size)]); }) }) },
      unsubscribe: { arity: -1, fn: (a, c) => {
        const chs = a.length ? a : [...c.subs];
        if (!chs.length) return arr(['unsubscribe', NIL, int(0)]);
        return { t: 'seq', v: chs.map((ch) => { c.subs.delete(ch); return arr(['unsubscribe', ch, int(c.subs.size)]); }) };
      } },
      publish: { arity: 3, fn: (a) => {
        const to = [...this.clients.values()].filter((x) => x.subs.has(a[0]));
        to.forEach((x) => x.inbox.push(arr(['message', a[0], a[1]])));
        return int(to.length);
      } },
      'pubsub|channels': { arity: -2, fn: (a) => {
        const re = a[0] === undefined ? undefined : glob(a[0]);
        return arr([...new Set([...this.clients.values()].flatMap((x) => [...x.subs]))].filter((ch) => !re || re.test(ch)));
      } },
      'pubsub|numsub': { arity: -2, fn: (a) => arr(a.flatMap((ch) => [bulk(ch), int([...this.clients.values()].filter((x) => x.subs.has(ch)).length)])) },

      // memory, eviction, introspection
      'object|encoding': { arity: 3, fn: (a) => { const en = this.entry(a[0]); return en ? bulk(this.encoding(en)) : NIL; } },
      'object|idletime': { arity: 3, fn: (a) => {
        const en = this.entry(a[0]);
        if (!en) return NIL;
        if (this.lfuPolicy()) fail('ERR An LFU maxmemory policy is selected, idle time not tracked. Please note that when switching between policies at runtime LRU and LFU data will take some time to adjust.');
        return int(Math.floor(this.now / 1000) - Math.floor(en.lru / 1000));
      } },
      'object|freq': { arity: 3, fn: (a) => {
        const en = this.entry(a[0]);
        if (!en) return NIL;
        if (!this.lfuPolicy()) fail('ERR An LFU maxmemory policy is not selected, access frequency not tracked. Please note that when switching between policies at runtime LRU and LFU data will take some time to adjust.');
        return int(this.decayed(en));
      } },
      'memory|usage': { arity: -3, fn: (a) => {
        for (let j = 1; j < a.length; j++) {
          if (a[j].toLowerCase() === 'samples' && j + 1 < a.length) { if (toInt(a[++j]) < 0) fail(SYNTAX); }
          else fail(SYNTAX);
        }
        const n = this.usage(a[0]);
        return n === undefined ? NIL : int(n);
      } },
      'config|get': { arity: -3, fn: (a) => {
        const vals: Record<string, string> = { maxmemory: String(this.cfg.maxmemory), 'maxmemory-policy': this.cfg.policy, 'maxmemory-samples': String(this.cfg.samples),
          'lfu-log-factor': String(this.cfg.lfuLog), 'lfu-decay-time': String(this.cfg.lfuDecay) };
        const hit = new Set<string>();
        for (const p of a) Object.keys(vals).filter((k) => (/[[*?]/.test(p) ? glob(p).test(k) : k === p.toLowerCase())).forEach((k) => hit.add(k));
        return arr([...hit].flatMap((k) => [k, vals[k]]));
      } },
      'config|set': { arity: -4, fn: (a) => {
        if (a.length % 2) fail(SYNTAX);
        const next = { ...this.cfg };
        const names = ['maxmemory', 'maxmemory-policy', 'maxmemory-samples', 'lfu-log-factor', 'lfu-decay-time'];
        const bad = a.filter((_, i) => i % 2 === 0).find((n) => !names.includes(n.toLowerCase()));
        if (bad !== undefined) fail(`ERR Unknown option or number of arguments for CONFIG SET - '${bad}'`);
        for (let i = 0; i < a.length; i += 2) {
          const n = a[i].toLowerCase(), v = a[i + 1];
          const why = (e: string): never => fail(`ERR CONFIG SET failed (possibly related to argument '${n}') - ${e}`);
          const num = (lo: number, hi: number): number => {
            if (!/^-?\d+$/.test(v)) why("argument couldn't be parsed into an integer");
            const x = Number(v);
            return x < lo || x > hi ? why(`argument must be between ${lo} and ${hi} inclusive`) : x;
          };
          if (n === 'maxmemory') {
            const m = /^(\d+)([a-z]*)$/i.exec(v);
            const u = m ? MEM_UNIT[m[2].toLowerCase()] : undefined;
            next.maxmemory = m && u ? Number(m[1]) * u : why('argument must be a memory value');
          } else if (n === 'maxmemory-policy') {
            next.policy = POLICIES.includes(v.toLowerCase()) ? v.toLowerCase() : why(`argument(s) must be one of the following: ${POLICIES.join(', ')}`);
          } else if (n === 'maxmemory-samples') next.samples = num(1, 64);
          else if (n === 'lfu-log-factor') next.lfuLog = num(0, 2147483647);
          else next.lfuDecay = num(0, 2147483647);
        }
        this.cfg = next;
        return OK;
      } },

      // cluster: a node that owns every slot (`@cluster` in a lab setup); without it, cluster support is disabled
      'cluster|keyslot': { arity: 3, fn: (a) => (this.cluster ? int(keySlot(a[0])) : fail('ERR This instance has cluster support disabled')) },
      'cluster|countkeysinslot': { arity: 3, fn: (a) => {
        if (!this.cluster) fail('ERR This instance has cluster support disabled');
        const slot = toInt(a[0]);
        if (slot < 0 || slot >= 16384) fail('ERR Invalid slot');
        return int([...this.data.keys()].filter((k) => this.entry(k) && keySlot(k) === slot).length);
      } },
    };
    return T;
  }

  private xgroupKey(a: string[]): Stream {
    const s = this.get(a[0], 'stream');
    return s ?? fail('ERR The XGROUP subcommand requires the key to exist. Note that for CREATE you may want to use the MKSTREAM option to create an empty stream automatically.');
  }
  private xgroupNeed(a: string[]): Group {
    return this.xgroupKey(a).groups.get(a[1]) ?? fail(`NOGROUP No such consumer group '${a[1]}' for key name '${a[0]}'`);
  }

  /** t_stream.c xreadCommand, ported option by option (XREAD and XREADGROUP share it). */
  private xread(a: string[], c: Client, grouped: boolean): Reply {
    let count = 0, at = -1, group: string | undefined, consumer = '', noack = false;
    for (let i = 0; i < a.length; i++) {
      const more = a.length - i - 1, o = a[i].toLowerCase();
      if (o === 'block' && more) toInt(a[++i], 'ERR timeout is not an integer or out of range'); // ponytail: never blocks
      else if (o === 'count' && more) count = Math.max(0, toInt(a[++i]));
      else if (o === 'streams' && more) {
        at = i + 1;
        if ((a.length - at) % 2) fail(`ERR Unbalanced '${grouped ? 'xreadgroup' : 'xread'}' list of streams: for each stream key an ID or '${grouped ? '>' : '$'}' must be specified.`);
        break;
      } else if (o === 'group' && more >= 2) {
        if (!grouped) fail('ERR The GROUP option is only supported by XREADGROUP. You called XREAD instead.');
        group = a[i + 1];
        consumer = a[i + 2];
        i += 2;
      } else if (o === 'noack') {
        if (!grouped) fail('ERR The NOACK option is only supported by XREADGROUP. You called XREAD instead.');
        noack = true;
      } else fail(SYNTAX);
    }
    if (at < 0) fail(SYNTAX);
    if (grouped && group === undefined) fail('ERR Missing GROUP option for XREADGROUP');
    const half = (a.length - at) / 2;
    const plan: { key: string; s?: Stream; g?: Group; from: Id | '>' }[] = [];
    for (let k = 0; k < half; k++) {
      const key = a[at + k], raw = a[at + half + k];
      const en = this.entry(key);
      if (en && en.type !== 'stream') fail(WRONGTYPE);
      const s = en ? (this.access(en), en.v as Stream) : undefined;
      const g = group === undefined ? undefined : s?.groups.get(group) ?? fail(`NOGROUP No such key '${key}' or consumer group '${group}' in XREADGROUP with GROUP option`);
      let from: Id | '>';
      if (raw === '$') {
        if (grouped) fail('ERR The $ ID is meaningless in the context of XREADGROUP: you want to read the history of this consumer by specifying a proper ID, or use the > ID to get new messages. The $ ID would just return an empty result set.');
        from = s ? [...s.last] as Id : [0, 0];
      } else if (raw === '+') {
        if (grouped) fail('ERR The + ID is meaningless in the context of XREADGROUP: you want to read the history of this consumer by specifying a proper ID, or use the > ID to get new messages. The + ID would just return an empty result set.');
        from = s?.entries.length ? (s.last[1] > 0 ? [s.last[0], s.last[1] - 1] : [s.last[0] - 1, Infinity]) : [0, 0];
      } else if (raw === '>') {
        if (!grouped) fail('ERR The > ID can be specified only when calling XREADGROUP using the GROUP <group> <consumer> option.');
        from = '>';
      } else from = parseId(raw, 0);
      plan.push({ key, s, g, from });
    }
    const out: Reply[] = [];
    for (const { key, s, g, from } of plan) {
      if (!s) continue;
      if (!g) {
        if (from === '>') continue;
        const hit = this.xrangeOut(s, (id) => cmpId(id, from) > 0, count);
        if (hit.length) out.push(arr([key, arr(hit)]));
        continue;
      }
      if (!g.consumers.has(consumer)) { g.consumers.add(consumer); this.touch(key); }
      if (from !== '>') { // history: this consumer's own pending entries after `from`, each delivered again
        const mine = [...g.pel].filter(([id, n]) => n.consumer === consumer && cmpId(idOf(id), from) > 0).sort((x, y) => cmpId(idOf(x[0]), idOf(y[0])));
        const page = count ? mine.slice(0, count) : mine;
        out.push(arr([key, arr(page.map(([id, n]) => {
          const r = this.entryReply(s, idOf(id));
          if ((r as { v: Reply[] }).v[1].t !== 'nil') { n.time = this.now; n.count++; }
          return r;
        }))]));
        continue;
      }
      const fresh = s.entries.filter((e) => cmpId(e.id, g.last) > 0);
      if (!fresh.length) continue;
      const page = count ? fresh.slice(0, count) : fresh;
      for (const e of page) {
        g.last = [...e.id] as Id;
        if (!noack) g.pel.set(idStr(e.id), { consumer, time: this.now, count: 1 });
      }
      out.push(arr([key, arr(page.map((e) => arr([idStr(e.id), arr(e.f)])))]));
      this.touch(key);
    }
    return out.length ? arr(out) : NIL;
  }

  /** expire.c expireGenericCommand + parseExtendedExpireArgumentsOrReply (options first, then the number). */
  private expire(a: string[], unit: number): Reply {
    let nx = false, xx = false, gt = false, lt = false;
    for (const o of a.slice(2)) {
      const l = o.toLowerCase();
      if (l === 'nx') nx = true;
      else if (l === 'xx') xx = true;
      else if (l === 'gt') gt = true;
      else if (l === 'lt') lt = true;
      else fail(`ERR Unsupported option ${o}`);
    }
    if (nx && (xx || gt || lt)) fail('ERR NX and XX, GT or LT options at the same time are not compatible');
    if (gt && lt) fail('ERR GT and LT options at the same time are not compatible');
    const key = a[0];
    const ms = toInt(a[1]) * unit;
    const en = this.entry(key);
    if (!en) return int(0);
    this.access(en);
    const when = this.now + ms, cur = en.exp;
    if ((nx && cur !== undefined) || (xx && cur === undefined) || (gt && (cur === undefined || when <= cur)) || (lt && cur !== undefined && when >= cur)) return int(0);
    if (ms <= 0) this.data.delete(key);
    else en.exp = this.now + ms;
    this.touch(key);
    return int(1);
  }
  private ttl(key: string, ms: boolean): Reply {
    const en = this.entry(key);
    if (!en) return int(-2);
    if (en.exp === undefined) return int(-1);
    const left = en.exp - this.now;
    return int(ms ? left : Math.floor((left + 500) / 1000));
  }
}

/** sdscatrepr over UTF-8 bytes: what redis-cli prints for a bulk string (non-ASCII shows as \xHH, like the real CLI). */
function repr(s: string): string {
  let o = '"';
  for (const b of new TextEncoder().encode(s)) {
    o += b === 92 ? '\\\\' : b === 34 ? '\\"' : b === 10 ? '\\n' : b === 13 ? '\\r' : b === 9 ? '\\t' : b === 7 ? '\\a' : b === 8 ? '\\b'
      : b >= 32 && b < 127 ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, '0')}`;
  }
  return `${o}"`;
}

/** A reply as redis-cli prints it on a terminal (numbered, nested arrays indented under their index). */
export function format(r: Reply): string {
  switch (r.t) {
    case 'status': return r.v;
    case 'err': return r.cli ? r.v : `(error) ${r.v}`;
    case 'int': return `(integer) ${r.v}`;
    case 'bulk': return repr(r.v);
    case 'nil': return '(nil)';
    case 'seq': return r.v.map(format).join('\n');
    case 'arr': {
      if (!r.v.length) return '(empty array)';
      const w = String(r.v.length).length;
      return r.v.map((x, i) => {
        const pre = `${String(i + 1).padStart(w)}) `;
        return format(x).split('\n').map((l, j) => (j ? ' '.repeat(pre.length) : pre) + l).join('\n');
      }).join('\n');
    }
  }
}
