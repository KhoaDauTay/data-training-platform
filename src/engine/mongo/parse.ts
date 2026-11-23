// mongosh text → data. A hand-written recursive-descent parser over a safe subset of the shell: it never evaluates
// anything (no eval, no Function), it only builds literals, so player text cannot run code in the worker.
//
//   db.<coll>.<method>(args…)[.<chain>(args…)]*[;]      db.getCollection("name") also names a collection
//   values: { a: 1, "b.c": 'x', $gt: -2.5e3, }  [1, 2,]  true false null  /re/i
//           ISODate("…")  new Date("…" | ms)  Date("…")  ObjectId("<24 hex>") → the hex string
//           NumberInt / NumberLong / NumberDecimal / Int32 / Double (n | "n") → number      // and /* */ comments
import { MongoSyntaxError, type MongoDoc, type MongoValue } from './types';

export interface Call {
  name: string;
  args: MongoValue[];
  /** Offset of the method name (for positioned errors after parsing). */
  at: number;
}
export interface Command {
  collection: string;
  method: Call;
  chain: Call[];
}

/** Methods on a collection and the chain calls each one allows. Anything else is a positioned error. */
export const METHODS: Record<string, readonly string[]> = {
  find: ['sort', 'limit', 'skip', 'toArray', 'pretty'],
  findOne: [],
  findOneAndUpdate: [],
  countDocuments: [],
  distinct: [],
  aggregate: ['toArray', 'pretty'],
  insertOne: [],
  insertMany: [],
  updateOne: [],
  updateMany: [],
  deleteOne: [],
  deleteMany: [],
  createIndex: [],
  getIndexes: [],
};

/** Keys that would reach Object.prototype when assigned. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** Server-side JavaScript operators. The parser could never build their function bodies anyway; this names the reason. */
const SCRIPT_OPS = new Set(['$where', '$function', '$accumulator']);
const NUMBER_WRAPPERS = new Set(['NumberInt', 'NumberLong', 'NumberDecimal', 'Int32', 'Long', 'Double', 'Decimal128']);

export function parseShell(src: string): Command {
  return new Parser(src).command();
}

