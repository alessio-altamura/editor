// The browser of the tests: the Chromium of Electron, the same engine as the preview,
// the app and the print, driven with the _electron of playwright-core. On Linux it
// runs on the headless platform, without a screen.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron, type ElectronApplication, type Page, type Route } from 'playwright-core';

export function electronExecutable(): string {
  const folder = dirname(createRequire(import.meta.url).resolve('electron/package.json'));
  return join(folder, 'dist', readFileSync(join(folder, 'path.txt'), 'utf8'));
}

export interface TestBrowser {
  app: ElectronApplication;
  /** A hidden window of this size, as a page, in the colour scheme asked. */
  newPage: (options?: { width?: number; height?: number; colorScheme?: 'light' | 'dark' }) => Promise<Page>;
  /** Every request of every window goes through here. */
  route: (handler: (route: Route) => unknown) => Promise<void>;
  versions: { electron: string; chrome: string };
  close: () => Promise<void>;
}

export async function launchBrowser(): Promise<TestBrowser> {
  const harness = fileURLToPath(new URL('./electron-harness.js', import.meta.url));
  const flags = [...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []), ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])];
  const app = await _electron.launch({ executablePath: electronExecutable(), args: [...flags, harness], env: { ...process.env, NODE_OPTIONS: '' } });
  const versions = await app.evaluate(() => ({ electron: process.versions.electron, chrome: process.versions.chrome }));
  return {
    app,
    versions,
    newPage: async ({ width = 1280, height = 720, colorScheme = 'light' } = {}) => {
      const [page] = await Promise.all([
        app.waitForEvent('window'),
        app.evaluate(async ({ BrowserWindow }, size) => {
          const window = new BrowserWindow({ show: false, useContentSize: true, width: size.width, height: size.height, webPreferences: { sandbox: true, contextIsolation: true } });
          await window.loadURL('about:blank');
        }, { width, height }),
      ]);
      await page.emulateMedia({ colorScheme });
      return page;
    },
    route: (handler) => app.context().route('**/*', handler),
    close: () => app.close(),
  };
}
