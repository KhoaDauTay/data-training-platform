import { describe, expect, it } from 'vitest';
import { placeLabels, textBox, type Box } from '../src/viz/geo';

/** L311 (user feedback: "S163ey", "175Tien Sa", "1335" on the Map page after Run): value labels never overlap. */
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('placeLabels', () => {
  it('moves a value off the map\'s own name (a port label to the right of its pin goes left)', () => {
    const name = textBox(712, 305, 'start', 'Sydney', 13); // a port name right of its pin at (700, 300)
    const [spot] = placeLabels([{ x: 700, y: 300, r: 10, text: '163' }], [name], 13);
    expect(spot).toBeDefined();
    expect(overlap(textBox(spot!.x, spot!.y, spot!.anchor, '163', 13), name)).toBe(false);
    expect(spot!.anchor).toBe('end');
  });

  it('two close points: neither value covers the other, nor a symbol; no room at all = left off', () => {
    const items = [{ x: 100, y: 100, r: 8, text: '13' }, { x: 112, y: 104, r: 8, text: '35' }];
    const spots = placeLabels(items, [], 13);
    const boxes = spots.map((s, i) => textBox(s!.x, s!.y, s!.anchor, items[i].text, 13));
    expect(overlap(boxes[0], boxes[1])).toBe(false);
    for (const [i, b] of boxes.entries()) for (const it of items.filter((_, j) => j !== i)) expect(overlap(b, { x: it.x - it.r, y: it.y - it.r, w: 2 * it.r, h: 2 * it.r })).toBe(false);
    const wall = [{ x: 0, y: 0, w: 1000, h: 1000 }];
    expect(placeLabels([{ x: 500, y: 500, r: 5, text: '1' }], wall, 13)).toEqual([undefined]);
  });
});
