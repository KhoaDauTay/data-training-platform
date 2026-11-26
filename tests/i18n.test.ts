import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import chaptersYml from '../content/chapters.yml?raw';
import kpisYml from '../content/kpis.yml?raw';
import peopleYml from '../content/people.yml?raw';
import ecomChaptersYml from '../content/domains/ecom/chapters.yml?raw';
import ecomKpisYml from '../content/domains/ecom/kpis.yml?raw';
import ecomPeopleYml from '../content/domains/ecom/people.yml?raw';
import finChaptersYml from '../content/domains/fin/chapters.yml?raw';
import finKpisYml from '../content/domains/fin/kpis.yml?raw';
import finPeopleYml from '../content/domains/fin/people.yml?raw';
import generalSqlYml from '../content/general/sql.yml?raw';
import generalAdvYml from '../content/general/adv.yml?raw';
import generalInterviewYml from '../content/general/interview.yml?raw';
import html from '../index.html?raw';
import { loadDomain, loadTicketTemplates, loadTickets } from '../src/content';
import { isMacPlatform, keyLabels, t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';
import { textOf } from '../src/tickets';

/** Every string inside a parsed value (keys and YAML comments are not player text). */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
const GAME_TONE = /boss|sự cố/i;

/** Keys whose EN text is intentionally the same as VI (SQL keywords, product names). */
// Plan 7: product, domain and module names read the same in both languages.
const SAME_OK = new Set<string>(['search.keys', 'work.runKeys', 'work.submitKeys', 'work.formatKeys', 'tab.explain', 'top.xp', 'nav.sandbox', 'top.chapterShort', 'top.chapterTiny', 'nav.task',
  'app.name', 'domain.logistics', 'domain.finance', 'domain.ecommerce', 'domain.ecommerceTiny']); // eye-v47b B-16 (L1119): "E-com" in the 320 bottom bar
const placeholders = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();

describe('từ điển i18n', () => {
  it('placeholder {x} của VI và EN khớp nhau (với thông điệp dạng chuỗi)', () => {
    const bad = Object.entries(vi).flatMap(([k, v]) => {
      const e = en[k as keyof typeof en];
      return typeof v === 'string' && typeof e === 'string' && placeholders(v) !== placeholders(e) ? [k] : [];
    });
    expect(bad).toEqual([]);
  });

  it('BoonData là tên sản phẩm; "Cargo Query" chỉ còn là công ty "Cargo Query Logistics" (L57, V12)', () => {
    const bad = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /Cargo Query(?! Logistics)/.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
    expect(html).toMatch(/<title>BoonData<\/title>/);
    expect(html).not.toMatch(/>Cargo Query</);
  });

  it('EN không trùng y hệt VI, trừ SAME_OK', () => {
    const same = Object.entries(vi)
      .filter(([k, v]) => typeof v === 'string' && en[k as keyof typeof en] === v && !SAME_OK.has(k))
      .map(([k]) => k);
    expect(same).toEqual([]);
  });

  it('thông điệp EN dạng hàm xử lý số ít / số nhiều', () => {
    const rows = en['res.rows'] as (p: Record<string, number>) => string;
    expect(rows({ n: 1 })).toBe('Result: 1 row');
    expect(rows({ n: 1234 })).toBe('Result: 1,234 rows');
  });

  it('nhãn EN của tab Cột là "Columns" (gợi ý EN của ch1-01 nhắc đúng chữ này)', () => {
    expect(en['tab.columns']).toBe('Columns');
  });

  it('L22: không chuỗi hiển thị nào dùng giọng game "boss" / "sự cố"', () => {
    const bad = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /\bboss\b|sự cố/i.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('L22: chapters.yml, people.yml, kpis.yml và chữ ticket (VI + EN) không có "boss" / "sự cố"', () => {
    const texts = [
      ...[chaptersYml, peopleYml, kpisYml].flatMap((y) => strings(parseYaml(y))),
      ...loadTickets().flatMap((tk) => (['vi', 'en'] as const).flatMap((lang) => strings(textOf(tk, lang)))),
    ];
    expect(texts.length).toBeGreaterThan(100);
    expect(texts.filter((x) => GAME_TONE.test(x))).toEqual([]);
  });

  it('L22 (v11 review, v14): E-commerce, Finance và General cũng không có "boss" / "sự cố"', async () => {
    await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
    const texts = [
      ...[ecomChaptersYml, ecomKpisYml, ecomPeopleYml, finChaptersYml, finKpisYml, finPeopleYml].flatMap((y) => strings(parseYaml(y))),
      ...[generalSqlYml, generalAdvYml, generalInterviewYml].flatMap((y) => strings(parseYaml(y))),
      ...[...loadTicketTemplates('ecommerce'), ...loadTicketTemplates('finance')].flatMap((tk) => (['vi', 'en'] as const).flatMap((lang) => strings(textOf(tk, lang)))),
    ];
    expect(texts.length).toBeGreaterThan(100);
    expect(texts.filter((x) => GAME_TONE.test(x))).toEqual([]);
  });

  it('mọi khóa data-i18n / data-i18n-aria trong index.html có trong vi', () => {
    const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
    expect(keys).toContain('nav.label');
    expect(keys.filter((k) => !(k in vi))).toEqual([]);
  });
});

describe('nhãn phím tắt theo hệ điều hành', () => {
  it('nhận macOS qua userAgentData hoặc platform', () => {
    expect(isMacPlatform({ userAgentData: { platform: 'macOS' } })).toBe(true);
    expect(isMacPlatform({ platform: 'MacIntel' })).toBe(true);
    expect(isMacPlatform({ platform: 'iPad' })).toBe(true);
    expect(isMacPlatform({ userAgentData: { platform: 'Windows' }, platform: 'Win32' })).toBe(false);
    expect(isMacPlatform({ platform: 'Linux x86_64' })).toBe(false);
    expect(isMacPlatform(undefined)).toBe(false);
  });

  it('macOS dùng ⌘/⌥, nơi khác Ctrl/Alt', () => {
    expect(keyLabels(true)).toEqual({ mod: '⌘', alt: '⌥' });
    expect(keyLabels(false)).toEqual({ mod: 'Ctrl', alt: 'Alt' });
  });

  it('không chuỗi nào ghi cứng Ctrl/Alt: dùng {mod}/{alt}', () => {
    const hard = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /\b(Ctrl|Alt|Cmd)\b/.test(v))
      .map(([k]) => k);
    expect(hard).toEqual([]);
  });

  it('t() tự điền {mod}/{alt}', () => {
    expect(t('work.submitKeys')).toMatch(/^(Ctrl|⌘)\+Shift\+Enter$/); // v12.0 U8: shown in a <kbd> beside the label
    expect(t('work.formatKeys')).toMatch(/(Alt|⌥)\+F$/);
  });
});

describe('chữ trang Tiến bộ của tôi (src/i18n/me.ts, v16 L142)', () => {
  it('placeholder khớp, EN khác VI, không giọng game; bản đồ kỹ năng và huy hiệu nói "không xác minh" (v24 L323)', async () => {
    const { ME_DICT } = await import('../src/i18n/me');
    const { EXPORT_DICT } = await import('../src/i18n/meExport'); // v33 (L536): the export text, its own chunk
    const SAME = new Set(['badge.sql', 'badge.eng', 'badge.dom', 'eng.cell']); // names and placeholders only
    const vi: Record<string, unknown> = { ...ME_DICT.vi, ...EXPORT_DICT.vi };
    const en: Record<string, unknown> = { ...ME_DICT.en, ...EXPORT_DICT.en };
    expect(Object.keys(EXPORT_DICT.vi).filter((k) => k in ME_DICT.vi)).toEqual([]);
    for (const [k, v] of Object.entries(vi)) {
      const e = en[k];
      if (typeof e === 'string' && typeof v === 'string') expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      if (!SAME.has(k)) expect([k, e]).not.toEqual([k, v]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
      expect(`${k}: ${e}`).not.toMatch(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i);
    }
    expect(ME_DICT.vi['map.intro']).toContain('Không xác minh');
    expect(ME_DICT.en['map.intro']).toContain('Not verified');
    expect(ME_DICT.vi['badge.note']).toContain('không xác minh');
    expect(ME_DICT.en['badge.note']).toContain('not verified');
  });
});

describe('chữ UI phần Chung (src/i18n/learn.ts, Plan 8a D8a-13)', () => {
  it('placeholder khớp, EN khác VI (trừ SAME_OK), không giọng game', async () => {
    const { LEARN_DICT } = await import('../src/i18n/learn');
    const SAME = new Set<string>(); // L93: VI says "Bài luyện", "Phần"
    for (const [k, v] of Object.entries(LEARN_DICT.vi)) {
      const e = LEARN_DICT.en[k as keyof typeof LEARN_DICT.en];
      expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      if (!SAME.has(k)) expect([k, e]).not.toEqual([k, v]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
    }
    // F11: the v24 learning path is a grid of Parts with the advanced track below, nothing left/right
    expect(`${LEARN_DICT.vi['g.path.1']} ${LEARN_DICT.en['g.path.1']}`).not.toMatch(/trái|phải|left|right/);
  });
});

describe('v30.1 derived counts (F05)', () => {
  it('no hard-coded Part count for the NoSQL path; its intro takes {n}', async () => {
    const { ENGINE_DICT } = await import('../src/i18n/engine');
    for (const lang of ['vi', 'en'] as const) {
      expect(ENGINE_DICT[lang]['nosql.short']).not.toMatch(/\d+ (Phần|parts|Parts)/);
      expect(ENGINE_DICT[lang]['path.intro']).toContain('{n}');
    }
  });
});

describe('chữ UI khu Database Engine (src/i18n/engine.ts, ENG-CORE L220)', () => {
  it('placeholder khớp, EN khác VI, không giọng game, không "sắp có"', async () => {
    const { ENGINE_DICT } = await import('../src/i18n/engine');
    const { PRED_DICT } = await import('../src/i18n/enginePredict'); // v23 predict/capstone text, its own chunk (L296)
    const { NOSQL_DICT } = await import('../src/i18n/engineNosql'); // v25 NoSQL lab parts, its own chunk (L370)
    const { FULL_DICT } = await import('../src/i18n/engineFull'); // v30.1 full-lesson layout, its own chunk (L480)
    const { RESULT_DICT } = await import('../src/i18n/engineResult'); // v33 engine numbers + "Inside" under a result, its own chunk (L537)
    const { HUB_DICT } = await import('../src/i18n/engineHub'); // v47 S1 landing + sidebar groups, its own chunk (L902)
    const vi: Record<string, string> = { ...ENGINE_DICT.vi, ...PRED_DICT.vi, ...NOSQL_DICT.vi, ...FULL_DICT.vi, ...RESULT_DICT.vi, ...HUB_DICT.vi };
    const en: Record<string, string> = { ...ENGINE_DICT.en, ...PRED_DICT.en, ...NOSQL_DICT.en, ...FULL_DICT.en, ...RESULT_DICT.en, ...HUB_DICT.en };
    expect(Object.keys(PRED_DICT.vi).filter((k) => k in ENGINE_DICT.vi)).toEqual([]);
    expect(Object.keys(NOSQL_DICT.vi).filter((k) => k in ENGINE_DICT.vi || k in PRED_DICT.vi)).toEqual([]);
    expect(Object.keys(FULL_DICT.vi).filter((k) => k in ENGINE_DICT.vi || k in PRED_DICT.vi || k in NOSQL_DICT.vi)).toEqual([]);
    for (const [k, v] of Object.entries(vi)) {
      const e = en[k];
      expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      expect([k, e]).not.toEqual([k, v]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
      expect(`${v} ${e}`).not.toMatch(/sắp có|coming soon/i);
    }
  });
});

describe('chữ UI khóa học CSDL (src/i18n/engineTrack.ts, v47 S2 L940)', () => {
  it('placeholder khớp, EN khác VI, EN không dấu, không giọng game, có dòng "Dành cho" mỗi khóa', async () => {
    const { TRACK_DICT } = await import('../src/i18n/engineTrack');
    const { ENGINES } = await import('../src/engine/content');
    for (const [k, v] of Object.entries(TRACK_DICT.vi)) {
      const e = TRACK_DICT.en[k as keyof typeof TRACK_DICT.en];
      expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      expect([k, e]).not.toEqual([k, v]);
      expect([k, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(e)]).toEqual([k, false]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
    }
    for (const e of ENGINES) expect(TRACK_DICT.vi).toHaveProperty([`for.${e}`]);
  });
});

describe('chữ UI bảng Partition / Chi phí (src/i18n/engineDynamo.ts, v26 L380)', () => {
  it('placeholder khớp, EN khác VI, EN không dấu, không giọng game, không "sắp có"', async () => {
    const { DY_DICT } = await import('../src/i18n/engineDynamo');
    for (const [k, v] of Object.entries(DY_DICT.vi)) {
      const e = DY_DICT.en[k as keyof typeof DY_DICT.en];
      expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      expect([k, e]).not.toEqual([k, v]);
      expect([k, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(e)]).toEqual([k, false]);
      expect([k, [...v.matchAll(/`([^`]+)`/g)].map((m) => m[1])]).toEqual([k, [...e.matchAll(/`([^`]+)`/g)].map((m) => m[1])]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
      expect(`${v} ${e}`).not.toMatch(/sắp có|coming soon/i);
    }
  });
});

describe('chữ UI trang "Chọn engine nào?" (src/i18n/engineCompare.ts, v28 L430)', () => {
  it('placeholder khớp, EN khác VI, EN không dấu, code VI = EN, không giọng game, không "sắp có"', async () => {
    const { CMP_DICT } = await import('../src/i18n/engineCompare');
    for (const [k, v] of Object.entries(CMP_DICT.vi)) {
      const e = CMP_DICT.en[k as keyof typeof CMP_DICT.en];
      expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      expect([k, e]).not.toEqual([k, v]);
      expect([k, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(e)]).toEqual([k, false]);
      expect([k, [...v.matchAll(/`([^`]+)`/g)].map((m) => m[1])]).toEqual([k, [...e.matchAll(/`([^`]+)`/g)].map((m) => m[1])]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
      expect(`${v} ${e}`).not.toMatch(/sắp có|coming soon/i);
    }
  });
});

describe('chữ UI khu Best Practice (src/i18n/best.ts, v24 BP-UI L346)', () => {
  it('placeholder khớp, EN khác VI, không giọng game, không "sắp có"', async () => {
    const { BEST_DICT } = await import('../src/i18n/best');
    for (const [k, v] of Object.entries(BEST_DICT.vi)) {
      const e = BEST_DICT.en[k as keyof typeof BEST_DICT.en];
      expect([k, placeholders(e)]).toEqual([k, placeholders(v)]);
      expect([k, e]).not.toEqual([k, v]);
      expect(`${v} ${e}`).not.toMatch(GAME_TONE);
      expect(`${v} ${e}`).not.toMatch(/sắp có|coming soon|boss/i);
    }
  });
});
