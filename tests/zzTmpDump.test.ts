// TEMP (v48 terms): dump VI prose of the seven tracks and buttons per lesson. Deleted before commit.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import glossary from '../content/engine/glossary.yml';
import { marker, parseGlossary } from '../src/engine/glossary';
import { parseEngineLesson, type LessonSource } from '../src/engine/content';

const OUT = 'C:/Users/KHOA~1.HUY/AppData/Local/Temp/claude/be8c95d1f89f2452/e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc/scratchpad/';
it('dump', () => {
  const files = import.meta.glob<LessonSource>('../content/engine/*/L*/*.md', { query: '?fm', import: 'default', eager: true });
  const lessons = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p));
  const terms = parseGlossary(glossary);
  const lines: string[] = [];
  const counts: string[] = [];
  let some = 0;
  for (const l of lessons) {
    const m = marker(terms, l.engine, l.level);
    const texts = [...l.objectives.map((o) => o.vi), ...l.sections.map((s) => s.text.vi)];
    const plain = texts.flatMap((x) => x.split(/(`[^`\n]+`)/).filter((p) => !p.startsWith('`')));
    const pieces = plain.flatMap((p) => m.mark(p));
    const b = pieces.flatMap((p) => (typeof p !== 'string' && p.button ? [p.text] : []));
    if (b.length) some++;
    counts.push(`${l.id}\t${b.length}\t${b.join(' | ')}`);
    if (!['postgres', 'mongodb', 'dynamodb', 'design', 'stack'].includes(l.engine)) lines.push(`##### ${l.id} ${l.level} ${l.title.vi}`, plain.join(' ').replace(/\s+/g, ' '));
  }
  counts.push(`TOTAL some=${some} / ${lessons.length}`);
  writeFileSync(`${OUT}prose.txt`, lines.join('\n'));
  writeFileSync(`${OUT}buttons.txt`, counts.join('\n'));
});
