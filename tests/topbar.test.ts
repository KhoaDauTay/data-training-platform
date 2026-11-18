import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';

describe('U1 (v12.0): thanh trên một dòng dưới 640 px', () => {
  const tag = (re: RegExp) => html.match(re)?.[0] ?? '';
  it('header không xuống dòng, ngôn ngữ/giao diện và ba nút hành động ẩn ở mobile', () => {
    expect(tag(/<header class="topbar[^"]*"/)).toContain('max-sm:flex-nowrap');
    expect(tag(/<div class="top-prefs[^"]*"/)).toContain('max-sm:hidden');
    expect(tag(/<div[^>]*data-actions[^>]*>/)).toContain('max-sm:hidden');
    expect(html).toContain('id="domain-chapter"');
    expect(html).toContain('id="domain-icon"');
  });
  it('menu ⋯ có bản sao Hộp thư/Ôn tập/Sổ tay, VI|EN và theme cho mobile', () => {
    const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="domain-menu"'));
    for (const id of ['inbox-btn', 'review-btn', 'notebook-btn']) expect(menu).toContain(`data-proxy="${id}"`);
    for (const a of ['data-lang="vi"', 'data-lang="en"', 'data-theme-pref="light"', 'data-theme-pref="system"', 'data-theme-pref="dark"']) expect(menu).toContain(a);
  });
});

describe('F1 (ui-ux v6): thanh trên một dòng từ 1024 px', () => {
  const tag = (re: RegExp) => html.match(re)?.[0] ?? '';
  const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="domain-menu"'));
  it('header không xuống dòng từ lg; cụm trạng thái co lại, chức danh cắt bằng dấu …', () => {
    expect(tag(/<header class="topbar[^"]*"/)).toContain('lg:flex-nowrap');
    expect(tag(/<div id="status"[^>]*>/)).toContain('min-w-0');
    expect(tag(/<div id="status"[^>]*>/)).not.toContain('shrink-0');
    expect(tag(/<span id="rank"[^>]*>/)).toContain('truncate');
  });
  it('từ lg tới dưới 1440 px, VI|EN và theme gộp vào ⋯ (D-V9)', () => {
    expect(tag(/<div class="top-prefs[^"]*"/)).toContain('lg:max-[1440px]:hidden');
    const prefs = tag(/<div data-menu-prefs[^>]*>/);
    expect(prefs).toContain('sm:max-lg:hidden');
    expect(prefs).toContain('min-[1440px]:hidden');
    expect(menu.indexOf('data-menu-prefs')).toBeLessThan(menu.indexOf('data-lang="vi"'));
    expect(tag(/<div[^>]*data-menu-proxies[^>]*>/)).toContain('sm:hidden');
  });
});
