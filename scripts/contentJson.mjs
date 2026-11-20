// V22-E (L201): content YAML becomes JSON at build time, so the `yaml` library never ships to the browser.
// One converter for the Vite plugin (vite.config.ts: dev, build and Vitest) and the tests; kept in .mjs like offline.mjs.
import { parse } from 'yaml';

/** A .yml file's data. */
export const yamlData = (text) => parse(text);

/** A markdown file with YAML frontmatter as { fm, body } (CRLF normalised first), or null without a `---` block. */
export function mdData(text) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  return m ? { fm: parse(m[1]) ?? {}, body: m[2] } : null;
}

/**
 * Integration (L248): `?fm&meta=a,b` keeps only those frontmatter keys and drops the body: an index chunk (the Database
 * Engine lesson list) without every lesson's text, which then loads per file through plain `?fm`.
 */
export function metaData(text, keys) {
  const d = mdData(text);
  return d && { fm: Object.fromEntries(keys.filter((k) => d.fm && Object.hasOwn(d.fm, k)).map((k) => [k, d.fm[k]])) };
}

/**
 * Vite plugin: `import x from '…/file.yml'` gives the parsed data, and `import x from '…/file.md?fm'` (also through
 * import.meta.glob with `query: '?fm'`) gives mdData(). Any project file, so future content folders (content/engine/**)
 * ship as JSON without touching this. `?raw` imports are untouched (tests still read the text).
 */
export const contentJson = () => ({
  name: 'cq-content-json',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('/node_modules/')) return;
    const [file, query = ''] = id.split('?');
    const q = new URLSearchParams(query);
    const data = /\.ya?ml$/.test(file) && [...q.keys()].every((k) => k === 'import') ? yamlData(code)
      : q.has('fm') && file.endsWith('.md') ? (q.has('meta') ? metaData(code, q.get('meta').split(',')) : mdData(code)) : undefined;
    if (data === undefined) return;
    return { code: `export default ${JSON.stringify(data)};`, map: null };
  },
});