/** One literal value (used by tests and by seed tooling). */
export function parseValue(src: string): MongoValue {
  const p = new Parser(src);
  const v = p.value();
  p.end();
  return v;
}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  fail(code: string, message: string, at = this.i): never {
    let line = 1;
    let col = 1;
    for (let k = 0; k < at && k < this.s.length; k++) {
      if (this.s[k] === '\n') {
        line++;
        col = 1;
      } else col++;
    }
    throw new MongoSyntaxError(code, `${message} (line ${line}, column ${col})`, at, line, col);
  }

  /** Skips whitespace and comments. */
  ws(): void {
    for (;;) {
      const c = this.s[this.i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') this.i++;
      else if (c === '/' && this.s[this.i + 1] === '/') {
        while (this.i < this.s.length && this.s[this.i] !== '\n') this.i++;
      } else if (c === '/' && this.s[this.i + 1] === '*') {
        const end = this.s.indexOf('*/', this.i + 2);
        if (end < 0) this.fail('unterminated_comment', 'Comment is not closed with */');
        this.i = end + 2;
      } else return;
    }
  }

  peek(): string | undefined {
    this.ws();
    return this.s[this.i];
  }

  eat(c: string): boolean {
    if (this.peek() !== c) return false;
    this.i++;
    return true;
  }

  expect(c: string, what = `"${c}"`): void {
    if (!this.eat(c)) this.fail('expected', `Expected ${what}${this.found()}`);
  }

  found(): string {
    this.ws();
    return this.i >= this.s.length ? ' but the input ended' : ` but found "${this.s[this.i]}"`;
  }

  ident(): string {
    this.ws();
    const m = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i));
    if (!m) this.fail('expected_name', `Expected a name${this.found()}`);
    this.i += m[0].length;
    return m[0];
  }

  end(): void {
    this.eat(';');
    if (this.peek() !== undefined) this.fail('trailing', 'Only one command per run: unexpected text after the command');
  }

  command(): Command {
    if (this.peek() === undefined) this.fail('empty', 'Nothing to run');
    const dbAt = this.i;
    if (this.ident() !== 'db') this.fail('expected_db', 'A command starts with db.<collection>', dbAt);
    this.expect('.');
    const at = this.i;
    let collection = this.ident();
    if (collection === 'getCollection') {
      this.expect('(');
      this.ws();
      const nameAt = this.i;
      const name = this.value();
      if (typeof name !== 'string' || !name) this.fail('expected_string', 'getCollection needs a collection name in quotes', nameAt);
      this.expect(')');
      collection = name;
    } else if (Object.hasOwn(METHODS, collection) || this.peek() === '(') {
      this.fail('expected_collection', `Name the collection first: db.<collection>.${collection}(…)`, at);
    }
    this.expect('.');
    const method = this.call();
    const allowed = Object.hasOwn(METHODS, method.name) ? METHODS[method.name] : undefined;
    if (!allowed) this.fail('unknown_method', `Unknown or unsupported collection method "${method.name}"`, method.at);
    const chain: Call[] = [];
    while (this.eat('.')) {
      const c = this.call();
      if (!allowed.includes(c.name)) this.fail('unknown_chain', `"${c.name}()" cannot follow ${method.name}() here`, c.at);
      chain.push(c);
    }
    this.end();
    return { collection, method, chain };
  }

  call(): Call {
    this.ws();
    const at = this.i;
    const name = this.ident();
    this.expect('(', `"(" after ${name}`);
    const args: MongoValue[] = [];
    while (!this.eat(')')) {
      args.push(this.value());
      if (!this.eat(',')) {
        this.expect(')', '"," or ")"');
        break;
      }
    }
    return { name, args, at };
  }

  value(): MongoValue {
    const c = this.peek();
    if (c === undefined) this.fail('unexpected_end', 'The input ended where a value was expected');
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'") return this.string();
    if (c === '/') return this.regex();
    if (c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')) return this.number();
    const at = this.i;
    const word = this.ident();
    switch (word) {
      case 'true':
        return true;
      case 'false':
        return false;
      case 'null':
        return null;
      case 'new': {
        const nameAt = this.i;
        if (this.ident() !== 'Date') this.fail('unsupported_value', 'Only "new Date(…)" is supported after new', nameAt);
        return this.date();
      }
      case 'ISODate':
      case 'Date':
        return this.date();
      case 'ObjectId': {
        this.expect('(');
        this.ws();
        const hexAt = this.i;
        const hex = this.string();
        if (!/^[0-9a-f]{24}$/i.test(hex)) this.fail('bad_objectid', 'ObjectId needs 24 hex characters', hexAt);
        this.expect(')');
        return hex.toLowerCase();
      }
    }
    if (NUMBER_WRAPPERS.has(word)) {
      this.expect('(');
      this.ws();
      const nAt = this.i;
      const v = this.value();
      const n = typeof v === 'string' ? Number(v) : v;
      if (typeof n !== 'number' || !Number.isFinite(n)) this.fail('bad_number', `${word} needs a number`, nAt);
      this.expect(')');
      return n;
    }
    return this.fail('unsupported_value', `"${word}" is not a value here (no variables or functions: write literals)`, at);
  }

  date(): Date {
    this.expect('(');
    if (this.eat(')')) return new Date();
    this.ws();
    const at = this.i;
    const v = this.value();
    this.expect(')');
    const d = typeof v === 'string' || typeof v === 'number' ? new Date(v) : undefined;
    if (!d || Number.isNaN(d.getTime())) this.fail('bad_date', 'Not a valid date', at);
    return d;
  }

  object(): MongoDoc {
    this.expect('{');
    const o: MongoDoc = {};
    while (!this.eat('}')) {
      const c = this.peek();
      const at = this.i;
      const key = c === '"' || c === "'" ? this.string() : c !== undefined && /[0-9]/.test(c) ? String(this.number()) : this.ident();
      if (FORBIDDEN_KEYS.has(key)) this.fail('forbidden_key', `The key "${key}" is not allowed`, at);
      if (SCRIPT_OPS.has(key)) this.fail('script_disabled', `${key} runs JavaScript on the server and is disabled here`, at);
      this.expect(':', `":" after the key "${key}"`);
      o[key] = this.value();
      if (!this.eat(',')) {
        this.expect('}', '"," or "}"');
        break;
      }
    }
    return o;
  }

  array(): MongoValue[] {
    this.expect('[');
    const a: MongoValue[] = [];
    while (!this.eat(']')) {
      a.push(this.value());
      if (!this.eat(',')) {
        this.expect(']', '"," or "]"');
        break;
      }
    }
    return a;
  }

  string(): string {
    this.ws();
    const q = this.s[this.i];
    const start = this.i++;
    let out = '';
    for (;;) {
      if (this.i >= this.s.length || this.s[this.i] === '\n') this.fail('unterminated_string', 'String is not closed', start);
      const c = this.s[this.i++];
      if (c === q) return out;
      if (c !== '\\') {
        out += c;
        continue;
      }
      const e = this.s[this.i++];
      const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
      if (e === 'u') {
        const hex = this.s.slice(this.i, this.i + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('bad_escape', 'Bad \\u escape', this.i - 2);
        out += String.fromCharCode(parseInt(hex, 16));
        this.i += 4;
      } else out += Object.hasOwn(simple, e) ? simple[e] : e;
    }
  }

  number(): number {
    this.ws();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i));
    if (!m) this.fail('bad_number', `Expected a number${this.found()}`);
    this.i += m[0].length;
    return Number(m[0]);
  }

  regex(): RegExp {
    this.ws();
    const start = this.i++;
    let body = '';
    let inClass = false;
    for (;;) {
      if (this.i >= this.s.length || this.s[this.i] === '\n') this.fail('unterminated_regex', 'Regular expression is not closed with /', start);
      const c = this.s[this.i++];
      if (c === '\\') {
        body += c + (this.s[this.i++] ?? '');
        continue;
      }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
      body += c;
    }
    const flags = /^[a-z]*/.exec(this.s.slice(this.i))![0];
    this.i += flags.length;
    if (/[^imsx]/.test(flags)) this.fail('bad_regex', `Regex flags may only be i, m, s, x`, start);
    try {
      return new RegExp(body, flags.replace('x', ''));
    } catch (e) {
      return this.fail('bad_regex', `Invalid regular expression: ${(e as Error).message}`, start);
    }
  }
}
