/**
 * v47 spike: one redis-cli input line → its arguments, a port of hiredis/sds `sdssplitargs` (what redis-cli uses).
 * Double quotes take `\n \r \t \b \a \\ \" \xHH`; single quotes take only `\'`; a closing quote must be followed by a space
 * or the end; an unbalanced quote → null (redis-cli prints "Invalid argument(s)"). A quote may open mid-token (`a"b c"` = `ab c`).
 * ponytail: strings are JS strings, not bytes; `\xHH` ≥ 0x80 becomes the Latin-1 char, fine for a teaching subset.
 */
const isSpace = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);
const isHex = (c: string | undefined): boolean => c !== undefined && /[0-9a-fA-F]/.test(c);
const ESC: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', a: '\x07' };

export function parseLine(line: string): string[] | null {
  const out: string[] = [];
  let i = 0;
  const n = line.length;
  for (;;) {
    while (isSpace(line[i])) i++;
    if (i >= n) return out;
    let cur = '';
    let q: '"' | "'" | '' = '';
    for (;;) {
      const ch = line[i];
      if (q === '"') {
        if (i >= n) return null;
        if (ch === '\\' && line[i + 1] === 'x' && isHex(line[i + 2]) && isHex(line[i + 3])) {
          cur += String.fromCharCode(parseInt(line.slice(i + 2, i + 4), 16));
          i += 3;
        } else if (ch === '\\' && i + 1 < n) {
          i++;
          cur += ESC[line[i]] ?? line[i];
        } else if (ch === '"') {
          if (i + 1 < n && !isSpace(line[i + 1])) return null;
          i++;
          break;
        } else cur += ch;
      } else if (q === "'") {
        if (i >= n) return null;
        if (ch === '\\' && line[i + 1] === "'") {
          cur += "'";
          i++;
        } else if (ch === "'") {
          if (i + 1 < n && !isSpace(line[i + 1])) return null;
          i++;
          break;
        } else cur += ch;
      } else {
        if (i >= n || isSpace(ch)) break;
        if (ch === '"' || ch === "'") q = ch;
        else cur += ch;
      }
      i++;
    }
    out.push(cur);
  }
}
