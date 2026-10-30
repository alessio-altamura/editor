// The browser suite, outside `npm test`: opens the pages of the export suite in
// Chromium and checks what it computes against the values rebuilt by the tests.
// Run with `npm run test:browser`; Chromium comes from playwright-core.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchBrowser } from './electron-browser.js';
import { expectedStyles, prepare, runCli, VALID_PAGES } from './export-suite.js';

const PX_PER_PT = 4 / 3;

const close = (actual: number, expected: number) =>
  expected === 0 ? actual === 0 : Math.abs(actual - expected) / Math.abs(expected) <= 1e-5;

/** A font-family as a list: an unquoted item is generic only for serif, sans-serif and monospace. */
function familyList(value: string, css: boolean): string[] {
  const names: string[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] === '"' || value[i] === "'") {
      const quote = value[i]!;
      let name = '';
      for (i++; i < value.length && value[i] !== quote; i++) {
        if (css && value[i] === '\\') {
          const hex = /^[0-9a-fA-F]{1,6} ?/.exec(value.slice(i + 1));
          if (hex) {
            name += String.fromCodePoint(parseInt(hex[0].trim(), 16));
            i += hex[0].length;
          } else name += value[++i];
        } else name += value[i];
      }
      names.push(`name:${name}`);
      i++;
    } else {
      const end = value.indexOf(',', i);
      const item = value.slice(i, end < 0 ? value.length : end).trim();
      names.push(['serif', 'sans-serif', 'monospace'].includes(item) ? `generic:${item}` : `name:${item}`);
      i = end < 0 ? value.length : end;
    }
    while (value[i] === ',' || value[i] === ' ') i++;
  }
  return names;
}

/** The base fonts of §0.5: a generic family is drawn with its own, named before it. */
const BASE_FONT_NAMES: Record<string, string> = { 'generic:serif': 'Source Serif 4', 'generic:sans-serif': 'Source Sans 3', 'generic:monospace': 'Source Code Pro' };

const px = (pt: string) => parseFloat(pt) * PX_PER_PT;
const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

/** Compares one computed value with the expected one of §0.5; null when they agree. */
function mismatch(property: string, actual: string, expected: Record<string, string>): string | null {
  const value = expected[property]!;
  switch (property) {
    case 'font-size':
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
      return close(parseFloat(actual), px(value)) ? null : `${actual}, expected ${px(value)}px`;
    case 'line-height': {
      const want = value.endsWith('pt') ? px(value) : parseFloat(value) * px(expected['font-size']!);
      return close(parseFloat(actual), want) ? null : `${actual}, expected ${want}px`;
    }
    case 'font-weight': return Number(actual) === Number(value) ? null : `${actual}, expected ${value}`;
    case 'color': return actual === rgb(value) ? null : `${actual}, expected ${rgb(value)}`;
    case 'font-family':
      return JSON.stringify(familyList(actual, true)) === JSON.stringify(familyList(value, false).flatMap((item) => (BASE_FONT_NAMES[item] ? [`name:${BASE_FONT_NAMES[item]}`, item] : [item])))
        ? null : `${actual}, expected ${value} with the base fonts`;
    default: return actual === value ? null : `${actual}, expected ${value}`;
  }
}

/** Values written by hand, from §0.5: the type of the element, its position among those of its tag, and the values. */
const BY_HAND: Record<string, Array<{ selector: string; values: Record<string, string> }>> = {
  'esempio-34 report-q3': [
    { selector: 'h1', values: { 'font-size': '32px', 'line-height': '44.8px', 'font-weight': '700', 'margin-top': '24px', 'margin-bottom': '12px' } },
    { selector: 'p', values: { 'font-size': '14.6667px', 'line-height': '20.5333px', 'font-weight': '400', 'margin-bottom': '8px' } },
  ],
  'completo altro': [
    { selector: 'h1', values: { 'font-size': '29.3333px', 'line-height': '41.0667px', 'font-weight': '700', 'margin-bottom': '16px' } },
    { selector: 'a', values: { 'color': 'rgb(26, 79, 139)', 'text-decoration-line': 'underline' } },
  ],
};

