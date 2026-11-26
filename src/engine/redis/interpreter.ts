import { parseLine } from './parse';

/**
 * v47 spike: a Redis teaching subset in pure TS (no Node built-ins, no Date.now()). One in-memory keyspace, a virtual clock
 * (`now`, `advance(ms)`; expiry is lazy on access, like Redis' lazy path), several clients (`exec(line, client)`) so WATCH and
 * pub/sub can be shown. Replies are RESP2-shaped and `format()` prints them like redis-cli in a terminal.
 * Error texts are Redis/Valkey 7.x wording written from memory; LPOP's arity was checked against valkey t_list.c, the rest still needs a diff against a real server.
 * ponytail: no Lua, no blocking (XREAD BLOCK returns at once), no keyspace events, SCAN returns everything with cursor 0,
 * KEYS/SMEMBERS/HGETALL come back in insertion order (Redis leaves it unspecified: grade those unordered).
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
function toFloat(s: string, msg = NOT_FLOAT): number {
  const l = s.toLowerCase();
  if (l === 'inf' || l === '+inf' || l === 'infinity' || l === '+infinity') return Infinity;
  if (l === '-inf' || l === '-infinity') return -Infinity;
  const n = s.trim() === s && s !== '' ? Number(s) : NaN;
  return Number.isNaN(n) ? fail(msg) : n;
}
/** ponytail: JS shortest round-trip, close to Redis 7's fpconv_dtoa; differs only on exotic exponents. */
const fmtScore = (n: number): string => (n === Infinity ? 'inf' : n === -Infinity ? '-inf' : String(n));
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

type Id = [number, number];
interface Stream { entries: { id: Id; f: string[] }[]; last: Id }
interface Val { string: string; hash: Map<string, string>; list: string[]; set: Set<string>; zset: Map<string, number>; stream: Stream }
type Kind = keyof Val;
interface Entry { type: Kind; v: unknown; exp?: number }
interface Client { id: number; multi?: string[][]; dirty?: boolean; watched: Map<string, number>; subs: Set<string>; inbox: Reply[] }
interface Spec { arity: number; fn: (a: string[], c: Client) => Reply }

const idStr = (id: Id): string => `${id[0]}-${id[1]}`;
const cmpId = (a: Id, b: Id): number => a[0] - b[0] || a[1] - b[1];
function parseId(s: string, seqDefault: number): Id {
  const m = /^(\d+)(?:-(\d+))?$/.exec(s);
  return m ? [Number(m[1]), m[2] === undefined ? seqDefault : Number(m[2])] : fail(BAD_ID);
}
const byScore = (x: [string, number], y: [string, number]): number => (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0);
const TX = new Set(['multi', 'exec', 'discard', 'watch']);
const IN_SUB = new Set(['subscribe', 'unsubscribe', 'psubscribe', 'punsubscribe', 'ping', 'quit', 'reset']);

/** In-game "today" (CLAUDE.md: 2026-10-31), so stream ids and TTLs are the same on every run. */
export const START_MS = Date.UTC(2026, 9, 31);

export class RedisSim {
  private data = new Map<string, Entry>();
  private ver = new Map<string, number>();
  private clients = new Map<number, Client>();
  private cmds: Record<string, Spec>;

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

  /** Key state for grading a write: every live key with its type, value (sets/hashes sorted) and PTTL (-1 = none). */
  dump(): Record<string, { type: Kind; value: unknown; pttl: number }> {
    const out: Record<string, { type: Kind; value: unknown; pttl: number }> = {};
    for (const k of [...this.data.keys()].sort()) {
      const en = this.entry(k);
      if (!en) continue;
      const v = en.v as Val[Kind];
      const value = v instanceof Set ? [...v].sort()
        : v instanceof Map ? [...v].sort((a, b) => (a[0] < b[0] ? -1 : 1))
        : typeof v === 'object' && !Array.isArray(v) ? (v as Stream).entries.map((e) => [idStr(e.id), e.f])
        : v;
      out[k] = { type: en.type, value, pttl: en.exp === undefined ? -1 : en.exp - this.now };
    }
    return out;
  }

