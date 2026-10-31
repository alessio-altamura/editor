const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('console', (m) => errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  const cdp = await p.context().newCDPSession(p); await cdp.send('Performance.enable');
  await p.goto('http://127.0.0.1:8765/bench/page.html');
  await p.waitForFunction(() => window.result, undefined, { timeout: 240000 });
  const r = await p.evaluate(() => window.result);
  const m = await cdp.send('Performance.getMetrics');
  r.page_js_heap_mb = +(m.metrics.find((x) => x.name === 'JSHeapUsedSize').value / 1048576).toFixed(1);
  r.chromium = b.version(); r.console = errs.slice(0, 5);
  console.log(JSON.stringify(r, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
