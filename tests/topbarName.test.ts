// @vitest-environment jsdom
import html from '../index.html?raw';
import { describe, expect, it } from 'vitest';
import { setActionButton } from '../src/ui/topbar';

describe('v21 E1: nút Hộp thư/Ôn tập, tên truy cập bắt đầu bằng chữ đang hiện (WCAG 2.5.3)', () => {
  const btn = (): HTMLElement => {
    const b = document.createElement('button');
    b.innerHTML = '<span data-label></span><span data-badge aria-hidden="true" hidden></span>';
    return b;
  };
  it('có số: tên = nhãn + số, câu đầy đủ ở title', () => {
    const b = btn();
    setActionButton(b, 'Ôn tập', 5, 'Ôn tập, 5 mục đến hạn');
    const visible = `${b.querySelector('[data-label]')!.textContent} ${b.querySelector('[data-badge]')!.textContent}`;
    expect(b.getAttribute('aria-label')).toBe(visible);
    expect(b.title).toBe('Ôn tập, 5 mục đến hạn');
  });
  it('trên 99 thì cả tên và huy hiệu ghi 99+', () => {
    const b = btn();
    setActionButton(b, 'Hộp thư', 120, 'Hộp thư, 120 thư mới');
    expect(b.getAttribute('aria-label')).toBe('Hộp thư 99+');
  });
  it('index.html: có khoảng trắng giữa nhãn và huy hiệu (axe đọc chữ hiển thị "Ôn tập5" nếu dính liền, L222)', () => {
    for (const id of ['inbox-btn', 'review-btn']) {
      const tag = new RegExp(`<button id="${id}"[\\s\\S]*?</button>`).exec(html)![0];
      expect(tag).toMatch(/<\/span>\s+<span data-badge/);
    }
  });
  it('không có số: không aria-label, title là nhãn', () => {
    const b = btn();
    setActionButton(b, 'Sổ tay', 0, '');
    expect(b.hasAttribute('aria-label')).toBe(false);
    expect(b.title).toBe('Sổ tay');
  });
});