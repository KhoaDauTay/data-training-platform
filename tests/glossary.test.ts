import { describe, expect, it } from 'vitest';
import { GLOSSARY, matches, normalize, parseGlossary } from '../src/glossary';
import { GAME_SCHEMA } from '../src/domains';
import { runner } from './helpers';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe('parseGlossary', () => {
  it('đọc mục hợp lệ, columns mặc định rỗng', () => {
    expect(parseGlossary('- { term: TEU, vi: "Đơn vị 20 ft", en: "20 ft unit" }')).toEqual([
      { term: 'TEU', vi: 'Đơn vị 20 ft', en: '20 ft unit', columns: [] },
    ]);
  });

  it('báo lỗi kèm số thứ tự khi thiếu trường hoặc sai dạng', () => {
    expect(() => parseGlossary('- { term: TEU, vi: x }')).toThrow(/#1.*en/);
    expect(() => parseGlossary('term: TEU')).toThrow(/danh sách/);
    expect(() => parseGlossary('- { term: A, vi: x, en: y, columns: [1] }')).toThrow(/#1.*columns/);
  });
});

describe('lọc', () => {
  it('không phân biệt hoa thường và dấu tiếng Việt', () => {
    expect(normalize('Luồng Đỏ')).toBe('luong do');
    expect(matches('teu', 'TEU')).toBe(true);
    expect(matches('luong', 'x', 'Luồng xanh')).toBe(true);
    expect(matches('', 'bất kỳ')).toBe(true);
    expect(matches('zzz', 'TEU', 'đơn vị')).toBe(false);
  });
});

describe('content/glossary.yml', () => {
  it('đủ ~30 mục, term không trùng, EN không có dấu tiếng Việt', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(30);
    const terms = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
    for (const g of GLOSSARY) expect(`${g.term} ${g.en}`, g.term).not.toMatch(VI_DIACRITIC);
  });

  it('mọi cột trong columns tồn tại trong DB', async () => {
    const run = await runner();
    const r = await run(`SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = '${GAME_SCHEMA}'`);
    const existing = new Set(r.rows.map((row) => String(row[0])));
    const missing = GLOSSARY.flatMap((g) => g.columns.filter((c) => !existing.has(c)).map((c) => `${g.term}: ${c}`));
    expect(missing).toEqual([]);
  });
});
