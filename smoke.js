// End-to-end: loads the built page in Chrome, solves every exercise through the UI, takes screenshots.
const puppeteer = require('puppeteer-core');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setViewport({ width: 1360, height: 900 });
  const url = 'file://' + path.join(__dirname, 'index.html');
  await page.goto(url + '#home', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('#boot'), { timeout: 60000 });
  const shots = process.env.SHOTS;
  if (shots) await page.screenshot({ path: 'shot-home.png' });
  const days = await page.evaluate(() => LAB.days.map(d => d.n).sort((a, b) => a - b));
  const only = process.argv[2] ? Number(process.argv[2]) : null;
  let fails = 0, total = 0;
  for (const n of days) {
    if (only && n !== only) continue;
    await page.goto(url + '#day-' + n);
    await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    // learn: click every Run button
    await page.evaluate(() => { const b = [...document.querySelectorAll('.steps-nav button')].find(b => b.dataset.tab === 'learn'); b.click(); });
    const lessonErrs = await page.evaluate(() => { document.querySelectorAll('[data-run]').forEach(b => b.click()); return [...document.querySelectorAll('[data-out] .err')].map(e => e.textContent); });
    lessonErrs.forEach(e => { console.log('day', n, 'lesson error:', e); });
    if (shots && n === Number(shots)) await page.screenshot({ path: 'shot-learn.png', fullPage: false });
    await page.evaluate(() => { const b = [...document.querySelectorAll('.steps-nav button')].find(b => b.dataset.tab === 'practice'); b.click(); });
    const ids = await page.evaluate(n => LAB.days.find(d => d.n === n).exercises.map(e => e.id), n);
    for (const id of ids) {
      total++;
      const res = await page.evaluate(id => {
        const ex = LAB.days.flatMap(d => d.exercises).find(e => e.id === id);
        const art = document.getElementById('ex-' + id);
        const ta = art.querySelector('textarea');
        ta.value = ex.solution; ta.dispatchEvent(new Event('input'));
        art.querySelector('[data-excheck]').click();
        const a2 = document.getElementById('ex-' + id);
        const fb = a2.querySelector('.fb');
        return { pass: !!(fb && fb.classList.contains('pass')), txt: fb ? fb.textContent : 'no feedback' };
      }, id);
      if (!res.pass) { fails++; console.log('FAIL', id, res.txt); }
    }
    // a wrong answer must fail
    const wrong = await page.evaluate(id => {
      const art = document.getElementById('ex-' + id); const ta = art.querySelector('textarea');
      ta.value = 'SELECT 1 AS x;'; ta.dispatchEvent(new Event('input'));
      art.querySelector('[data-excheck]').click();
      const fb = document.getElementById('ex-' + id).querySelector('.fb');
      return fb && fb.classList.contains('fail');
    }, ids[0]);
    if (!wrong) { fails++; console.log('FAIL wrong answer accepted on', ids[0]); }
    if (shots && n === Number(shots)) { await page.evaluate(() => document.querySelector('[data-exhint]').click()); await page.screenshot({ path: 'shot-practice.png' }); }
    // recall: answer all
    await page.evaluate(() => { const b = [...document.querySelectorAll('.steps-nav button')].find(b => b.dataset.tab === 'recall'); b.click(); });
    for (let i = 0; i < 12; i++) {
      const more = await page.evaluate(() => { const o = document.querySelector('[data-qopt]:not([disabled])'); if (!o) return false; o.click(); const nx = document.querySelector('[data-qnext]'); if (nx) nx.click(); return true; });
      if (!more) break;
    }
    console.log('day', n, 'ok', ids.length, 'exercises');
  }
  await page.goto(url + '#playground'); await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
  await page.evaluate(() => document.querySelector('#pgRun').click());
  const pgOk = await page.evaluate(() => !!document.querySelector('#pgOut table.grid'));
  if (!pgOk) { fails++; console.log('FAIL playground'); }
  if (shots) await page.screenshot({ path: 'shot-playground.png' });
  await page.goto(url + '#review'); await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
  if (shots) {
    await page.goto(url + '#home'); await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.screenshot({ path: 'shot-home-dark.png' });
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(url + '#day-' + shots); await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await new Promise(r => setTimeout(r, 600)); await page.screenshot({ path: 'shot-mobile-dark.png' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) console.log('WARN horizontal overflow on mobile');
  }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  console.log(fails ? fails + ' failures of ' + total : 'all ' + total + ' exercises pass through the UI');
  await browser.close();
})();
