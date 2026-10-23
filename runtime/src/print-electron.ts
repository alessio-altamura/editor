// The main process of the Electron that prints (§11.5): it loads the page, waits for
// the fonts and prints it to PDF. `print` runs it as a child process, with the files
// in the arguments; nothing else is loaded.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, nativeTheme } from 'electron';

const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const input = argument('--input');
const footer = argument('--footer');
const output = argument('--output');

/** 2 cm in inches, the unit of printToPDF. */
const MARGIN = 2 / 2.54;

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  if (!input || !footer || !output) throw new Error('mancano --input, --footer o --output');
  // The PDF is always in the light theme (§11.5).
  nativeTheme.themeSource = 'light';
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const page = pathToFileURL(input).href;
  // Only the page itself: images and fonts are inside it, as data.
  window.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !(details.url === page || details.url.startsWith('data:')) }));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  await window.loadURL(page);
  await window.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  const pdf = await window.webContents.printToPDF({
    pageSize: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: readFileSync(footer, 'utf8'),
  });
  writeFileSync(output, pdf);
  process.stdout.write(`${JSON.stringify({ electron: process.versions.electron, chrome: process.versions.chrome })}\n`);
  app.exit(0);
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  app.exit(1);
});
