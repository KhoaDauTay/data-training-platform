/** Registries (Home sections, mode cards, top-bar links): the same id replaces the old entry; the list stays sorted by order. */
export function upsert<T extends { id: string; order: number }>(list: T[], item: T): void {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list.splice(i, 1);
  list.push(item);
  list.sort((a, b) => a.order - b.order);
}
