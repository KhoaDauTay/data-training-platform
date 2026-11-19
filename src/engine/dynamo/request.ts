// ENG-DYNAMO: editor text → DynamoRequest. Pure, no DOM. The text is data: JSON.parse or a PartiQL string handed to the
// engine as `Statement`, never eval/new Function.
import { DYNAMO_OPS, DynamoInputError, type DynamoOp, type DynamoRequest, type InputCode } from './types';

/** Same ceiling as the Sandbox draft. */
export const MAX_INPUT_CHARS = 20_000;

const TYPES = new Set(['S', 'N', 'B', 'BOOL', 'NULL', 'M', 'L', 'SS', 'NS', 'BS']);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isOp = (x: unknown): x is DynamoOp => typeof x === 'string' && (DYNAMO_OPS as readonly string[]).includes(x);

/** One attribute value must be `{ <type>: value }` with exactly one DynamoDB type key. */
const typed = (v: unknown) => isObj(v) && Object.keys(v).length === 1 && TYPES.has(Object.keys(v)[0]);

/** First untyped attribute value in the fields players write by hand, as a path (`ExpressionAttributeValues.:c`). */
function untypedPath(input: Record<string, unknown>): string | undefined {
  for (const field of ['ExpressionAttributeValues', 'Item', 'Key', 'ExclusiveStartKey'] as const) {
    const m = input[field];
    if (m === undefined) continue;
    if (!isObj(m)) return field;
    for (const [k, v] of Object.entries(m)) if (!typed(v)) return `${field}.${k}`;
  }
  return undefined;
}

function jsonError(text: string, e: unknown): DynamoInputError {
  const msg = e instanceof Error ? e.message : String(e);
  const lc = /line (\d+) column (\d+)/.exec(msg);
  if (lc) return new DynamoInputError('json', msg, +lc[1], +lc[2]);
  const pos = /position (\d+)/.exec(msg);
  if (!pos) return new DynamoInputError('json', msg);
  const before = text.slice(0, +pos[1]).split('\n');
  return new DynamoInputError('json', msg, before.length, before[before.length - 1].length + 1);
}

/**
 * Parses the editor: `{ "op": "Query", "input": { … } }` (JSON, typed DynamoDB-JSON values) or a PartiQL statement
 * (anything not starting with `{`), which becomes `ExecuteStatement`. Throws DynamoInputError.
 */
export function parseRequest(text: string): DynamoRequest {
  const src = text.trim();
  if (!src) throw new DynamoInputError('empty');
  if (src.length > MAX_INPUT_CHARS) throw new DynamoInputError('tooLong', String(src.length));
  if (!src.startsWith('{')) return { op: 'ExecuteStatement', input: { Statement: src } };
  let v: unknown;
  try {
    v = JSON.parse(src);
  } catch (e) {
    throw jsonError(src, e);
  }
  if (!isObj(v) || Object.keys(v).some((k) => k !== 'op' && k !== 'input')) throw new DynamoInputError('shape');
  if (!isOp(v.op)) throw new DynamoInputError('op', typeof v.op === 'string' ? v.op : '');
  const input = v.input ?? {};
  if (!isObj(input)) throw new DynamoInputError('input');
  const bad = untypedPath(input);
  if (bad) throw new DynamoInputError('untyped', bad);
  return { op: v.op, input };
}

const TEXT: Record<InputCode, { vi: string; en: string }> = {
  empty: { vi: 'Editor đang trống: viết một request JSON hoặc một câu PartiQL.', en: 'The editor is empty: write a JSON request or a PartiQL statement.' },
  tooLong: { vi: 'Request quá dài (tối đa 20.000 ký tự).', en: 'The request is too long (20,000 characters at most).' },
  json: { vi: 'JSON chưa đúng cú pháp{at}.', en: 'The JSON is not valid{at}.' },
  shape: { vi: 'Request phải có dạng { "op": "...", "input": { ... } } và không có khóa nào khác.', en: 'A request is { "op": "...", "input": { ... } } with no other keys.' },
  op: { vi: `"op" phải là một trong: ${DYNAMO_OPS.join(', ')}.`, en: `"op" must be one of: ${DYNAMO_OPS.join(', ')}.` },
  input: { vi: '"input" phải là một object { ... }.', en: '"input" must be an object { ... }.' },
  untyped: { vi: 'Giá trị ở {path} cần ghi kiểu DynamoDB, ví dụ { "S": "CUST#1" } hoặc { "N": "42" }.', en: 'The value at {path} needs its DynamoDB type, e.g. { "S": "CUST#1" } or { "N": "42" }.' },
};

/** One sentence for the player. */
export function inputText(e: DynamoInputError, lang: 'vi' | 'en'): string {
  const at = e.line ? (lang === 'vi' ? ` (dòng ${e.line}, cột ${e.column})` : ` (line ${e.line}, column ${e.column})`) : '';
  return TEXT[e.code][lang].replace('{at}', at).replace('{path}', e.detail);
}
