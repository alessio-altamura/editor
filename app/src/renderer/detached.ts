// The separate window of the preview: a bar with the command that brings it back to the
// page; the preview itself is the view of the main process, placed under the bar.
import type { DocApp } from '../preload.js';
import { decorate } from './icons.js';

const api = (window as unknown as { docApp: DocApp }).docApp;
decorate(document);
document.getElementById('attach')!.addEventListener('click', () => void api.attachPreview());
