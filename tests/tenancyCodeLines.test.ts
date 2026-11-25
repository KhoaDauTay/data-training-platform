import { describe, expect, it } from 'vitest';

// v38 R3 (T3-C8-01, L594): the multi-tenant lessons and cards keep every code line within 40 characters (uiux-design's
// point-line rule), so nothing a learner must read sits behind sideways scroll on a 375 px phone. R2 claimed a 39-character
// ERROR line that was really 41: this reads the files instead of trusting a note.
const TENANCY = /^id: (e-ds-l2-0[67]|e-ds-l4-(0[89]|1[01])|e-ds-l5-(0[89]|1[01])|e-pg-l1-19|e-pg-l2-26|e-pg-l4-20|e-pg-l5-(10|19|2[0-2])|e-mg-l3-19|e-mg-l5-12|e-dy-l3-14|e-dy-l4-16|e-dy-l5-09|e-bp-x08|e-bp-m39|e-bp-s10)\s*$/m;
const MAX = 40;

const FILES = import.meta.glob<string>('../content/engine/**/*.md', { query: '?raw', import: 'default', eager: true });

describe('multi-tenant lessons: code lines ≤ 40 characters', () => {
  it('23 lessons and 3 cards, no code line over 40', () => {
    const long: string[] = [];
    let n = 0;
    for (const raw of Object.values(FILES)) {
      const src = raw.replace(/\r\n/g, '\n');
      const id = TENANCY.exec(src)?.[1];
      if (!id) continue;
      n++;
      let code = false;
      for (const line of src.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')) {
        if (line.startsWith('```')) code = !code;
        else if (code && [...line].length > MAX) long.push(`${id}: ${[...line].length} ${line}`);
      }
    }
    expect(n).toBe(26);
    expect(long).toEqual([]);
  });
});
