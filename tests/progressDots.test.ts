import { describe, expect, it } from 'vitest';
import { chapterDots } from '../src/viz/progressDots';

describe('thanh tiến độ chương', () => {
  const tickets = [
    { id: 'ch1-01', chapter: 1, beat: 'teach' },
    { id: 'ch1-02', chapter: 1, beat: 'develop' },
    { id: 'ch1-03', chapter: 1, beat: 'twist' },
    { id: 'ch1-05', chapter: 1, beat: 'boss' },
    { id: 'ch2-01', chapter: 2, beat: 'teach' },
  ] as const;
  it('một chấm mỗi việc của chương, theo thứ tự; đánh giá thăng tiến được đánh dấu', () => {
    expect(chapterDots([...tickets], new Set(['ch1-01']), 'ch1-02', 1)).toEqual([
      { id: 'ch1-01', state: 'done', review: false, selected: false },
      { id: 'ch1-02', state: 'current', review: false, selected: true },
      { id: 'ch1-03', state: 'todo', review: false, selected: false },
      { id: 'ch1-05', state: 'todo', review: true, selected: false },
    ]);
  });
  it('việc đã xong vẫn là done dù đang được chọn, nhưng vẫn được đánh dấu đang mở', () => {
    expect(chapterDots([...tickets], new Set(['ch1-01']), 'ch1-01', 1)[0]).toMatchObject({ state: 'done', selected: true });
  });
});
