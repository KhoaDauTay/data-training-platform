import type { Ticket } from '../tickets';

export type BeatState = 'done' | 'current' | 'todo';
/** `review`: the chapter's promotion review (beat: boss; the UI never says "boss", L22). */
export interface ChapterDot { id: string; state: BeatState; review: boolean }

/** One dot per ticket of the chapter, in content order: the workspace strip's progress bar. */
export function chapterDots(
  tickets: Pick<Ticket, 'id' | 'chapter' | 'beat'>[],
  completed: Set<string>,
  selectedId: string,
  chapter: number,
): ChapterDot[] {
  return tickets
    .filter((t) => t.chapter === chapter)
    .map((t) => ({
      id: t.id,
      state: completed.has(t.id) ? 'done' : t.id === selectedId ? 'current' : 'todo',
      review: t.beat === 'boss',
    }));
}
