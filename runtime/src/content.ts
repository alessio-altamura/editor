// The content of the resolved tree (§11.3): JsonML elements built from mdast.
import type { Decimal } from './math-line.js';
import type { JsonML } from './tree.js';

export interface Element {
  type: string;
  attributes: Record<string, unknown>;
  children: Child[];
  /** Data for the computed style pass, not written in the tree. */
  meta?: {
    /** Classes and embed classes of an `embed`, or of the root composition. */
    classes?: string[];
    embedClasses?: string[];
    /** A math line: its value and the language of its object, for a compact `display`. */
    value?: Decimal;
    lang?: string | undefined;
    /** A chapter title: its depth, for title-1, title-2 and title-3. */
    depth?: number;
    /** A link with `{n}` in a root composition, filled once every number is known. */
    numberSlot?: { label: string; id: string; fallback: string };
    /** Where the node is written (§11.6), for `resolve-tree --positions` and the preview. */
    position?: SourcePosition;
    /** The table of a collection: the language of its numbers and its data, for the decimals of the style pass (class 2). */
    collection?: { lang: string | undefined; data: unknown };
    /** A chart: what it draws, for the drawing of the style pass (class 3). */
    chartPlan?: import('./chart.js').ChartPlan;
    /** Declarations the runtime adds to the node itself (§0.5): column alignment, table header, tight list. */
    declarations?: Array<[string, string]>;
  };
}
export type Child = Element | string;

export function element(type: string, attributes: Record<string, unknown> = {}, children: Child[] = []): Element {
  return { type, attributes, children };
}

/** Appends children, joining neighbouring strings. */
export function appendChildren(target: Child[], children: Child[]): void {
  for (const child of children) {
    const last = target[target.length - 1];
    if (typeof child === 'string' && typeof last === 'string') target[target.length - 1] = last + child;
    else if (child !== '') target.push(child);
  }
}

/** A source position, counted as in LSP: lines from 0, characters in UTF-16 units. */
export interface SourcePosition {
  file: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}

/** The JsonML of an element; with `positions`, each element has `sourcePosition` in its attributes. */
export function toJsonML(child: Child, positions = false): JsonML {
  if (typeof child === 'string') return child;
  const out: [string, ...unknown[]] = [child.type];
  const attributes = positions && child.meta?.position ? { ...child.attributes, sourcePosition: child.meta.position } : child.attributes;
  if (Object.keys(attributes).length > 0) out.push(attributes);
  for (const c of child.children) out.push(toJsonML(c, positions));
  return out;
}
