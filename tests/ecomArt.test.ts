import { describe, expect, it } from 'vitest';
import { CITIES, openCities } from '../src/art/ecommerce';
import { ecomRunner } from './helpers';

describe('bản đồ giao hàng E-com (Plan 9 D9-13)', () => {
  it('mỗi thành phố trên bản đồ là thành phố giao hàng có thật trong seed', async () => {
    const r = await (await ecomRunner())('SELECT DISTINCT city FROM deliveries ORDER BY 1');
    expect(CITIES.map((c) => c.name).sort()).toEqual(r.rows.map((x) => String(x[0])));
  });

  it('Da Nang và Hue mở từ đầu; mỗi chương 1–5 mở đúng một thành phố', () => {
    expect([...openCities(new Set())].sort()).toEqual(['Da Nang', 'Hue']);
    for (let ch = 1; ch <= 5; ch++) expect(CITIES.filter((c) => c.opens === ch)).toHaveLength(1);
    expect(openCities(new Set([1, 2, 3, 4, 5, 6])).size).toBe(CITIES.length);
  });
});
