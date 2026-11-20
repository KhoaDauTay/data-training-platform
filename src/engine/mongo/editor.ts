// Highlighting for the mongosh subset (parse.ts), as a CodeMirror StreamLanguage from the already pinned
// @codemirror/language: no lang-javascript dependency. The token names map onto the tags src/ui/editor.ts colours
// (keyword, string, number, comment, operator, propertyName, atom). Not part of the worker chunk.
import { StreamLanguage, type StringStream } from '@codemirror/language';
import { METHODS } from './parse';

const WORDS = new Set(['db', 'new', 'getCollection', 'sort', 'limit', 'skip', 'toArray', 'pretty', ...Object.keys(METHODS)]);
const TYPES = new Set(['ISODate', 'Date', 'ObjectId', 'NumberInt', 'NumberLong', 'NumberDecimal', 'Int32', 'Long', 'Double', 'Decimal128']);

interface State {
  inComment: boolean;
  /** The last token could end a value, so a following "/" is division-like punctuation, not a regex. */
  afterValue: boolean;
}

function token(s: StringStream, st: State): string | null {
  if (st.inComment) {
    st.inComment = !s.skipTo('*/');
    if (st.inComment) s.skipToEnd();
    else s.pos += 2;
    return 'comment';
  }
  if (s.eatSpace()) return null;
  if (s.match('//')) {
    s.skipToEnd();
    return 'comment';
  }
  if (s.match('/*')) {
    st.inComment = true;
    return token(s, st) ?? 'comment';
  }
  const ch = s.next()!;
  if (ch === '"' || ch === "'") {
    let esc = false;
    for (let c = s.next(); c !== undefined; c = s.next()) {
      if (c === ch && !esc) break;
      esc = !esc && c === '\\';
    }
    st.afterValue = true;
    return 'string';
  }
  if (ch === '/' && !st.afterValue) {
    s.match(/^(?:\\.|\[(?:\\.|[^\]])*\]|[^/\\\n])*\/[a-z]*/);
    st.afterValue = true;
    return 'string.special';
  }
  if (/[\d.-]/.test(ch) && s.match(/^[\d.]*(?:[eE][-+]?\d+)?/) !== null && /[\d]/.test(s.current())) {
    st.afterValue = true;
    return 'number';
  }
  if (/[\w$]/.test(ch)) {
    s.eatWhile(/[\w$]/);
    const w = s.current();
    st.afterValue = true;
    if (w === 'true' || w === 'false' || w === 'null') return 'atom';
    if (w.startsWith('$')) return 'operator'; // $match, $gt, $sum …
    if (TYPES.has(w)) return 'typeName';
    if (WORDS.has(w)) return 'keyword';
    return s.match(/^\s*:/, false) ? 'propertyName' : 'variableName';
  }
  st.afterValue = ch === ')' || ch === ']' || ch === '}';
  return null;
}

export const mongoShell = StreamLanguage.define<State>({
  name: 'mongosh',
  startState: () => ({ inComment: false, afterValue: false }),
  token,
  languageData: { commentTokens: { line: '//', block: { open: '/*', close: '*/' } } },
});
