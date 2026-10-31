const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('console', (m) => errs.push(m.text()));
  await p.goto('http://127.0.0.1:8765/bench/iso.html?csp=1');
  await p.waitForFunction(() => window.result, undefined, { timeout: 120000 });
  const r = await p.evaluate(() => window.result); r.console = errs.slice(0, 6);
  console.log(JSON.stringify(r, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
