import { getLang, t } from '../i18n';
import { enginePlayOf } from '../route';
import { actions } from '../state';
import { cx, PILL } from '../theme';
import { h } from './dom';
import { icon } from './icons';

/**
 * v28 LINK (L432): the "Đào sâu" chips on a General skill page and a drill brief: links to the Database Engine lessons
 * that show what the skill does inside the engine (General → Engine only, L82: no domain is named). The table is the tiny
 * lazy chunk `engineDeep` (src/engine/deepLinks.ts), loaded on the first ask; until it is in, nothing is drawn.
 */
let table: typeof import('../engine/deepLinks') | 'loading' | 'failed' | undefined;
const ENGINE = { pg: ['PostgreSQL', 'engRelational'], mg: ['MongoDB', 'engDocument'], dy: ['DynamoDB', 'engKeyValue'] } as const;

/** The chips for a skill or advanced node id; null when it has none (or the table is not in yet). */
export function deepDive(id: string): HTMLElement | null {
  if (table === undefined) {
    table = 'loading';
    import('../engine/deepLinks').then((m) => { table = m; actions.rerender(); }, () => { table = 'failed'; });
  }
  if (typeof table !== 'object') return null;
  const { DEEP, TITLES } = table;
  const ids = DEEP[id] ?? [];
  if (!ids.length) return null;
  return h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm', 'data-deep': id },
    h('span', { class: 'font-bold' }, t('deep.title')),
    ...ids.map((x) => {
      const [name, ic] = ENGINE[x.slice(2, 4) as keyof typeof ENGINE];
      return h('a', { href: enginePlayOf(`#/engine/play/${x}`) ?? '#/engine', class: cx(PILL, 'bg-code text-ink no-underline') },
        icon(ic, 'size-4 shrink-0'), `${name} · ${TITLES[x][getLang() === 'en' ? 1 : 0]}`);
    }));
}
