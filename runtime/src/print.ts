// The print (§11.5): the HTML of the light theme, printed to PDF by a Chromium of a fixed version.
import { chromium } from 'playwright-core';

/** The Chromium of playwright-core 1.56.1: another version could lay out the page differently. */
export const CHROMIUM_VERSION = '141.0.7390.37';
export const INSTALL_HINT = 'installalo con: npx playwright-core install chromium';

/** The page number, at the bottom in the middle; Chromium fills the span. */
function footer(fontFace: string): string {
  return (
    `<style>${fontFace}</style>` +
    '<div style="width: 100%; text-align: center; font-family: \'Source Serif 4\', serif; font-size: 9pt; color: #000000;">' +
    '<span class="pageNumber"></span></div>'
  );
}

export type PrintResult = { pdf: Buffer } | { browserError: string };

/**
 * Prints the page: A4, margins of 2 cm on every side, backgrounds, the page number at
 * the bottom; `fontFace` is the @font-face of the serif base font, for the number.
 */
export async function printPdf(html: string, fontFace: string): Promise<PrintResult> {
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    return { browserError: `non trovo Chromium ${CHROMIUM_VERSION}; ${INSTALL_HINT}` };
  }
  try {
    const version = browser.version();
    if (version !== CHROMIUM_VERSION) return { browserError: `Chromium è ${version}, serve ${CHROMIUM_VERSION}; ${INSTALL_HINT}` };
    const context = await browser.newContext({ colorScheme: 'light' });
    // The page loads nothing from outside: anything else is refused.
    await context.route('**/*', (route) => route.abort());
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: footer(fontFace),
    });
    return { pdf };
  } finally {
    await browser.close();
  }
}
