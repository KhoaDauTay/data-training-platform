import { describe, expect, it } from 'vitest';
import { dataTableOf, hashOf, initialRoute, isRoute, parseRoute, ROUTES } from '../src/route';

describe('route', () => {
  it('parseRoute: không có hash → undefined (dùng route đã nhớ)', () => {
    expect(parseRoute('')).toBeUndefined();
  });

  it('parseRoute: #/ và # là Trang chủ, #/play là màn làm bài', () => {
    expect(parseRoute('#')).toBe('home');
    expect(parseRoute('#/')).toBe('home');
    expect(parseRoute('#/play')).toBe('play');
    expect(parseRoute('#/play/')).toBe('play');
    expect(parseRoute('#play')).toBe('play');
    expect(parseRoute('#/play?x=1')).toBe('play');
  });

  it('parseRoute: đường lạ về Trang chủ', () => {
    expect(parseRoute('#/sandbox')).toBe('home');
    expect(parseRoute('#/PLAY')).toBe('home');
  });

  it('hashOf ngược với parseRoute', () => {
    for (const r of ROUTES) expect(parseRoute(hashOf(r))).toBe(r);
  });

  it('initialRoute: hash thắng route đã nhớ; route nhớ hỏng → home', () => {
    expect(initialRoute('#/', 'play')).toBe('home');
    expect(initialRoute('', 'play')).toBe('play');
    expect(initialRoute('', 'junk')).toBe('home');
    expect(initialRoute('', undefined)).toBe('home');
    expect(isRoute('play')).toBe(true);
    expect(isRoute(42)).toBe(false);
  });

  it('#/dashboard là Bảng điều hành (Plan 5, L48 D-A1)', () => {
    expect(parseRoute('#/dashboard')).toBe('dashboard');
    expect(hashOf('dashboard')).toBe('#/dashboard');
    expect(ROUTES).toEqual(['home', 'play', 'data', 'dashboard']);
  });

  it('#/data và #/data/<bảng> là trang Dữ liệu; dataTableOf chỉ nhận định danh', () => {
    expect(parseRoute('#/data')).toBe('data');
    expect(parseRoute('#/data/ports')).toBe('data');
    expect(dataTableOf('#/data/ports')).toBe('ports');
    expect(dataTableOf('#/data/container_events')).toBe('container_events');
    expect(dataTableOf('#/data')).toBeUndefined();
    expect(dataTableOf('#/data/')).toBeUndefined();
    expect(dataTableOf('#/data/x;drop')).toBeUndefined();
    expect(dataTableOf('#/data/Ports')).toBeUndefined();
    expect(dataTableOf('#/play/ports')).toBeUndefined();
  });
});
