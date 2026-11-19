// ENG-CORE (L220) + integration (L247): the Database Engine lesson index. Frontmatter is JSON at build (V22-E `?fm`,
// scripts/contentJson.mjs: no `yaml` in the browser). `meta` holds only the list fields of every lesson (META_KEYS in
// src/engine/content.ts; tests/engineContent.test.ts keeps the two lists equal), `full` one lazy chunk per lesson, loaded
// when the lesson opens (budget `engineLesson`, per file). src/ui/engine.ts imports this with import() (budget `engine`).
import type { LessonSource } from './engine/content';

export const meta = import.meta.glob<LessonSource>('../content/engine/*/L*/*.md', { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime', import: 'default', eager: true });
export const full = import.meta.glob<LessonSource>('../content/engine/*/L*/*.md', { query: '?fm', import: 'default' });
export const modules = import.meta.glob<unknown>('../content/engine/*/modules.yml', { import: 'default', eager: true });
