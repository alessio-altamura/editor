// One object alone, as it will appear: the same renderer and the base stylesheet, on an
// article made for it in memory, never written. The cards of the canvas in the app and
// the page of an object in serve use it.
import { randomBytes } from 'node:crypto';
import { pageAssets } from './assets.js';
import type { FormulaResult } from './formula.js';
import { resolveTree } from './resolve-tree.js';
import { staticExport, type ExportAsset, type PreviewOptions } from './static-export.js';
import { ID_FORM, type ResolvedTree, type TreeNode } from './tree.js';

export interface Standalone {
  /** The tree of the folder, with one article for each object that can stand alone. */
  tree: ResolvedTree;
  /** The id of the article of each object. */
  roots: Map<string, string>;
}

/**
 * The tree with an article for each object, from one resolution: an article in memory
 * for each one, which embeds it alone, so that what the runtime numbers (chapters,
 * images) counts as in the object alone. An object that cannot be embedded (a concept,
 * an article) has none.
 */
export function standaloneTree(folder: string, overlay: ReadonlyMap<string, string | null>, ids: string[], positions = true, records?: number, results?: ReadonlyMap<string, FormulaResult>): Standalone {
  const holder = `standalone-${randomBytes(6).toString('hex')}`;
  const wanted = [...new Set(ids.filter((id) => ID_FORM.test(id)))];
  const files = new Map(wanted.map((id, index) => [`${holder}-${index + 1}.article.md`, id]));
  const texts = [...files].map(([file, id], index) => [file, `---\nid: ${holder}-${index + 1}\nkind: article\n---\n![[${id}]]\n`] as [string, string]);
  // The values of the formulas already computed for the whole folder (class 4).
  const tree = resolveTree(folder, { positions, overlay: new Map([...overlay, ...texts]), records, drawings: true, ...(results ? { formulas: { results } } : {}) });
  const nodes: TreeNode[] = (tree.nodes ?? []).filter((node) => !files.has(node.file));
  const roots = new Map<string, string>();
  for (const article of tree.nodes ?? []) {
    const id = files.get(article.file);
    const item = article.content?.[0];
    if (id === undefined || article.id === undefined || typeof item === 'string' || item?.[0] !== 'embed') continue;
    const attributes = item[1] as Record<string, unknown>;
    if (attributes.unresolved === true) continue;
    // The embed is written in the article in memory: no source position of its own.
    const { sourcePosition: _position, ...own } = attributes;
    nodes.push({ ...article, attributes: { title: id }, content: [['embed', own, ...item.slice(2)]] });
    roots.set(id, article.id);
  }
  return { tree: { ...tree, nodes, diagnostics: (tree.diagnostics ?? []).filter((d) => !files.has(d.file)) }, roots };
}

/** The page of one object, as the preview writes it; null when it has none. */
export function standalonePage(standalone: Standalone, id: string, preview: PreviewOptions, read: (path: string) => ExportAsset): string | null {
  const root = standalone.roots.get(id);
  const article = standalone.tree.nodes?.find((node) => node.id === root);
  if (root === undefined || article === undefined) return null;
  const { assets } = pageAssets(standalone.tree, article, read);
  return [...staticExport(standalone.tree, root, assets, { allowErrors: true, preview })].join('');
}
