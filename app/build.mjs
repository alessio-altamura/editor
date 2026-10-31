// Builds the app with esbuild: the main process and the tests as ES modules for Node,
// the preload as CommonJS (a sandboxed preload must be), the renderer as one script.
import { copyFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';

const node = { bundle: true, platform: 'node', target: 'node22', format: 'esm', packages: 'external', logLevel: 'warning' };
await build({ ...node, entryPoints: ['src/main.ts'], outfile: 'dist/main.js' });
await build({ ...node, entryPoints: ['src/preload.ts'], outfile: 'dist/preload.cjs', format: 'cjs' });
await build({ ...node, entryPoints: ['test/unit.ts', 'test/e2e.ts', 'test/grid-measure.ts'], outdir: 'dist-test' });
await build({ entryPoints: ['src/renderer/renderer.ts'], outfile: 'dist/renderer/renderer.js', bundle: true, platform: 'browser', format: 'iife', target: 'chrome142', logLevel: 'warning', loader: { '.svg': 'text' } });
mkdirSync('dist/renderer', { recursive: true });
for (const file of ['index.html', 'style.css']) copyFileSync(`src/renderer/${file}`, `dist/renderer/${file}`);
// The fonts of the app (assets/fonts): Figtree for the interface, Petrona for the text in the editor.
mkdirSync('dist/renderer/fonts', { recursive: true });
for (const file of ['Figtree-wght.woff2', 'Petrona-wght.woff2', 'Petrona-Italic-wght.woff2']) copyFileSync(`assets/fonts/${file}`, `dist/renderer/fonts/${file}`);
