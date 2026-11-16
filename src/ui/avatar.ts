import { cx, deptColor, initials } from '../theme';
import { h } from './dom';

/** Ticket sender: initials on the department colour. Design v2 swaps in portraits here (the one place to change). */
export function avatar(from: { name: string; dept: string }): HTMLElement {
  return h('span', {
    class: cx('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', deptColor(from.dept)),
    'aria-hidden': 'true',
  }, initials(from.name));
}
