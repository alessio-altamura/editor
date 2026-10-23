// The folder of the tests: an article with a chapter, a text, a concept and a paragraph
// written in the chapter, the error that «Estrai in un oggetto» corrects.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const front = (id: string, kind: string, extra = '') => `---\nid: ${id}\nkind: ${kind}\ntags: []\n${extra}---\n`;

export function writeFixture(): string {
  const folder = mkdtempSync(join(tmpdir(), 'doc-app-'));
  writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\nlang: it\n---\n');
  writeFileSync(join(folder, 'report.article.md'), front('report', 'article', 'title: Il rapporto\n') + '![[cap]]\n');
  writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\nUn capoverso scritto nel capitolo.\n');
  writeFileSync(join(folder, 'nota.text.md'), front('nota', 'text') + 'La somma fa `= 2 * 21`, vedi [[cap]].\n');
  writeFileSync(join(folder, 'idea.concept.md'), front('idea', 'concept') + 'Un concetto.\n');
  return folder;
}

declare global {
  interface Window {
    docAppState: { file: string | null; line: number; character: number; text: string };
  }
}
