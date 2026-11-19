// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../src/db/run';
import { compareResults } from '../src/grader';
import { extraRowsOffer, extraRowsView } from '../src/ui/feedback';

const res = (rows: unknown[][]): QueryResult => ({ columns: ['code', 'country'], types: [25, 25], rows });
const answer = res([['VNSGN', 'Vietnam'], ['VNHPH', 'Vietnam'], ['SECRET', 'Answerland']]);
const mine = res([['VNSGN', 'Vietnam'], ['VNHPH', 'Vietnam'], ['CNSHA', 'China'], ['SGSIN', 'Singapore']]);
const fail = compareResults(answer, mine, false);
const story = { id: 'ch1-02', beat: 'develop' };

describe('L151: dòng thừa của người chơi ở story, không bao giờ dòng thiếu (L25)', () => {
  it('chỉ từ lần nộp sai thứ 2, chỉ việc story/lane/domain khác, chỉ khi có dòng thừa', () => {
    expect(extraRowsOffer(fail, 1, story)).toBeUndefined();
    expect(extraRowsOffer(fail, 2, story)).toEqual([['CNSHA', 'China'], ['SGSIN', 'Singapore']]);
    expect(extraRowsOffer(fail, 2, { id: 'fin-ch1-03', beat: 'twist' })).toHaveLength(2);
    expect(extraRowsOffer(fail, 2, { id: 'ch1-05', beat: 'boss' })).toBeUndefined(); // promotion review: no rows
    expect(extraRowsOffer(fail, 2, { id: 'g-select-open', beat: 'teach' })).toBeUndefined(); // a drill has its own diff
    expect(extraRowsOffer(fail, 2, { id: 'g-iv-junior-1-q1', beat: 'teach' })).toBeUndefined(); // interview: no rows (L144)
    expect(extraRowsOffer(compareResults(answer, res([['VNSGN', 'Vietnam']]), false), 3, story)).toBeUndefined(); // only missing rows
    expect(extraRowsOffer({ ok: false, reason: 'columns', expected: 3, actual: 6 }, 3, story)).toBeUndefined();
  });

  it('bảng chỉ có dòng của người chơi, tên cột của người chơi, không có giá trị của đáp án', () => {
    const rows = extraRowsOffer(fail, 2, story)!;
    const el = extraRowsView(mine, rows, 2, false, () => {});
    const text = el.textContent ?? '';
    expect(text).toContain('CNSHA');
    expect(text).toContain('SGSIN');
    expect(text).toContain('country');
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('Answerland');
    expect(el.tagName).toBe('DETAILS');
    expect((el as HTMLDetailsElement).open).toBe(false);
  });
});
