// One object alone, as it will appear: the same renderer and the base stylesheet, on an
// article made for it in memory, never written. The cards of the canvas in the app and
// the page of an object in serve use it.
import { randomBytes } from 'node:crypto';
import { pageAssets } from './assets.js';
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
 * embeds them all, and each embed, resolved, becomes the content of an article of its
 * own. An object that cannot be embedded (a concept, an article) has none.
 */
export function standaloneTree(folder: string, overlay: ReadonlyMap<string, string | null>, ids: string[], positions = true): Standalone {
  const holder = `standalone-${randomBytes(6).toString('hex')}`;
  const file = `${holder}.article.md`;
  const wanted = [...new Set(ids.filter((id) => ID_FORM.test(id)))];
  const text = `---\nid: ${holder}\nkind: article\n---\n${wanted.map((id) => `![[${id}]]`).join('\n\n')}\n`;
  const tree = resolveTree(folder, { positions, overlay: new Map([...overlay, [file, text]]) });
  const nodes: TreeNode[] = (tree.nodes ?? []).filter((node) => node.file !== file);
  const roots = new Map<string, string>();
  const content = tree.nodes?.find((node) => node.file === file)?.content ?? [];
  for (const item of content) {
    if (typeof item === 'string' || item[0] !== 'embed') continue;
    const attributes = item[1] as Record<string, unknown>;
    if (attributes.unresolved === true || typeof attributes.id !== 'string' || roots.has(attributes.id)) continue;
    const root = `${holder}-${roots.size + 1}`;
    // The embed is written in the article in memory: no source position of its own.
    const { sourcePosition: _position, ...own } = attributes;
    nodes.push({ id: root, kind: 'article', file, attributes: { title: attributes.id }, content: [['embed', own, ...item.slice(2)]] });
    roots.set(attributes.id, root);
  }
  return { tree: { ...tree, nodes, diagnostics: (tree.diagnostics ?? []).filter((d) => d.file !== file) }, roots };
}

/** The page of one object, as the preview writes it; null when it has none. */
export function standalonePage(standalone: Standalone, id: string, preview: PreviewOptions, read: (path: string) => ExportAsset): string | null {
  const root = standalone.roots.get(id);
  const article = standalone.tree.nodes?.find((node) => node.id === root);
  if (root === undefined || article === undefined) return null;
  const { assets } = pageAssets(standalone.tree, article, read);
  return [...staticExport(standalone.tree, root, assets, { allowErrors: true, preview })].join('');
}
