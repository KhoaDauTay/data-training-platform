import { describe, expect, it } from 'vitest';
import { activeDomain, setActiveDomain } from '../src/domains';
import {
  canonicalHash, dataTableOf, domainHash, domainOfHash, hashOf, inDomain, initialRoute, isRoute, learnAdvOf, learnModuleOf, learnSkillOf, parseRoute, ROUTES,
} from '../src/route';

describe('route (v5 §B.3, Plan 7)', () => {
  it('parseRoute: không có hash → undefined (dùng route đã nhớ)', () => {
    expect(parseRoute('')).toBeUndefined();
  });

  it('trang chung: #/ Trang chủ, #/learn Lộ trình, #/practice Luyện SQL', () => {
    expect(parseRoute('#')).toBe('home');
    expect(parseRoute('#/')).toBe('home');
    expect(parseRoute('#/learn')).toBe('learn');
    expect(parseRoute('#/learn/sql/3')).toBe('learn');
    expect(parseRoute('#/practice')).toBe('practice');
  });

  it('trang của domain nằm dưới #/d/logistics', () => {
    expect(parseRoute('#/d/logistics')).toBe('overview');
    expect(parseRoute('#/d/logistics/')).toBe('overview');
    expect(parseRoute('#/d/logistics/play')).toBe('play');
    expect(parseRoute('#/d/logistics/play?x=1')).toBe('play');
    expect(parseRoute('#/d/logistics/data/ports')).toBe('data');
    expect(parseRoute('#/d/logistics/dashboard')).toBe('dashboard');
    expect(parseRoute('#/d/logistics/map')).toBe('map');
  });

  it('hash cũ chuyển tiếp mãi mãi, giữ phần đuôi', () => {
    expect(canonicalHash('#/play')).toBe('#/d/logistics/play');
    expect(canonicalHash('#play')).toBe('#/d/logistics/play');
    expect(canonicalHash('#/play?x=1')).toBe('#/d/logistics/play?x=1');
    expect(canonicalHash('#/data/ports')).toBe('#/d/logistics/data/ports');
    expect(canonicalHash('#/dashboard')).toBe('#/d/logistics/dashboard');
    expect(canonicalHash('#/dataX')).toBe('#/dataX');
    expect(canonicalHash('#/d/logistics/play')).toBe('#/d/logistics/play');
    expect(parseRoute('#/play')).toBe('play');
    expect(parseRoute('#/play/')).toBe('play');
    expect(parseRoute('#/data/ports')).toBe('data');
    expect(parseRoute('#/dashboard')).toBe('dashboard');
  });

  it('v14 T5: Finance là domain sống (không còn "Sắp có"); domain hay trang lạ về Trang chủ', () => {
    expect(parseRoute('#/d/finance')).toBe('overview');
    expect(parseRoute('#/d/finance/play')).toBe('play');
    expect(parseRoute('#/d/finance/data/loans')).toBe('data');
    expect(parseRoute('#/d/finance/dashboard')).toBe('dashboard');
    expect(parseRoute('#/d/finance/map')).toBe('map');
    expect(domainOfHash('#/d/finance/play')).toBe('finance');
    expect(parseRoute('#/d/mars')).toBe('home');
    expect(parseRoute('#/d/logistics/nope')).toBe('home');
    expect(parseRoute('#/d/logistics/constructor')).toBe('home');
    expect(parseRoute('#/sandbox')).toBe('home');
    expect(parseRoute('#/PLAY')).toBe('home');
    expect(domainHash('finance')).toBe('#/d/finance');
  });

  it('Plan 9: E-commerce là domain sống, trang của nó nằm dưới #/d/ecommerce', () => {
    expect(parseRoute('#/d/ecommerce')).toBe('overview');
    expect(parseRoute('#/d/ecommerce/play')).toBe('play');
    expect(parseRoute('#/d/ecommerce/data/orders')).toBe('data');
    expect(parseRoute('#/d/ecommerce/map')).toBe('map');
    expect(domainOfHash('#/d/ecommerce/play?x=1')).toBe('ecommerce');
    expect(domainOfHash('#/play')).toBe('logistics'); // hash cũ → Logistics (canonicalHash)
    expect(domainOfHash('#/learn')).toBeUndefined();
    expect(domainOfHash('#/d/mars')).toBeUndefined();
    expect(dataTableOf('#/d/ecommerce/data/order_items')).toBe('order_items');
  });

  it('Plan 9: hashOf theo domain đang mở; hash cũ vẫn về Logistics', () => {
    const before = activeDomain();
    setActiveDomain('ecommerce');
    expect(hashOf('play')).toBe('#/d/ecommerce/play');
    expect(hashOf('overview')).toBe('#/d/ecommerce');
    expect(hashOf('learn')).toBe('#/learn');
    expect(canonicalHash('#/play')).toBe('#/d/logistics/play');
    setActiveDomain(before);
    expect(hashOf('play')).toBe('#/d/logistics/play');
  });

  it('hashOf ngược với parseRoute', () => {
    for (const r of ROUTES) expect(parseRoute(hashOf(r))).toBe(r);
  });

  it('initialRoute: hash thắng route đã nhớ; giá trị cũ vẫn hợp lệ; hỏng → home', () => {
    expect(initialRoute('#/', 'play')).toBe('home');
    expect(initialRoute('', 'play')).toBe('play');
    expect(initialRoute('', 'data')).toBe('data');
    expect(initialRoute('', 'junk')).toBe('home');
    expect(initialRoute('', 'soon')).toBe('home'); // v14 T5: a remembered "Coming soon" page reads as Home
    expect(initialRoute('', undefined)).toBe('home');
    expect(isRoute('play')).toBe(true);
    expect(isRoute(42)).toBe(false);
  });

  it('ROUTES và inDomain', () => {
    expect(ROUTES).toEqual(['home', 'learn', 'practice', 'overview', 'play', 'data', 'dashboard', 'map', 'me', 'engine']);
    expect(ROUTES.filter(inDomain)).toEqual(['overview', 'play', 'data', 'dashboard', 'map']);
  });

  it('dataTableOf: hash mới và cũ, chỉ nhận định danh', () => {
    expect(dataTableOf('#/d/logistics/data/ports')).toBe('ports');
    expect(dataTableOf('#/data/container_events')).toBe('container_events');
    expect(dataTableOf('#/d/logistics/data')).toBeUndefined();
    expect(dataTableOf('#/data/')).toBeUndefined();
    expect(dataTableOf('#/data/x;drop')).toBeUndefined();
    expect(dataTableOf('#/data/Ports')).toBeUndefined();
    expect(dataTableOf('#/play/ports')).toBeUndefined();
  });

  it('learnModuleOf: module 1–12 (một module mỗi chương, L27)', () => {
    expect(learnModuleOf('#/learn/sql/1')).toBe(1);
    expect(learnModuleOf('#/learn/sql/12')).toBe(12);
    expect(learnModuleOf('#/learn/sql/13')).toBeUndefined();
    expect(learnModuleOf('#/learn/sql/0')).toBeUndefined();
    expect(learnModuleOf('#/learn/sql/3x')).toBeUndefined();
    expect(learnModuleOf('#/learn')).toBeUndefined();
  });

  it('learnSkillOf / learnAdvOf (Plan 8a Task 9): trang kỹ năng và trang nút, id lạ → undefined', () => {
    expect(parseRoute('#/learn/skill/where')).toBe('learn');
    expect(parseRoute('#/learn/adv/b2')).toBe('learn');
    expect(learnSkillOf('#/learn/skill/where')).toBe('where');
    expect(learnSkillOf('#/learn/skill/conditional_agg')).toBe('conditional_agg');
    expect(learnAdvOf('#/learn/adv/b2')).toBe('b2');
    expect(learnAdvOf('#/learn/adv/B2')).toBe('b2'); // L93: the page prints ids in capitals
    expect(learnSkillOf('#/learn/skill/Where')).toBeUndefined();
    expect(learnSkillOf('#/learn/skill/a-b')).toBeUndefined();
    expect(learnSkillOf('#/learn/skill/')).toBeUndefined();
    expect(learnAdvOf('#/learn/adv/<x>')).toBeUndefined();
    expect(learnSkillOf('#/learn/adv/b2')).toBeUndefined();
    expect(learnAdvOf('#/learn')).toBeUndefined();
    expect(learnModuleOf('#/learn/skill/where')).toBeUndefined();
  });
});
