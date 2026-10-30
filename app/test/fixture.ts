// The folder of the tests: an article with a chapter, a text, a concept and a paragraph
// written in the chapter, the error that «Estrai in un oggetto» corrects.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const front = (id: string, kind: string, extra = '') => `---\nid: ${id}\nkind: ${kind}\ntags: []\n${extra}---\n`;

/** The data of the collections of the tests: a TSV and the descriptor, with a key. */
export const SALES_TSV = 'mese\tvendite\tpezzi\ngennaio\t1250.5\t12\nfebbraio\t2.255\t1300\nmarzo\t\t7\n';
export const SALES = '---\nid: vendite\nkind: collection\ntags: []\nasset: vendite.tsv\nfields:\n  - name: mese\n    type: string\n    title: Mese\n  - name: vendite\n    type: number\n  - name: pezzi\n    type: integer\nprimaryKey: mese\n---\nVendite e pezzi venduti per mese.\n';
/** A text that is a table, for «Trasforma in collection». */
export const PRICES = '---\nid: prezzi\nkind: text\ntags: []\n---\n| Prodotto | Prezzo |\n|---|--:|\n| penna | 1,50 |\n| quaderno | 2,25 |\n';

export function writeFixture(options: { collection?: boolean } = {}): string {
  const folder = mkdtempSync(join(tmpdir(), 'doc-app-'));
  writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\nlang: it\n---\n');
  writeFileSync(join(folder, 'report.article.md'), front('report', 'article', 'title: Il rapporto\n') + '![[cap]]\n');
  writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\nUn capoverso scritto nel capitolo.\n');
  writeFileSync(join(folder, 'nota.text.md'), front('nota', 'text') + 'La somma fa `= 2 * 21`, vedi [[cap]].\n');
  writeFileSync(join(folder, 'idea.concept.md'), front('idea', 'concept') + 'Un concetto.\n');
  if (options.collection) {
    writeFileSync(join(folder, 'vendite.collection.md'), SALES);
    writeFileSync(join(folder, 'vendite.tsv'), SALES_TSV);
    writeFileSync(join(folder, 'prezzi.text.md'), PRICES);
    writeFileSync(join(folder, 'report.article.md'), front('report', 'article', 'title: Il rapporto\n') + '![[cap]]\n\n![[vendite]]\n');
  }
  return folder;
}

declare global {
  interface Window {
    docAppState: { file: string | null; line: number; character: number; text: string; view: 'canvas' | 'page'; mode: 'text' | 'grid' };
  }
}
