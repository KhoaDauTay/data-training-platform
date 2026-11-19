// ENG-CORE (L220): the DynamoDB track of the Database Engine area as raw text (lessons + optional modules.yml). Only
// src/ui/engine.ts imports this, with import(), so it is its own lazy chunk (budget `engine`). Parsed by src/engine/content.ts.
export const lessons = import.meta.glob<string>('../content/engine/dynamodb/L*/*.md', { query: '?raw', import: 'default', eager: true });
export const modules = import.meta.glob<string>('../content/engine/dynamodb/modules.yml', { query: '?raw', import: 'default', eager: true });
