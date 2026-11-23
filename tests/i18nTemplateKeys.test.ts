// v29 (L460): a template-literal i18n key cast to its Key type (`bt(\`area.${c.module}\` as BestKey)`) is invisible to tsc,
// and v26 shipped a crash through one. Where the value has a union type the cast is dropped, so tsc checks the key; this test
// covers the casts that remain: it finds every `` `…${x}…` as XKey `` in src, needs the values that template can take listed
// in VALUES below, and checks each key exists in that dictionary's VI and EN.
import { describe, expect, it } from 'vitest';
import { parse as yaml } from 'yaml';

const SRC = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
const I18N = import.meta.glob<Record<string, unknown>>('../src/i18n/*.ts', { eager: true });
const BEST = import.meta.glob<string>('../content/engine/best/*/*.md', { query: '?raw', import: 'default', eager: true });
const TRACKS = Object.values(import.meta.glob<string>('../content/engine/best/tracks.yml', { query: '?raw', import: 'default', eager: true }))[0];

const bestAreas = [
  ...Object.values(BEST).map((t) => /^module:\s*(\S+)/m.exec(t)?.[1]).filter((x): x is string => !!x),
  ...(yaml(TRACKS) as { areas: string[] }[]).flatMap((x) => x.areas),
];

/** `<Key type> <template with ${…} as *>` → every value the `${…}` can take. A new cast needs a row here. */
const VALUES: Record<string, readonly (string | number)[]> = {
  'BestKey area.*': bestAreas,
  'LearnKey g.lesson.*': [1, 2, 3, 4], // guideList: the lesson guide's four steps
};

interface Site { file: string; key: string; type: string; template: string }
const CAST = /`([^`$]*)\$\{[^}`]*\}([^`$]*)` as ([A-Z]\w*Key)\b/g;
const sites: Site[] = Object.entries(SRC).flatMap(([file, text]) =>
  [...text.matchAll(CAST)].map((m) => ({ file, type: m[3], template: `${m[1]}*${m[2]}`, key: `${m[3]} ${m[1]}*${m[2]}` })));

/** The `{ vi, en }` dictionary the file's Key type comes from (its `*_DICT` export, or `vi`/`en` for the main one). */
function dictOf(s: Site): { vi: Record<string, unknown>; en: Record<string, unknown> } {
  const from = new RegExp(`import[^;]*\\b${s.type}\\b[^;]*from '([^']+)'`).exec(SRC[s.file])?.[1];
  if (!from) throw new Error(`${s.file}: no import of ${s.type}`);
  const path = new URL(`${from}.ts`, new URL(s.file, 'file:///x/tests/')).pathname.replace(/^\/x\//, '../');
  const mod = I18N[path];
  if (!mod) throw new Error(`${s.file}: ${from} is not in src/i18n`);
  const dict = Object.entries(mod).find(([k]) => k.endsWith('_DICT'))?.[1] as { vi: Record<string, unknown>; en: Record<string, unknown> } | undefined;
  return dict ?? { vi: mod.vi as Record<string, unknown>, en: mod.en as Record<string, unknown> };
}

describe('i18n: template-literal keys behind a cast', () => {
  it('the scan finds the casts this test was written for', () => {
    expect(sites.map((s) => s.key)).toEqual(expect.arrayContaining(Object.keys(VALUES)));
    expect(bestAreas.length).toBeGreaterThan(100);
  });

  it.each(sites.map((s) => [`${s.file.replace('../', '')}: ${s.key}`, s] as const))('%s: every value it can take is a key in VI and EN', (_, s) => {
    const values = VALUES[s.key];
    expect(values, `list the values of \`${s.template}\` (${s.type}) in VALUES, or drop the cast so tsc checks it`).toBeDefined();
    const dict = dictOf(s);
    const missing = [...new Set(values)].map((v) => s.template.replace('*', String(v)))
      .flatMap((k) => [Object.hasOwn(dict.vi, k) ? [] : [`vi ${k}`], Object.hasOwn(dict.en, k) ? [] : [`en ${k}`]].flat());
    expect(missing).toEqual([]);
  });
});
