import { parse as parseYaml } from 'yaml';
import raw from '../content/glossary.yml?raw';
import { isLiveDomain, type DomainId } from './domains';

/** `domain` (v15 Q5, D-N4): the domain whose Notebook shows the term; Logistics when the entry names none. */
export interface Term { term: string; vi: string; en: string; columns: string[]; domain: DomainId }

export function parseGlossary(source: string): Term[] {
  const data = parseYaml(source) as unknown;
  if (!Array.isArray(data)) throw new Error('glossary.yml: cần một danh sách');
  return data.map((entry, i) => {
    const x = (entry ?? {}) as Record<string, unknown>;
    const str = (key: string): string => {
      const v = x[key];
      if (typeof v !== 'string' || !v.trim()) throw new Error(`glossary.yml #${i + 1}: thiếu "${key}"`);
      return v.trim();
    };
    const columns = x.columns ?? [];
    if (!Array.isArray(columns) || columns.some((c) => typeof c !== 'string')) {
      throw new Error(`glossary.yml #${i + 1}: "columns" phải là danh sách chuỗi`);
    }
    const domain = x.domain ?? 'logistics';
    if (!isLiveDomain(domain)) throw new Error(`glossary.yml #${i + 1}: "domain" không có`);
    return { term: str('term'), vi: str('vi'), en: str('en'), columns: columns as string[], domain };
  });
}

export const GLOSSARY: Term[] = parseGlossary(raw);

/** Lowercase, Vietnamese diacritics removed, so "luong do" finds "Luồng đỏ". */
export function normalize(s: string): string {
  return s.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function matches(query: string, ...texts: string[]): boolean {
  const q = normalize(query.trim());
  return q === '' || texts.some((x) => normalize(x).includes(q));
}
