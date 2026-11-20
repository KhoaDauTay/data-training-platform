// ---- best (v24 BP-UI, L300): the Best Practice area. Every released card: "Run both" gives the card's verdict (never the
// "odd" line) and the check's right answers complete it (+5 XP each); the gallery, filters, the quick check, Boon's tip switch,
// and Boon's tip in the Sandbox → "Vì sao?" → the card. BEST_SHOTS=<dir>: 1280 light / 1024 light / 375 dark / 320 light pictures.
const BEST_CARDS = ['sql', 'postgres'].flatMap((t) => walk(`content/engine/best/${t}`).sort().map((f) =>
  parseYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(ROOT, f), 'utf8'))[1])));
SECTIONS.best = async () => {
  await shared();
  await step('best: #/engine has the Best Practice row; #/engine/best opens the SQL track', async () => {
    await go('#/engine');
    await waitFor('the Best Practice row', `!!document.querySelector('#engine-page a[href="#/engine/best"]')`, 60000);
    await ev(`document.querySelector('#engine-page a[href="#/engine/best"]').click()`);
    await waitFor('the SQL grid', `location.hash === '#/engine/best/sql' && !!document.querySelector('#engine-page[data-track="sql"]')`, 30000);
    const n = await ev(`document.querySelectorAll('#engine-page [data-card]').length`);
    const g = await ev(`document.querySelectorAll('#bp-gallery ~ ol a').length`);
    if (n !== 30 || g < 8) fail(`${n} cards (want 30), ${g} gallery tiles (want ≥ 8)`);
    await ev(`document.querySelector('[data-ek="bp-f-a"]').click()`);
    await sleep(200);
    const a = await ev(`document.querySelectorAll('#engine-page [data-card]').length`);
    await ev(`document.querySelector('[data-ek="bp-f-a"]').click()`);
    if (a !== BEST_CARDS.filter((c) => c.module === 'a').length) fail(`filter A shows ${a}`);
  });
  const xp0 = (await saveNow()).xp ?? 0;
  const failed = [];
  for (const c of BEST_CARDS) {
    const ok = await step(`best ${c.id} (${c.pair.runtime}/${c.pair.check})`, async () => {
      await go(`#/engine/best/${c.track}/${c.id}`);
      await waitFor(`${c.id} drawn`, `!!document.querySelector('#engine-page[data-card="${c.id}"]')`, 60000);
      let verdict = 'syntax';
      if (c.pair.runtime !== 'none') {
        await ev(`document.querySelector('[data-ek="bp-run"]').click()`);
        await waitFor('the verdict', `!!document.querySelector('#engine-page [data-verdict]')`, 120000);
        verdict = await ev(`document.querySelector('#engine-page [data-verdict]').dataset.verdict`);
        if (verdict === 'odd') fail(`Run both: ${await ev(`document.querySelector('#engine-page [data-verdict]').textContent`)}`);
      }
      for (const [i, q] of c.quiz.entries()) {
        await ev(`document.querySelector('[data-ek="${c.id}-q${i}-${q.answer}"]').click()`);
        await ev(`document.querySelector('[data-ek="${c.id}-q${i}-check"]').click()`);
        await sleep(100);
      }
      await waitFor('completed', `${completed}.includes(${S(c.id)})`, 10000);
      return verdict;
    });
    if (!ok) failed.push(c.id);
  }
  await step(`best: ${BEST_CARDS.length - failed.length}/${BEST_CARDS.length} cards passed, +5 XP each`, async () => {
    if (failed.length) fail(`failed: ${failed.join(', ')}`);
    const xp = (await saveNow()).xp - xp0;
    if (xp !== 5 * BEST_CARDS.length) fail(`XP +${xp}, want +${5 * BEST_CARDS.length}`);
  });
  await step('best: quick check draws 5 questions from finished cards; the tip switch writes the pref', async () => {
    await go('#/engine/best/postgres');
    await waitFor('the PostgreSQL grid', `!!document.querySelector('#engine-page[data-track="postgres"]')`, 30000);
    await ev(`document.querySelector('[data-ek="bp-quick"]').click()`);
    await waitFor('5 questions', `document.querySelectorAll('#engine-page [data-q^="bpq-"]').length === 5`, 30000);
    await ev(`document.querySelector('[data-ek="bp-tips"]').click()`);
    await sleep(200);
    if ((await ev(`JSON.parse(localStorage.getItem('cargo-query/bp-tips') || '{}').off`)) !== true) fail('switch off did not write off: true');
    await ev(`document.querySelector('[data-ek="bp-tips"]').click()`);
    await sleep(200);
    if ((await ev(`JSON.parse(localStorage.getItem('cargo-query/bp-tips') || '{}').off`)) !== false) fail('switch on did not write off: false');
  });
  await step('best: Boon tip in the Sandbox (Q02) → "Vì sao?" opens the card', async () => {
    await enterSandbox('logistics');
    await typeAnd('SELECT count(*) FROM ports p WHERE p.code NOT IN (SELECT s.origin_port FROM shipments s)', false);
    await waitFor('the tip', `!!document.querySelector('#work a[href="#/engine/best/sql/e-bp-q02"]')`, 90000);
    await ev(`document.querySelector('#work a[href="#/engine/best/sql/e-bp-q02"]').click()`);
    await waitFor('the Q02 card', `!!document.querySelector('#engine-page[data-card="e-bp-q02"]')`, 60000);
  });
  if (process.env.BEST_SHOTS) {
    mkdirSync(process.env.BEST_SHOTS, { recursive: true });
    for (const [w, h, theme] of [[1280, 800, 'light'], [1024, 700, 'light'], [375, 740, 'dark'], [320, 640, 'light']]) {
      for (const [hash, name] of [['#/engine/best/sql', 'sql'], ['#/engine/best/sql/e-bp-q02', 'q02']]) {
        await step(`best shot ${name} ${w} ${theme}`, async () => {
          await size(w, h);
          await ev(`localStorage.setItem('cargo-query/prefs', JSON.stringify({ ...JSON.parse(localStorage.getItem('cargo-query/prefs') || '{}'), theme: ${S(theme)} }))`);
          await load(hash);
          await waitFor('drawn', `!!document.getElementById('engine-page') && document.documentElement.dataset.theme === ${S(theme)}`, 60000);
          if (name === 'q02') {
            await ev(`document.querySelector('[data-ek="bp-run"]').click()`);
            await waitFor('the verdict', `!!document.querySelector('#engine-page [data-verdict]')`, 120000);
          }
          await sleep(500);
          const sw = await ev('document.documentElement.scrollWidth');
          if (w <= 375 && sw > w) fail(`horizontal scroll ${sw} > ${w}`);
          const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: await ev('document.documentElement.scrollHeight'), scale: 1 } });
          writeFileSync(join(process.env.BEST_SHOTS, `${name}-${w}-${theme}.png`), Buffer.from(r.data, 'base64'));
          return axe(`best ${name} ${w} ${theme}`);
        });
      }
    }
    await size(1280, 800);
  }
};

