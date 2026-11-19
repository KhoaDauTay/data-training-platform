import type { Plugin } from 'vite';

export function yamlData(text: string): unknown;
export function mdData(text: string): { fm: unknown; body: string } | null;
export function contentJson(): Plugin;