const browser = await launchBrowser();
console.log(`     Electron ${browser.versions.electron}, Chromium ${browser.versions.chrome}`);
let requests: string[] = [];
await browser.route((route) => {
  requests.push(route.request().url());
  return route.abort();
});
let failed = 0;
const base = mkdtempSync(join(tmpdir(), 'browser-'));
try {
  for (const { fixture, root, images } of VALID_PAGES) {
    const label = `${fixture} ${root}`;
    const problems: string[] = [];
    const folder = prepare(fixture, mkdtempSync(join(base, 'page-')));
    const html = runCli(['export', folder, '--root', root]).stdout.toString('utf8');
    const expected = expectedStyles(label, html, folder, root, images);
    for (const scheme of ['light', 'dark'] as const) {
      requests = [];
      const page = await browser.newPage({ colorScheme: scheme });
      const context = browser.app.context();

      await page.setContent(html, { waitUntil: 'load' });
      const properties = ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'text-align', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'line-height', 'text-decoration-line'];
      const computed = await page.evaluate(({ indices, properties }) => {
        const all = document.querySelectorAll('*');
        return indices.map((index) => {
          const element = all[index]!;
          const style = getComputedStyle(element);
          return { tag: element.localName, values: Object.fromEntries(properties.map((p) => [p, style.getPropertyValue(p)])) };
        });
      }, { indices: expected.map((e) => e.index), properties });
      expected.forEach((want, i) => {
        const got = computed[i]!;
        if (got.tag !== want.tag) return problems.push(`${scheme}: element ${want.index}: <${got.tag}>, expected <${want.tag}>`);
        for (const property of properties) {
          const problem = mismatch(property, got.values[property]!, want.styles[scheme]);
          if (problem) problems.push(`${scheme}: <${want.tag}> #${want.index} ${property}: ${problem}`);
        }
      });
      // The base fonts: every @font-face loaded, and every text drawn with one of them.
      const faces = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].map((face) => `${face.family}/${face.style}/${face.status}`);
      });
      if (faces.length === 0 || faces.some((face) => !face.endsWith('/loaded'))) problems.push(`${scheme}: fonts ${faces.join(', ')}`);
      const cdp = await context.newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
      const withText = new Map<number, string>();
      const visit = (node: { nodeId: number; nodeType: number; nodeValue?: string; localName?: string; children?: Array<typeof node> }, parentId: number, parentName: string) => {
        if (node.nodeType === 3 && node.nodeValue!.trim() !== '' && !['style', 'title'].includes(parentName)) withText.set(parentId, (withText.get(parentId) ?? '') + node.nodeValue);
        for (const child of node.children ?? []) visit(child, node.nodeId, node.localName ?? '');
      };
      visit(root as never, 0, '');
      for (const [nodeId, text] of withText) {
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        // The family names written inside the three font files.
        const other = fonts.filter((font) => !font.isCustomFont || !['Source Serif 4 Variable', 'SourceSans3VF', 'SourceCodeVF'].includes(font.familyName));
        // U+FFFD, written for the control characters, is in none of the three fonts: a known limit.
        const replacements = [...text].filter((c) => c === '\uFFFD').length;
        if (other.reduce((n, f) => n + f.glyphCount, 0) > replacements) {
          const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
          problems.push(`${scheme}: text drawn with ${other.map((f) => `${f.familyName} (${f.glyphCount})`).join(', ')}: ${outerHTML.replace(/ style="[^"]*"/g, '').slice(0, 120)}`);
        }
      }
      const layout = await page.evaluate(() => {
        const out: string[] = [];
        const body = getComputedStyle(document.body);
        for (const side of ['top', 'right', 'bottom', 'left']) if (body.getPropertyValue(`margin-${side}`) !== '0px') out.push(`body margin-${side}`);
        if (document.compatMode !== 'CSS1Compat') out.push(document.compatMode);
        for (const li of document.querySelectorAll('li')) {
          const list = li.parentElement!;
          const parent = list.parentElement!;
          const parentStyle = getComputedStyle(parent);
          const contentLeft = parent.getBoundingClientRect().left + parseFloat(parentStyle.borderLeftWidth) + parseFloat(parentStyle.paddingLeft);
          const margin = parseFloat(getComputedStyle(list).marginLeft);
          if (Math.abs(li.getBoundingClientRect().left - contentLeft - margin) > 0.01) out.push(`li left ${li.getBoundingClientRect().left}, list content at ${contentLeft} + ${margin}`);
        }
        return out;
      });
      problems.push(...layout);
      const background = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      const wantBackground = scheme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(30, 30, 30)';
      if (background !== wantBackground) problems.push(`${scheme}: html background ${background}, expected ${wantBackground}`);
      // The values by hand are those of the light theme.
      for (const { selector, values } of scheme === 'light' ? BY_HAND[label] ?? [] : []) {
        const got = await page.evaluate(({ selector, names }) => {
          const style = getComputedStyle(document.querySelector(selector)!);
          return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n)]));
        }, { selector, names: Object.keys(values) });
        for (const [property, value] of Object.entries(values)) {
          const same = value.endsWith('px') ? close(parseFloat(got[property]!), parseFloat(value)) : got[property] === value;
          if (!same) problems.push(`by hand ${selector} ${property}: ${got[property]}, expected ${value}`);
        }
      }
      if (requests.length > 0) problems.push(`requests: ${requests.join(', ')}`);
      await page.close();
    }
    if (problems.length === 0) console.log(`ok   ${label}: ${expected.length} elements`);
    else {
      failed++;
      console.log(`FAIL ${label}\n  ${problems.slice(0, 30).join('\n  ')}`);
    }
  }
  // A collection (class 2): numbers on the right with the same decimals in a column, the header bold, the description in the caption, not seen.
  {
    const problems: string[] = [];
    const folder = mkdtempSync(join(base, 'collection-'));
    writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\nlang: it\n---\n');
    writeFileSync(join(folder, 'vendite.collection.md'), '---\nid: vendite\nkind: collection\ntags: []\nasset: vendite.tsv\nfields:\n  - name: mese\n    type: string\n    title: Mese\n  - name: euro\n    type: number\n  - name: pezzi\n    type: integer\n---\nVendite per mese.\n');
    writeFileSync(join(folder, 'vendite.tsv'), 'mese\teuro\tpezzi\ngennaio\t1.5\t12\nfebbraio\t2.25\t1300\nmarzo\t1250\t7\n');
    writeFileSync(join(folder, 'report.article.md'), '---\nid: report\nkind: article\ntags: []\ntitle: Rapporto\n---\n![[vendite]]\n');
    const html = runCli(['export', folder, '--root', 'report']).stdout.toString('utf8');
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const seen = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((td) => ({ text: td.textContent, align: getComputedStyle(td).textAlign, right: td.getBoundingClientRect().right - parseFloat(getComputedStyle(td).paddingRight) })));
      const heads = [...document.querySelectorAll('th')].map((th) => `${th.textContent}|${getComputedStyle(th).fontWeight}`);
      const caption = document.querySelector('caption')!;
      return { cells, heads, caption: caption.textContent, captionWidth: caption.getBoundingClientRect().width };
    });
    if (JSON.stringify(seen.heads) !== '["Mese|700","euro|700","pezzi|700"]') problems.push(`header ${JSON.stringify(seen.heads)}`);
    if (JSON.stringify(seen.cells.map((row) => row.map((cell) => cell.text))) !== '[["gennaio","1,50","12"],["febbraio","2,25","1300"],["marzo","1250,00","7"]]') problems.push(`strings ${JSON.stringify(seen.cells)}`);
    if (!seen.cells.every((row) => row[0]!.align === 'left' && row[1]!.align === 'right' && row[2]!.align === 'right')) problems.push('alignment');
    // Fixed decimals on the right: the digits line up, the last of each value on the same edge.
    const edges = new Set(seen.cells.map((row) => Math.round(row[1]!.right * 100)));
    if (edges.size !== 1) problems.push(`the numbers do not line up: ${[...edges].join()}`);
    if (seen.caption !== 'Vendite per mese.' || seen.captionWidth > 1) problems.push(`caption ${seen.caption} ${seen.captionWidth}`);
    await page.close();
    if (problems.length === 0) console.log('ok   a collection: alignment, fixed decimals, header, caption');
    else {
      failed++;
      console.log(`FAIL a collection\n  ${problems.join('\n  ')}`);
    }
  }
} finally {
  await browser.close();
  rmSync(base, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nbrowser suite: all pass' : `\nbrowser suite: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
