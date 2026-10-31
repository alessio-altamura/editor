// The print (§11.5): the HTML of the light theme, printed to PDF by the Electron of the
// package, the same engine as the preview and the app, run as a child process.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The Electron of package.json: another version could lay out the page differently. */
export const ELECTRON_VERSION = '44.9.3';
export const INSTALL_HINT = 'installalo con npm ci nella cartella runtime';

/** The page number, at the bottom in the middle; Chromium fills the span. */
function footer(fontFace: string): string {
  return (
    `<style>${fontFace}</style>` +
    '<div style="width: 100%; text-align: center; font-family: \'Source Serif 4\', serif; font-size: 9pt; color: #000000;">' +
    '<span class="pageNumber"></span></div>'
  );
}

export type PrintResult = { pdf: Buffer } | { browserError: string };

/** The executable of Electron: DOC_RUNTIME_ELECTRON if set, else the one of the package. */
export function electronPath(): string | null {
  if (process.env.DOC_RUNTIME_ELECTRON !== undefined) return process.env.DOC_RUNTIME_ELECTRON;
  // Read where the package puts it, without require('electron'), which would download it
  // and say so on stdout; the download is the postinstall of npm ci.
  try {
    const folder = dirname(createRequire(import.meta.url).resolve('electron/package.json'));
    return join(folder, 'dist', readFileSync(join(folder, 'path.txt'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Prints the page: A4, margins of 2 cm on every side, backgrounds, the page number at
 * the bottom; `fontFace` is the @font-face of the serif base font, for the number.
 */
export async function printPdf(html: string, fontFace: string): Promise<PrintResult> {
  const executable = electronPath();
  if (executable === null || !existsSync(executable)) return { browserError: `non trovo Electron ${ELECTRON_VERSION}; ${INSTALL_HINT}` };
  const work = mkdtempSync(join(tmpdir(), 'doc-print-'));
  try {
    const input = join(work, 'page.html');
    const footerFile = join(work, 'footer.html');
    const output = join(work, 'page.pdf');
    writeFileSync(input, html);
    writeFileSync(footerFile, footer(fontFace));
    const script = fileURLToPath(new URL('./print-electron.js', import.meta.url));
    // Without a screen on Linux: the headless platform. As root Chromium wants --no-sandbox.
    const flags = [
      ...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []),
      ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    ];
    const run = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = spawn(executable, [...flags, script, '--input', input, '--footer', footerFile, '--output', output], {
        stdio: ['ignore', 'pipe', 'pipe'],
        // Electron does not accept some Node options of the parent (for example --use-openssl-ca).
        env: { ...process.env, NODE_OPTIONS: '', ELECTRON_RUN_AS_NODE: '' },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
      child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));
      child.on('error', () => resolve({ code: null, stdout, stderr }));
      child.on('exit', (code) => resolve({ code, stdout, stderr }));
    });
    if (run.code === null) return { browserError: `non riesco a lanciare Electron ${ELECTRON_VERSION}; ${INSTALL_HINT}` };
    const versions = run.stdout.split('\n').map((line) => {
      try {
        return JSON.parse(line) as { electron?: string };
      } catch {
        return null;
      }
    }).find((v) => v?.electron !== undefined);
    if (versions && versions.electron !== ELECTRON_VERSION) return { browserError: `Electron è ${versions.electron}, serve ${ELECTRON_VERSION}; ${INSTALL_HINT}` };
    if (run.code !== 0 || !existsSync(output)) throw new Error(`la stampa con Electron non è riuscita: ${run.stderr.split('\n').filter((l) => !/dbus|Fontconfig|viz_main/.test(l)).join('\n').trim()}`);
    return { pdf: readFileSync(output) };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
