import { history, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { generalNow, loadTickets } from '../src/content';
import { drillTicket } from '../src/general';
import { isSuccess } from '../src/practice';
import { xpFor } from '../src/progress';
import { framePrice, payFrame, session } from '../src/session';
import { app } from '../src/state';
import { fillAction, firstBlank } from '../src/tickets';
import { fillSpec, flashField, flashOff } from '../src/ui/editor';

// v13 T3 (product-design-v8 §3.1, §3.5, §3.6): "Fill the scaffold into the editor".
describe('fillAction (§3.5)', () => {
  const frame = 'SELECT ___ FROM t';
  it('trống, bằng starter: thay ngay; bằng khung: chỉ chọn lại; câu khác: hỏi', () => {
    expect(fillAction('', frame, undefined)).toBe('replace');
    expect(fillAction('  \n', frame, 'SELECT')).toBe('replace');
    expect(fillAction('SELECT * FROM t\n', frame, 'SELECT * FROM t')).toBe('replace');
    expect(fillAction(frame, frame, undefined)).toBe('same');
    expect(fillAction('SELECT name FROM t', frame, undefined)).toBe('ask');
    expect(fillAction('SELECT name FROM t', frame, 'SELECT * FROM t')).toBe('ask');
  });
});

describe('firstBlank', () => {
  it('chỗ ___ đứng riêng đầu tiên, bỏ qua chuỗi và comment; faded: mọi ___', () => {
    expect(firstBlank("SELECT '___' -- ___\n, x.___ FROM t", false)).toBe(24);
    expect(firstBlank("SELECT '___', ___ FROM t", true)).toBe(8);
    expect(firstBlank('SELECT name FROM t', false)).toBe(-1);
    expect(firstBlank('SELECT a___b FROM t', false)).toBe(-1);
  });
});

describe('framePrice / payFrame (§3.6)', () => {
  const tickets = loadTickets('logistics');
  const ch2 = tickets.find((t) => t.chapter === 2 && t.hints.length === 3 && t.steps.length === 1)!;
  const ch1 = tickets.find((t) => t.chapter === 1)!;
  const reset = () => { app.save.hintsUsed = {}; };

  it('story chương ≥ 2: giá = mở tới gợi ý cuối; đã mở hết: miễn phí', () => {
    session.mode = { kind: 'story' };
    reset();
    app.save.hintsUsed[ch2.id] = 2;
    expect(framePrice(ch2)).toEqual({ xp: xpFor(ch2, 2) - xpFor(ch2, 3), hint: 3 });
    payFrame(ch2);
    expect(app.save.hintsUsed[ch2.id]).toBe(3);
    expect(framePrice(ch2)).toBe('free');
    reset();
  });

  it('chương 1 và việc phụ làn: miễn phí, vẫn mở gợi ý cuối', () => {
    session.mode = { kind: 'story' };
    reset();
    app.save.hintsUsed[ch1.id] = 2;
    expect(framePrice(ch1)).toBe('free');
    session.mode = { kind: 'lane', ticket: ch2 };
    app.save.hintsUsed[ch2.id] = 2;
    expect(framePrice(ch2)).toBe('free');
    payFrame(ch2);
    expect(app.save.hintsUsed[ch2.id]).toBe(3);
    session.mode = { kind: 'story' };
    reset();
  });

  it('Luyện tập: lượt thành "chưa đạt" (run.hints ≥ 2), kể cả drill ôn tập chỉ có một gợi ý', () => {
    const drill = drillTicket(generalNow()!.byId.get('g-where-2')!);
    for (const tk of [ch2, drill]) {
      const run = { id: 1, items: [], tickets: [tk], index: 0, wrong: 0, hints: 1, passed: 0, draft: '' };
      session.mode = { kind: 'practice', run };
      expect(framePrice(tk)).toBe('weak');
      payFrame(tk);
      expect(isSuccess(0, run.hints)).toBe(false);
      expect(framePrice(tk)).toBe('free');
    }
    session.mode = { kind: 'story' };
  });

  it('bàn luyện: cờ framed trong session, không ghi save.hintsUsed', () => {
    const d = generalNow()!.byId.get('g-where-2')!;
    const ticket = drillTicket(d);
    reset();
    session.mode = { kind: 'drill', ticket, drill: d, wrong: 0 };
    expect(framePrice(ticket)).toBe('weak');
    payFrame(ticket);
    expect(session.mode.framed).toBe(true);
    expect(app.save.hintsUsed[ticket.id]).toBeUndefined();
    expect(framePrice(ticket)).toBe('free');
    session.mode = { kind: 'story' };
  });
});

// ui-ux-v6 E3: the filled scaffold lights up (a mark decoration that fades in CSS) and stays one undo step.
describe('fill flash (v6 E3)', () => {
  const ranges = (st: EditorState) => {
    const out: [number, number][] = [];
    st.field(flashField).between(0, st.doc.length, (a, b) => { out.push([a, b]); });
    return out;
  };
  const run = (st: EditorState, cmd: typeof undo) => {
    let next = st;
    cmd({ state: st, dispatch: (tr) => { next = tr.state; } });
    return next;
  };
  it('điền khung: cả đoạn vừa chèn sáng lên; Hoàn tác một lần là về câu cũ', () => {
    let st = EditorState.create({ doc: 'SELECT 1', extensions: [history(), flashField] });
    st = st.update({ changes: { from: 8, insert: 'x' } }).state; // a keystroke just before: never merged with the fill
    st = st.update(fillSpec(st, 'SELECT ___ FROM t', [7, 3])).state;
    expect(st.doc.toString()).toBe('SELECT ___ FROM t');
    expect(ranges(st)).toEqual([[0, 17]]);
    expect(st.selection.main.from).toBe(7);
    st = st.update({ effects: flashOff }).state; // the timer's clear adds no undo step
    expect(ranges(st)).toEqual([]);
    st = run(st, undo);
    expect(st.doc.toString()).toBe('SELECT 1x');
  });
  it('đã bằng khung (không chèn gì): không sáng; gõ phím xóa vệt sáng', () => {
    let st = EditorState.create({ doc: 'SELECT ___', extensions: [history(), flashField] });
    st = st.update(fillSpec(st, undefined, [7, 3])).state;
    expect(ranges(st)).toEqual([]);
    st = st.update(fillSpec(st, 'SELECT ___ FROM t', [7, 3])).state;
    st = st.update({ changes: { from: 0, insert: ' ' } }).state;
    expect(ranges(st)).toEqual([]);
  });
});
