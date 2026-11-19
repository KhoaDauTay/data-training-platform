import { describe, expect, it } from 'vitest';
import { importCsv } from '../src/db/import';
import { runSandboxed } from '../src/db/run';
import { ECOM_TABLES, FIN_TABLES, LOGISTICS_TABLES } from '../src/domains';
import { compareResults } from '../src/grader';
import { IMPORT_LIMITS, inspectCsv } from '../src/import/csv';
import { DATASET_FILE, datasetUrl, fetchDataset, parseDatasets } from '../src/import/datasets';
import { freshDb } from './helpers';
import { parse as parseYaml } from 'yaml';
import panelTs from '../src/import/datasetPanel.ts?raw';
import yml from '../content/general/datasets.yml?raw';
import thirdParty from '../assets/THIRD_PARTY.md?raw';
import myDataView from '../src/ui/myDataView.ts?raw';
import datasetsTs from '../src/import/datasets.ts?raw';
import myDataTs from '../src/import/myData.ts?raw';
import csvTs from '../src/import/csv.ts?raw';
import storeTs from '../src/import/store.ts?raw';

// tsconfig has no Node types: files come in through Vite's ?raw / glob.
const FILES = import.meta.glob<string>('../public/datasets/*', { query: '?raw', import: 'default', eager: true });
const sha256 = async (s: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

const { ui, datasets } = parseDatasets(yml, parseYaml);
const GAME = new Set<string>([...LOGISTICS_TABLES, ...ECOM_TABLES, ...FIN_TABLES]);
const fileOf = (name: string): string => FILES[`../public/datasets/${name}`];

describe('V20-B bộ dữ liệu mẫu', () => {
  it('mỗi file trong public/datasets có đúng một mục, và ngược lại; ≤ 5 MB; sha256 ghi trong THIRD_PARTY.md', async () => {
    expect(Object.keys(FILES).map((k) => k.split('/').pop()).sort()).toEqual(datasets.map((d) => d.file).sort());
    expect(datasets.length).toBeGreaterThan(0);
    expect(Object.values(ui).every((b) => b.vi && b.en && b.vi !== b.en)).toBe(true);
    for (const d of datasets) {
      const text = fileOf(d.file);
      expect(new Blob([text]).size).toBeLessThanOrEqual(5 * 1024 * 1024);
      expect(thirdParty).toContain(await sha256(text.replace(/\r\n/g, '\n'))); // LF bytes: a Windows checkout (autocrlf) gives CRLF
      expect(thirdParty).toContain(`public/datasets/${d.file}`);
      expect(d.licence).toMatch(/^(CC0 1\.0|CC BY 4\.0|Public domain)$/);
      expect(d.questions).toHaveLength(5);
    }
  });

  it('qua đủ giới hạn D3, tên bảng như yml và không trùng bảng game (luật _my)', async () => {
    for (const d of datasets) {
      const r = await inspectCsv(new Blob([fileOf(d.file)]), d.file, GAME, []);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.spec.table).toBe(d.table);
      expect(GAME.has(d.table)).toBe(false);
      expect(r.spec.rows).toBe(d.rows);
      expect(r.spec.bytes).toBeLessThanOrEqual(IMPORT_LIMITS.maxBytes);
      expect(r.spec.columns.length).toBeLessThanOrEqual(IMPORT_LIMITS.maxColumns);
    }
  });

  it('5 đáp án chạy trên bảng đã nạp, có dòng, và khác nhau từng đôi', async () => {
    const db = await freshDb();
    for (const d of datasets) {
      const r = await inspectCsv(new Blob([fileOf(d.file)]), d.file, GAME, []);
      if (!r.ok) throw new Error(d.id);
      const t = await importCsv(db, { table: r.spec.table, columns: r.spec.columns, delimiter: r.spec.delimiter }, new Blob([fileOf(d.file)]));
      expect(t.rows).toBe(d.rows);
      expect(t.columns.filter((c) => c.type !== 'text').length).toBeGreaterThan(0); // missing values are empty cells, so numbers stay numbers
      const results: Awaited<ReturnType<typeof runSandboxed>>[] = [];
      for (const q of d.questions) {
        const res = await runSandboxed(db, q.solution);
        expect(res.rows.length, q.solution).toBeGreaterThan(0);
        expect(/ORDER BY/i.test(q.solution)).toBe(q.ordered);
        results.push(res);
      }
      results.forEach((a, i) => results.slice(i + 1).forEach((b) => expect(compareResults(a, b, false).ok).toBe(false)));
    }
  });

  it('chỉ tải từ chính trang (không fetch khác origin), tên file không đi ra ngoài thư mục datasets', async () => {
    expect(datasetUrl('penguins.csv', '/postgres-study/', 'https://x.github.io/postgres-study/#/d/logistics/play').href)
      .toBe('https://x.github.io/postgres-study/datasets/penguins.csv');
    for (const bad of ['../sw.js', 'a/b.csv', 'x.js', 'https://evil.example/x.csv']) expect(() => datasetUrl(bad, '/', 'https://app.example/')).toThrow();
    expect(() => datasetUrl('penguins.csv', 'https://evil.example/', 'https://app.example/')).toThrow();
    expect(() => datasetUrl('penguins.csv', '//evil.example/', 'https://app.example/')).toThrow();
    for (const d of datasets) expect(d.file).toMatch(DATASET_FILE);
    // The only fetch in the import path is fetchDataset's, and it only ever takes datasetUrl's same-origin URL.
    const src = [csvTs, myDataTs, storeTs, datasetsTs, panelTs, myDataView]
      .map((f) => f.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''));
    expect(src.join('\n').match(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/g) ?? []).toEqual([]);
    let asked = '';
    const get = (async (u: URL) => { asked = String(u); return new Response('a\n1\n'); }) as unknown as typeof fetch;
    (globalThis as { location?: unknown }).location ??= { href: 'https://app.example/' };
    await fetchDataset('penguins.csv', get);
    expect(new URL(asked).origin).toBe(new URL((globalThis as unknown as { location: { href: string } }).location.href).origin);
  });
});
