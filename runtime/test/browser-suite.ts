// The browser suite, outside `npm test`: opens the pages of the export suite in
// Chromium and checks what it computes against the values rebuilt by the tests.
// Run with `npm run test:browser`; Chromium comes from playwright-core.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
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
      return JSON.stringify(familyList(actual, true)) === JSON.stringify(familyList(value, false)) ? null : `${actual}, expected ${value}`;
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

const browser = await chromium.launch();
let failed = 0;
const base = mkdtempSync(join(tmpdir(), 'browser-'));
try {
  for (const { fixture, root, images } of VALID_PAGES) {
    const label = `${fixture} ${root}`;
    const problems: string[] = [];
    const folder = prepare(fixture, mkdtempSync(join(base, 'page-')));
    const html = runCli(['export', folder, '--root', root]).stdout.toString('utf8');
    const expected = expectedStyles(label, html, folder, root, images);
    const context = await browser.newContext();
    const requests: string[] = [];
    await context.route('**/*', (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
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
      if (got.tag !== want.tag) return problems.push(`element ${want.index}: <${got.tag}>, expected <${want.tag}>`);
      for (const property of properties) {
        const problem = mismatch(property, got.values[property]!, want.style);
        if (problem) problems.push(`<${want.tag}> #${want.index} ${property}: ${problem}`);
      }
    });
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
    for (const { selector, values } of BY_HAND[label] ?? []) {
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
    await context.close();
    if (problems.length === 0) console.log(`ok   ${label}: ${expected.length} elements`);
    else {
      failed++;
      console.log(`FAIL ${label}\n  ${problems.slice(0, 30).join('\n  ')}`);
    }
  }
} finally {
  await browser.close();
  rmSync(base, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nbrowser suite: all pass' : `\nbrowser suite: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
