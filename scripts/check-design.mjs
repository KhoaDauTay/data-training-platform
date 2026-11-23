// v28 R4: static check of content/engine/design lessons (parse, content rules, 8-section anatomy) without PGlite, so a
// writer can check a file in a second. The full check (examples and lab steps run) is tests/engineDesign.test.ts.
// Usage: node scripts/check-design.mjs [path filter]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { blocksOf, lessonProblems, parseEngineLesson, SECTIONS } from '../src/engine/content.ts';

const root = 'content/engine/design';
const filter = process.argv[2] ?? '';
const files = readdirSync(root).filter((d) => /^L[1-5]$/.test(d)).flatMap((d) => readdirSync(join(root, d)).map((f) => join(root, d, f).replace(/\\/g, '/')));
const words = (t) => t.replace(/`[^`]*`/g, 'x').split(/\s+/).filter(Boolean).length;
const ORDER = Object.keys(SECTIONS);
const NEED = { concept: ['open', 'idea', 'example', 'pitfalls', 'recap'], lab: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'], quiz: ['open', 'idea', 'example', 'recap'], capstone: ['open', 'practice', 'recap'] };
const all = [];
let bad = 0;
for (const p of files) {
  const raw = readFileSync(p, 'utf8');
  try { all.push({ p, raw, l: parseEngineLesson(raw, p, parse), fm: parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))[1]) }); } catch (e) { console.log(`✗ ${p}: ${e.message}`); bad++; }
}
const ids = new Set(all.map((x) => x.l.id));
for (const { p, l, fm } of all.filter((x) => x.p.includes(filter))) {
  const out = [...lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => /^e-(pg|mg|dy)-/.test(r))]))];
  const text = (id) => l.sections.find((s) => s.id === id)?.text;
  const sec = l.sections.map((s) => s.id);
  if (sec.join() !== [...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join()) out.push('thứ tự mục');
  const miss = (NEED[l.kind] ?? []).filter((k) => !sec.includes(k));
  if (miss.length) out.push(`thiếu mục ${miss}`);
  if (l.objectives.length < 2 || l.objectives.length > 4) out.push('objectives 2–4');
  if (text('open') && text('open').vi.split(/(?<=[.!?])\s+/).filter(Boolean).length > 3) out.push('Mở bài > 3 câu');
  for (const para of (text('idea')?.vi ?? '').split(/\n\s*\n/)) if (words(para) > 150) out.push(`Ý chính: đoạn ${words(para)} từ`);
  if (text('syntax') && blocksOf(text('syntax').vi)[0]?.kind !== 'code') out.push('Cú pháp phải mở bằng khối code');
  for (const lang of ['vi', 'en']) {
    const r = text('recap') ? blocksOf(text('recap')[lang]) : [];
    if (r.length !== 1 || r[0].kind !== 'ul' || r[0].items.length < 3 || r[0].items.length > 5) out.push(`Tóm tắt ${lang}: một danh sách 3–5 dòng`);
  }
  const sql = (t) => (t ? blocksOf(t).filter((b) => b.kind === 'code' && b.lang === 'sql').map((b) => b.code) : []);
  if (l.kind === 'concept' || l.kind === 'lab') {
    const ex = sql(text('example')?.vi).filter((b) => !/^--\s*ERROR\b/m.test(b));
    if (ex.length < 2 || ex.length > 6) out.push(`Ví dụ: ${ex.length} khối sql (cần 2–6)`);
    const pit = sql(text('pitfalls')?.vi).filter((b) => /^--\s*(ERROR|WRONG)\b/m.test(b));
    if (pit.length < 2 || pit.length > 4) out.push(`Lỗi hay gặp: ${pit.length} bẫy (cần 2–4)`);
    for (const b of [...sql(text('example')?.vi), ...sql(text('pitfalls')?.vi)]) if (/^--\s*ERROR\b/m.test(b) && !/^--\s*ERROR\s+[0-9A-Z]{5}\b/m.test(b)) out.push(`ERROR thiếu SQLSTATE: ${b.slice(0, 50)}`);
  }
  if (l.kind === 'lab' && l.lab.steps.length < 3) out.push('lab cần ≥ 3 bước');
  if (!l.lab?.setup) out.push('cần lab có setup');
  if (l.runtime !== 'browser') out.push('runtime: browser');
  const qs = [...(fm.quiz ?? []), ...(fm.predict ? [fm.predict] : [])];
  if (qs.length < (l.kind === 'capstone' ? 1 : 2)) out.push('câu hỏi < 2');
  if (l.kind !== 'capstone' && !qs.some((q) => q.trap !== undefined)) out.push('cần ≥ 1 câu có trap');
  for (const q of qs) if (q.trap !== undefined && (q.trap === q.answer || q.trap < 0 || q.trap >= q.options.length)) out.push('trap phải là một lựa chọn sai');
  for (const s of l.lab?.steps ?? []) if (s.ordered && !/ORDER BY/i.test(s.after ?? s.solution)) out.push('ordered cần ORDER BY');
  const gz = (await import('node:zlib')).gzipSync(JSON.stringify(fm) + JSON.stringify(l.sections)).length;
  const w = l.sections.reduce((n, s) => n + words(s.text.vi.replace(/```[\s\S]*?```/g, '')), 0);
  if (gz > 7300) out.push(`quá lớn: ~${gz} B gz (ngân sách 8 KB/bài)`);
  console.log(`${out.length ? '✗' : '✓'} ${l.id} ${l.kind} ${w} từ VI, ~${(gz / 1024).toFixed(1)} KB gz${out.length ? `\n   - ${out.join('\n   - ')}` : ''}`);
  if (out.length) bad++;
}
process.exitCode = bad ? 1 : 0;
