import { describe, expect, it } from 'vitest';
import mapStrip from '../src/ui/mapStrip.ts?raw';
import sidebar from '../src/ui/sidebar.ts?raw';
import main from '../src/main.ts?raw';
import { outsideBox } from '../src/ui/dom';

// L140: a click on a modal dialog's backdrop closes it; the dialog's own padding and scrollbar are inside its box.
describe('light dismiss', () => {
  const r = { left: 100, top: 50, right: 500, bottom: 450 };
  it('closes only for a point outside the box', () => {
    expect(outsideBox(r, 99, 200)).toBe(true);
    expect(outsideBox(r, 300, 451)).toBe(true);
    expect(outsideBox(r, 100, 50)).toBe(false); // the edge is the dialog's border
    expect(outsideBox(r, 495, 200)).toBe(false); // its scrollbar
  });
  it('is the only backdrop handler: no dialog keeps its own e.target check', () => {
    for (const src of [mapStrip, sidebar]) expect(src).not.toMatch(/target === (dialog|drawer)/);
    expect(main).toMatch(/initLightDismiss\(\)/);
  });
});
