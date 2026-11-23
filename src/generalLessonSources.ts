// v24 R0 (L337): General full lessons, content/general/lessons/<skill>.md, one lazy chunk per lesson (frontmatter + body as
// JSON through `?fm`, scripts/contentJson.mjs), named `gl-<skill>-<hash>.js` by vite.config.ts (budget `generalLesson`, per
// file). Only the learnui chunk imports this; the map of loaders is all it holds, so which skills have a full lesson is known
// without fetching any of them.
import type { LessonSource } from './fullLesson';

export const fullLessons = import.meta.glob<LessonSource>('../content/general/lessons/*.md', { query: '?fm', import: 'default' });
/** Skill id of a glob key (`../content/general/lessons/select.md` → `select`). */
export const lessonIdOf = (path: string): string => path.replace(/^.*\/|\.md$/g, '');
