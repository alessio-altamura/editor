const { _electron: electron } = require('playwright-core');
(async () => {
  const app = await electron.launch({ executablePath: require('electron'), args: ['--ozone-platform=headless', '--no-sandbox', __dirname + '/main.cjs'], env: { ...process.env, NODE_OPTIONS: '', PAGE: 'http://127.0.0.1:8765/bench/page.html' } });
  const p = await app.firstWindow();
  await p.waitForFunction(() => window.result, undefined, { timeout: 240000 });
  const r = await p.evaluate(() => window.result);
  const metrics = await app.evaluate(({ app }) => app.getAppMetrics().map((m) => ({ type: m.type, mb: Math.round(m.memory.workingSetSize / 1024) })));
  r.electron = await app.evaluate(() => process.versions.electron + ' / chromium ' + process.versions.chrome);
  r.process_memory_mb = metrics;
  console.log(JSON.stringify(r, null, 1)); await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
