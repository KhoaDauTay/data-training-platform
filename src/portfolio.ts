import type { Lang } from './i18n';

/**
 * V19-D (L170): the pure part of the portfolio extras, in the lazy chunk `portfolioPng` (only src/ui/portfolioPng.ts and
 * tests import it): a store-only zip (README.md + card pictures, so GitHub shows the pictures: it strips `data:` images)
 * and the take-home portfolio. No DOM, no storage, no clock; nothing here reads player-imported data.
 */

// ---------- zip (store only: PNG is already compressed) ----------

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip archive of `files` (names in UTF-8, flag bit 11), every entry stored; `at` is the entries' DOS date and time. */
export function zip(files: readonly { name: string; data: Uint8Array }[], at: Date): Uint8Array {
  const time = (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1);
  const date = ((Math.max(1980, at.getFullYear()) - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const head = (size: number, fill: (v: DataView) => void): Uint8Array => {
    const b = new Uint8Array(size);
    fill(new DataView(b.buffer));
    return b;
  };
  for (const f of files) {
    const name = new TextEncoder().encode(f.name);
    const crc = crc32(f.data);
    const common = (v: DataView, o: number): void => {
      v.setUint16(o, 20, true); // version needed
      v.setUint16(o + 2, 0x0800, true); // UTF-8 names
      v.setUint16(o + 4, 0, true); // stored
      v.setUint16(o + 6, time, true);
      v.setUint16(o + 8, date, true);
      v.setUint32(o + 10, crc, true);
      v.setUint32(o + 14, f.data.length, true);
      v.setUint32(o + 18, f.data.length, true);
      v.setUint16(o + 22, name.length, true);
    };
    const local = head(30, (v) => {
      v.setUint32(0, 0x04034b50, true);
      common(v, 4);
    });
    central.push(head(46, (v) => {
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true); // version made by
      common(v, 6);
      v.setUint32(42, offset, true);
    }), name);
    parts.push(local, name, f.data);
    offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0);
  const end = head(22, (v) => {
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, files.length, true);
    v.setUint16(10, files.length, true);
    v.setUint32(12, size, true);
    v.setUint32(16, offset, true);
  });
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, b) => n + b.length, 0));
  let at2 = 0;
  for (const b of all) {
    out.set(b, at2);
    at2 += b.length;
  }
  return out;
}

// ---------- take-home portfolio (opt-in: the learner clicks its own download) ----------

const TEXT = {
  vi: {
    h1: 'Portfolio take-home SQL',
    by: 'Người làm: {name} · Ngày {date}',
    note: 'Bài take-home luyện phỏng vấn của BoonData (trò chơi học SQL) trên dữ liệu chuỗi cửa hàng hư cấu. Tự tạo tại máy, không xác minh bởi bên thứ ba. Mỗi câu SQL dưới đây đã đạt bộ chấm; đoạn kết luận do người học tự viết và tự chấm theo tiêu chí.',
    brief: 'Đề',
    step: 'Bước {i}: {title}',
    noSql: '(Không còn SQL của bước này trên máy: bài đã được làm lại từ đầu.)',
    mine: 'Kết luận của tôi',
    rubric: 'Tự chấm: {n}/{total} tiêu chí',
    anon: 'Người học BoonData',
  },
  en: {
    h1: 'SQL take-home portfolio',
    by: 'By {name} · {date}',
    note: 'Interview-practice take-homes from BoonData (a game for learning SQL) on fictional store-chain data. Self-generated on your device, not verified by any third party. Every query below passed the grader; the conclusion was written and self-assessed by the learner against the rubric.',
    brief: 'Brief',
    step: 'Step {i}: {title}',
    noSql: '(This step\'s SQL is no longer on this device: the take-home was started again.)',
    mine: 'My conclusion',
    rubric: 'Self-assessed: {n}/{total} criteria',
    anon: 'BoonData learner',
  },
} as const;

/** A fence longer than any backtick run inside the SQL. */
export const fence = (sql: string): string => '`'.repeat(Math.max(3, ...[...sql.matchAll(/`+/g)].map((r) => r[0].length + 1)));

export interface TakeHomeEntry {
  title: string;
  brief: string;
  /** `sql` undefined: no passed SQL left on this device for that step (never a draft). */
  steps: { title: string; sql?: string }[];
  text: string;
  rubric: { line: string; ticked: boolean }[];
}

export function takeHomeMd(p: { lang: Lang; name: string; date: string; entries: readonly TakeHomeEntry[] }): string {
  const x = TEXT[p.lang];
  const fill = (s: string, q: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => String(q[k] ?? m));
  const out = [`# ${x.h1}`, '', fill(x.by, { name: p.name.trim() || x.anon, date: p.date }), '', `> ${x.note}`, ''];
  for (const e of p.entries) {
    out.push(`## ${e.title}`, '', `**${x.brief}:** ${e.brief.replace(/\n+/g, ' ')}`, '');
    e.steps.forEach((s, i) => {
      out.push(`### ${fill(x.step, { i: i + 1, title: s.title })}`, '');
      if (s.sql?.trim()) {
        const f = fence(s.sql);
        out.push(`${f}sql`, s.sql.trim(), f, '');
      } else out.push(`_${x.noSql}_`, '');
    });
    out.push(`**${x.mine}:**`, '', ...e.text.trim().split(/\n/).map((l) => `> ${l}`), '');
    out.push(`**${fill(x.rubric, { n: e.rubric.filter((r) => r.ticked).length, total: e.rubric.length })}**`, '');
    out.push(...e.rubric.map((r) => `- [${r.ticked ? 'x' : ' '}] ${r.line}`), '');
  }
  return out.join('\n');
}
