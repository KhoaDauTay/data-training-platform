import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { sources as early } from '../src/ticketSources';
import { sources as late } from '../src/ticketLateSources';
import { ticketSources as ecomEarly } from '../src/ecomSources';
import { ticketSources as ecomLate } from '../src/ecomLateSources';
import { ticketSources as finEarly } from '../src/finSources';
import { ticketSources as finLate } from '../src/finLateSources';

// V22-E (L201): content YAML and ticket frontmatter reach the app as JSON built by scripts/contentJson.mjs. Every content
// file must come out exactly as the `yaml` library reads the text (no Date, no undefined, nothing lost in JSON), checked
// here with an independent parse of the raw file. Covers every folder under content/, so future content (content/engine/**) too.
const ymlRaw = import.meta.glob<string>('../content/**/*.{yml,yaml}', { query: '?raw', import: 'default', eager: true });
const ymlBuilt = import.meta.glob<unknown>('../content/**/*.{yml,yaml}', { import: 'default', eager: true });
const mdRaw = import.meta.glob<string>('../content/**/*.md', { query: '?raw', import: 'default', eager: true });
const mdBuilt = import.meta.glob<unknown>('../content/**/*.md', { query: '?fm', import: 'default', eager: true });

describe('nội dung YAML → JSON lúc build (V22-E)', () => {
  it('mỗi file .yml: JSON = parse YAML', () => {
    expect(Object.keys(ymlRaw).length).toBeGreaterThan(15);
    expect(Object.keys(ymlBuilt).sort()).toEqual(Object.keys(ymlRaw).sort());
    for (const [path, text] of Object.entries(ymlRaw)) expect(ymlBuilt[path], path).toStrictEqual(parseYaml(text));
  });

  it('mỗi file .md: frontmatter JSON = parse YAML, thân giữ nguyên', () => {
    expect(Object.keys(mdRaw).length).toBeGreaterThan(140);
    for (const [path, text] of Object.entries(mdRaw)) {
      const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
      const want = m ? { fm: parseYaml(m[1]) ?? {}, body: m[2].replace(/\r\n/g, '\n') } : null;
      expect(mdBuilt[path], path).toStrictEqual(want);
    }
  });

  it('hai chunk vé (đầu + cuối) phủ đúng mọi file vé, không trùng', () => {
    const cover = (a: object, b: object, dir: string) => {
      const keys = [...Object.keys(a), ...Object.keys(b)].sort();
      expect(keys).toEqual(Object.keys(mdRaw).filter((p) => p.startsWith(dir)).sort());
    };
    cover(early, late, '../content/tickets/');
    cover(ecomEarly, ecomLate, '../content/domains/ecom/tickets/');
    cover(finEarly, finLate, '../content/domains/fin/tickets/');
  });

  it('src/ không còn import thư viện yaml (chỉ test và script)', () => {
    const src = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
    expect(Object.entries(src).filter(([, s]) => /from ['"]yaml['"]/.test(s)).map(([p]) => p)).toEqual([]);
  });
});
