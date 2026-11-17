// Plan 9 Task 6: what changes with the open domain (schema per request, lane tables, ids, Sandbox starter).
import { afterEach, describe, expect, it } from 'vitest';
import { loadDomain, loadTickets } from '../src/content';
import { setActiveDomain } from '../src/domains';
import { chapterOfId } from '../src/home';
import { schemaOf, sandboxStarter } from '../src/session';
import { app, unlockedTables } from '../src/state';

await loadDomain('ecommerce');
afterEach(() => {
  setActiveDomain('logistics');
  app.tickets = [];
});

describe('domain đang mở (Plan 9 Task 6)', () => {
  it('việc chạy trên schema của domain; drill luôn trên lab', () => {
    const tk = loadTickets('ecommerce')[0];
    expect(schemaOf(tk)).toBe('game');
    setActiveDomain('ecommerce');
    expect(schemaOf(tk)).toBe('ecom');
    expect(schemaOf({ ...tk, id: 'g-select-1' })).toBe('lab');
  });

  it('bảng tuyến (lane) chỉ có ở Logistics; E-com chương 1 có đúng 5 bảng', () => {
    setActiveDomain('ecommerce');
    app.tickets = loadTickets('ecommerce');
    expect(unlockedTables().sort()).toEqual(['categories', 'customers', 'products', 'reviews', 'sellers']);
  });

  it('chương của id việc E-com (ô KPI khóa "mở ở chương N")', () => {
    expect(chapterOfId('ecom-ch2-01')).toBe(2);
    expect(chapterOfId('ch12-06')).toBe(12);
  });

  it('Sandbox mở bằng một bảng có thật của domain', () => {
    expect(sandboxStarter()).toContain('ports');
    setActiveDomain('ecommerce');
    expect(sandboxStarter()).toContain('products');
  });
});