  call(args: string[], client = 0): Reply {
    const c = this.client(client);
    const name = args[0].toLowerCase();
    const spec = this.cmds[name];
    if (c.subs.size && !IN_SUB.has(name)) {
      return { t: 'err', v: `ERR Can't execute '${name}': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context` };
    }
    const refuse = (v: string): Reply => {
      if (c.multi) c.dirty = true;
      return { t: 'err', v };
    };
    if (!spec) return refuse(`ERR unknown command '${args[0]}', with args beginning with: ${args.slice(1).map((a) => `'${a}' `).join('')}`);
    if (spec.arity > 0 ? args.length !== spec.arity : args.length < -spec.arity) return refuse(arity(name));
    if (c.multi && !TX.has(name)) {
      c.multi.push(args);
      return status('QUEUED');
    }
    try {
      return spec.fn(args.slice(1), c);
    } catch (e) {
      if (e instanceof RedisError) return { t: 'err', v: e.message };
      throw e;
    }
  }

  private client(id: number): Client {
    let c = this.clients.get(id);
    if (!c) this.clients.set(id, (c = { id, watched: new Map(), subs: new Set(), inbox: [] }));
    return c;
  }
  private touch(key: string): void {
    this.ver.set(key, (this.ver.get(key) ?? 0) + 1);
  }
  private entry(key: string): Entry | undefined {
    const en = this.data.get(key);
    if (en?.exp !== undefined && en.exp <= this.now) {
      this.data.delete(key);
      this.touch(key);
      return undefined;
    }
    return en;
  }
  private get<K extends Kind>(key: string, type: K): Val[K] | undefined {
    const en = this.entry(key);
    if (!en) return undefined;
    return en.type === type ? (en.v as Val[K]) : fail(WRONGTYPE);
  }
  private make<K extends Kind>(key: string, type: K, init: () => Val[K]): Val[K] {
    const v = this.get(key, type);
    if (v !== undefined) return v;
    const nv = init();
    this.data.set(key, { type, v: nv });
    return nv;
  }
  /** Set a string; `keepExp` keeps the TTL (INCR/APPEND do, SET does not unless KEEPTTL). */
  private put(key: string, v: string, keepExp: boolean, exp?: number): void {
    const old = keepExp ? this.entry(key)?.exp : exp;
    this.data.set(key, { type: 'string', v, exp: old });
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

  private incrBy(key: string, delta: bigint): Reply {
    const cur = toBig(this.get(key, 'string') ?? '0');
    const n = cur + delta;
    if (n < I64[0] || n > I64[1]) fail('ERR increment or decrement would overflow');
    this.put(key, String(n), true);
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
    const opts = a.slice(3).map((x) => x.toLowerCase());
    if (opts.some((o) => o !== 'withscores')) fail(SYNTAX);
    const z = this.zsorted(a[0]);
    if (rev) z.reverse();
    const s = span(z.length, toInt(a[1]), toInt(a[2]));
    return arr(s ? z.slice(s[0], s[1] + 1).flatMap(([m, sc]) => (opts.length ? [m, fmtScore(sc)] : [m])) : []);
  }
  private zrank(a: string[], rev: boolean): Reply {
    const z = this.zsorted(a[0]);
    const i = z.findIndex(([m]) => m === a[1]);
    return i < 0 ? NIL : int(rev ? z.length - 1 - i : i);
  }
  private setOp(keys: string[], inter: boolean): Reply {
    const sets = keys.map((k) => this.get(k, 'set') ?? new Set<string>());
    if (!inter) return arr([...new Set(sets.flatMap((s) => [...s]))]);
    return arr([...sets[0]].filter((m) => sets.every((s) => s.has(m))));
  }
  private xrangeOut(s: Stream | undefined, after: (id: Id) => boolean, count?: number): Reply[] {
    const hit = (s?.entries ?? []).filter((e) => after(e.id));
    return hit.slice(0, count ?? hit.length).map((e) => arr([idStr(e.id), arr(e.f)]));
  }

  private table(): Record<string, Spec> {
    const T: Record<string, Spec> = {
      ping: { arity: -1, fn: (a) => (a.length > 1 ? fail(arity('ping')) : a[0] === undefined ? status('PONG') : bulk(a[0])) },
      echo: { arity: 2, fn: (a) => bulk(a[0]) },
      dbsize: { arity: 1, fn: () => int([...this.data.keys()].filter((k) => this.entry(k)).length) },
      flushall: { arity: -1, fn: () => { [...this.data.keys()].forEach((k) => this.touch(k)); this.data.clear(); return OK; } },

      // strings
      get: { arity: 2, fn: (a) => bulk(this.get(a[0], 'string')) },
      set: { arity: -3, fn: (a) => {
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
      incr: { arity: 2, fn: (a) => this.incrBy(a[0], 1n) },
      decr: { arity: 2, fn: (a) => this.incrBy(a[0], -1n) },
      incrby: { arity: 3, fn: (a) => this.incrBy(a[0], toBig(a[1])) },
      decrby: { arity: 3, fn: (a) => this.incrBy(a[0], -toBig(a[1])) },
      mget: { arity: -2, fn: (a) => arr(a.map((k) => { const en = this.entry(k); return en?.type === 'string' ? bulk(en.v as string) : NIL; })) },
      mset: { arity: -3, fn: (a) => {
        if (a.length % 2) fail(arity('mset'));
        for (let i = 0; i < a.length; i += 2) this.put(a[i], a[i + 1], false);
        return OK;
      } },
      append: { arity: 3, fn: (a) => { const v = (this.get(a[0], 'string') ?? '') + a[1]; this.put(a[0], v, true); return int(bytes(v)); } },
      strlen: { arity: 2, fn: (a) => int(bytes(this.get(a[0], 'string') ?? '')) },

      // keys
      del: { arity: -2, fn: (a) => int(a.filter((k) => { const had = !!this.entry(k); if (had) { this.data.delete(k); this.touch(k); } return had; }).length) },
      exists: { arity: -2, fn: (a) => int(a.filter((k) => this.entry(k)).length) },
      expire: { arity: 3, fn: (a) => this.expire(a[0], toInt(a[1]) * 1000) },
      pexpire: { arity: 3, fn: (a) => this.expire(a[0], toInt(a[1])) },
      ttl: { arity: 2, fn: (a) => this.ttl(a[0], false) },
      pttl: { arity: 2, fn: (a) => this.ttl(a[0], true) },
      persist: { arity: 2, fn: (a) => { const en = this.entry(a[0]); if (en?.exp === undefined) return int(0); delete en.exp; this.touch(a[0]); return int(1); } },
      type: { arity: 2, fn: (a) => status(this.entry(a[0])?.type ?? 'none') },
      keys: { arity: 2, fn: (a) => { const re = glob(a[0]); return arr([...this.data.keys()].filter((k) => this.entry(k) && re.test(k))); } },
      scan: { arity: -2, fn: (a) => {
        toInt(a[0], 'ERR invalid cursor');
        let re: RegExp | undefined, type: string | undefined;
        for (let i = 1; i < a.length; i += 2) {
          const o = a[i].toLowerCase();
          if (a[i + 1] === undefined) fail(SYNTAX);
          if (o === 'match') re = glob(a[i + 1]);
          else if (o === 'type') type = a[i + 1].toLowerCase();
          else if (o === 'count') { if (toInt(a[i + 1]) < 1) fail(SYNTAX); }
          else fail(SYNTAX);
        }
        // ponytail: one pass, cursor always 0; a real cursor walk only if a lesson teaches paging.
        const ks = [...this.data.keys()].filter((k) => { const en = this.entry(k); return en && (!re || re.test(k)) && (!type || en.type === type); });
        return arr(['0', arr(ks)]);
      } },

      // hashes
      hset: { arity: -4, fn: (a) => {
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
      hincrby: { arity: 4, fn: (a) => {
        const by = toBig(a[2]);
        const h = this.make(a[0], 'hash', () => new Map());
        const n = toBig(h.get(a[1]) ?? '0', 'ERR hash value is not an integer') + by;
        if (n < I64[0] || n > I64[1]) fail('ERR increment or decrement would overflow');
        h.set(a[1], String(n));
        this.touch(a[0]);
        return int(Number(n));
      } },

      // lists
      lpush: { arity: -3, fn: (a) => this.push(a[0], a.slice(1), true) },
      rpush: { arity: -3, fn: (a) => this.push(a[0], a.slice(1), false) },
      lpop: { arity: -2, fn: (a) => this.pop(a, true) },
      rpop: { arity: -2, fn: (a) => this.pop(a, false) },
      llen: { arity: 2, fn: (a) => int(this.get(a[0], 'list')?.length ?? 0) },
      lrange: { arity: 4, fn: (a) => {
        const l = this.get(a[0], 'list') ?? [];
        const s = span(l.length, toInt(a[1]), toInt(a[2]));
        return arr(s ? l.slice(s[0], s[1] + 1) : []);
      } },

      // sets
      sadd: { arity: -3, fn: (a) => {
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
      zadd: { arity: -4, fn: (a) => {
        let i = 1, nx = false, xx = false, ch = false;
        for (; i < a.length; i++) {
          const o = a[i].toLowerCase();
          if (o === 'nx') nx = true;
          else if (o === 'xx') xx = true;
          else if (o === 'ch') ch = true;
          else break;
        }
        if (nx && xx) fail('ERR XX and NX options at the same time are not compatible');
        const rest = a.slice(i);
        if (!rest.length || rest.length % 2) fail(SYNTAX);
        const pairs: [number, string][] = [];
        for (let j = 0; j < rest.length; j += 2) pairs.push([toFloat(rest[j]), rest[j + 1]]);
        if (xx && !this.get(a[0], 'zset')) return int(0);
        const z = this.make(a[0], 'zset', () => new Map());
        let added = 0, changed = 0;
        for (const [sc, m] of pairs) {
          const old = z.get(m);
          if (old === undefined ? xx : nx) continue;
          if (old === undefined) added++;
          else if (old !== sc) changed++;
          z.set(m, sc);
        }
        this.wrote(a[0]);
        return int(ch ? added + changed : added);
      } },
      zincrby: { arity: 4, fn: (a) => {
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
      zrem: { arity: -3, fn: (a) => {
        const z = this.get(a[0], 'zset');
        const n = z ? a.slice(1).filter((m) => z.delete(m)).length : 0;
        if (n) this.wrote(a[0]);
        return int(n);
      } },
      zrangebyscore: { arity: -4, fn: (a) => {
        const bound = (s: string): [number, boolean] => {
          const ex = s.startsWith('(');
          return [toFloat(ex ? s.slice(1) : s, 'ERR min or max is not a float'), ex];
        };
        const [min, minEx] = bound(a[1]);
        const [max, maxEx] = bound(a[2]);
        let ws = false, off = 0, cnt = -1;
        for (let i = 3; i < a.length; i++) {
          const o = a[i].toLowerCase();
          if (o === 'withscores') ws = true;
          else if (o === 'limit' && a[i + 2] !== undefined) { off = toInt(a[i + 1]); cnt = toInt(a[i + 2]); i += 2; }
          else fail(SYNTAX);
        }
        const hit = this.zsorted(a[0]).filter(([, s]) => (minEx ? s > min : s >= min) && (maxEx ? s < max : s <= max));
        const page = off < 0 ? [] : hit.slice(off, cnt < 0 ? undefined : off + cnt);
        return arr(page.flatMap(([m, s]) => (ws ? [m, fmtScore(s)] : [m])));
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
        return arr(q.map((args) => this.call(args, c.id)));
      } },
      watch: { arity: -2, fn: (a, c) => {
        if (c.multi) fail('ERR WATCH inside MULTI is not allowed');
        for (const k of a) { this.entry(k); c.watched.set(k, this.ver.get(k) ?? 0); }
        return OK;
      } },
      unwatch: { arity: 1, fn: (_a, c) => { this.unwatch(c); return OK; } },

      // streams (basic subset)
      xadd: { arity: -5, fn: (a) => {
        const fv = a.slice(2);
        if (fv.length % 2) fail(arity('xadd'));
        const prev = this.get(a[0], 'stream');
        const last: Id = prev?.last ?? [0, 0];
        let id: Id;
        if (a[1] === '*') {
          const ms = Math.max(this.now, last[0]);
          id = [ms, ms === last[0] ? last[1] + 1 : 0];
        } else if (/^\d+-\*$/.test(a[1])) {
          const ms = Number(a[1].slice(0, -2));
          id = [ms, ms === last[0] ? last[1] + 1 : 0];
          if (ms === 0 && id[1] === 0) id[1] = 1;
        } else id = parseId(a[1], 0);
        if (id[0] === 0 && id[1] === 0) fail('ERR The ID specified in XADD must be greater than 0-0');
        if (cmpId(id, last) <= 0) fail('ERR The ID specified in XADD is equal or smaller than the target stream top item');
        const s = this.make(a[0], 'stream', () => ({ entries: [], last: [0, 0] }));
        s.entries.push({ id, f: fv });
        s.last = id;
        this.touch(a[0]);
        return bulk(idStr(id));
      } },
      xlen: { arity: 2, fn: (a) => int(this.get(a[0], 'stream')?.entries.length ?? 0) },
      xrange: { arity: -4, fn: (a) => {
        const lo = a[1] === '-' ? [0, 0] as Id : parseId(a[1], 0);
        const hi = a[2] === '+' ? [Infinity, Infinity] as Id : parseId(a[2], Infinity);
        let count: number | undefined;
        if (a.length > 3) {
          if (a.length !== 5 || a[3].toLowerCase() !== 'count') fail(SYNTAX);
          count = Math.max(0, toInt(a[4]));
        }
        return arr(this.xrangeOut(this.get(a[0], 'stream'), (id) => cmpId(id, lo) >= 0 && cmpId(id, hi) <= 0, count));
      } },
      xread: { arity: -4, fn: (a) => {
        let i = 0, count: number | undefined;
        for (; i < a.length; i++) {
          const o = a[i].toLowerCase();
          if (o === 'count' && a[i + 1] !== undefined) count = toInt(a[++i]);
          else if (o === 'block' && a[i + 1] !== undefined) toInt(a[++i], 'ERR timeout is not an integer or out of range'); // ponytail: never blocks
          else if (o === 'streams') break;
          else fail(SYNTAX);
        }
        const rest = a.slice(i + 1);
        if (i >= a.length || !rest.length || rest.length % 2) fail("ERR Unbalanced 'xread' list of streams: for each stream key an ID or '$' must be specified.");
        const half = rest.length / 2;
        const out: Reply[] = [];
        for (let k = 0; k < half; k++) {
          const s = this.get(rest[k], 'stream');
          const from = rest[half + k] === '$' ? (s?.last ?? [0, 0]) : parseId(rest[half + k], 0);
          const hit = this.xrangeOut(s, (id) => cmpId(id, from) > 0, count);
          if (hit.length) out.push(arr([rest[k], arr(hit)]));
        }
        return out.length ? arr(out) : NIL;
      } },

      // pub/sub, simulated: PUBLISH drops the message into each subscriber's inbox (messages(client)).
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
    };
    return T;
  }

  private expire(key: string, ms: number): Reply {
    const en = this.entry(key);
    if (!en) return int(0);
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
