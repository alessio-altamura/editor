// The main process of the Electron the browser tests drive: it only waits, and the
// tests open hidden windows in it through playwright-core.
import { app } from 'electron';

app.disableHardwareAcceleration();
// The windows are the tests' own: closing them all does not end the app.
app.on('window-all-closed', () => undefined);
