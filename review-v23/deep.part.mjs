
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
async function axe(tag) {
  await ev(`window.axe ? 1 : (eval(${S(AXE)}), 1)`);
  const r = await ev(`axe.run(document, { resultTypes: ['violations'], rules: { 'target-size': { enabled: true } } }).then(r => r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ':' + v.nodes.length + ':' + v.nodes.slice(0,2).map(n => n.target.join(' ')).join(' | ')))`);
  log(`  [axe ${tag}] ${r.length ? r.join(' ;; ') : 'ok'}`);
}
async function typeStep(id, i, code) { await ev(`(t => { t.value = ${S(code)}; t.dispatchEvent(new Event('input', { bubbles: true })); })(document.querySelector('[data-ek="${id}-s${i}-code"]'))`); }
async function submit(id, i) {
  await ev(`document.querySelector('[data-ek="${id}-s${i}-submit"]').click()`);
  const st = `document.querySelector('[data-ek="${id}-s${i}-code"]')?.closest('[data-step]').querySelector('[role=status]')`;
  await waitFor('graded', `!!${st}?.textContent && !document.querySelector('[data-ek="${id}-s${i}-submit"]').disabled`, 120000);
  return ev(`(${st}.classList.contains('good') ? 'GOOD ' : 'BAD ') + ${st}.textContent.slice(0,80) + ' | ' + (document.querySelector('[data-ek="${id}-s${i}-code"]')?.closest('[data-step]').querySelector('.error, pre.error')?.textContent.slice(0,120) ?? '')`);
}
async function deep(name) {
  const { parse } = await import('file:///' + join(ROOT, 'node_modules/yaml/dist/index.js').replace(/\\/g, '/'));
  const fm = (f) => parse(readFileSync(join(ROOT, 'content/engine', f), 'utf8').replace(/\r/g, '').split('\n---')[0].replace(/^---\n?/, ''));
  await open('#/engine/postgres/L1/e-pg-l1-10', { lesson: true });
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-0"]').focus()`);
  log(`  [focus radio] ${await ev(`(e => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor + ' off ' + s.outlineOffset; })(document.activeElement)`)}`);
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-check"]').focus()`);
  log(`  [focus btn] ${await ev(`(e => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor; })(document.activeElement)`)}`);
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-0"]').click()`);
  await ev(`document.querySelector('[data-ek="e-pg-l1-10-p-check"]').click()`);
  await waitFor('plan', `!!document.querySelector('#engine-page [data-plan]')`, 60000);
  await sleep(500);
  log(`  [disabled see] ${await ev(`(e => { const s = getComputedStyle(e); return e.disabled + ' op=' + s.opacity + ' cur=' + s.cursor + ' bg=' + s.backgroundColor; })(document.querySelector('[data-ek="e-pg-l1-10-p-check"]'))`)}`);
  log(`  [focus after plan] ${await ev(`document.activeElement?.dataset.ek`)}`);
  await axe('predict wrong');
  await ev(`(d => d && (d.open = true))(document.querySelector('[aria-labelledby="e-pg-l1-10-plan"] details'))`).catch(() => {});
  await sleep(1000); await shot(`${name}-predict-diagram-open`); await axe('predict diagram open');
  const cap = fm('postgres/L1/12-capstone-registrations.md');
  await open('#/engine/postgres/L1/e-pg-l1-12', { lesson: true });
  await typeStep('e-pg-l1-12', 0, 'ALTER TABLE registrations ADD CONSTRAINT x CHECK (seats > 0');
  log(`  [cap wrong s0] ${await submit('e-pg-l1-12', 0)}`);
  await shot(`${name}-cap-wrong`);
  for (const [i, st] of cap.lab.steps.entries()) {
    await typeStep('e-pg-l1-12', i, String(st.solution).trim());
    log(`  [cap s${i}] ${await submit('e-pg-l1-12', i)} bar=${await ev(`[...document.querySelectorAll('[data-cap-bar] li')].map(li => (li.getAttribute('aria-current') ? '>' : '') + (li.querySelector('.bg-good') ? 'v' : '.')).join('')`)} main=${await ev(`[...document.querySelectorAll('#engine-page [data-ek$="-submit"]')].filter(b => b.matches('.bg-accent')).map(b => b.dataset.ek).join()`)}`);
    if (await ev(`!!document.querySelector('[data-ek="e-pg-l1-12-plans"]')`) && !(await ev(`!!document.querySelector('[data-cap-plans]')`))) {
      await ev(`document.querySelector('[data-ek="e-pg-l1-12-plans"]').click()`);
      await waitFor('plans', `!!document.querySelector('[data-cap-plans]')`, 60000).catch((e) => log('  ERR', e.message));
      await sleep(500); await shot(`${name}-cap-plans`); await axe('cap plans');
    }
  }
  for (const [i, q] of (cap.quiz ?? []).entries()) { await ev(`document.querySelector('[data-ek="e-pg-l1-12-q${i}-${q.answer}"]')?.click()`); await ev(`document.querySelector('[data-ek="e-pg-l1-12-q${i}-check"]')?.click()`); await sleep(200); }
  await sleep(800);
  log(`  [cap done] ${await ev(`!!document.querySelector('[data-cap-done]')`)} completed=${await ev(`JSON.parse(localStorage.getItem('cargo-query-save')).completed.includes('e-pg-l1-12')`)}`);
  await shot(`${name}-cap-done`); await axe('cap done');
  for (const [f, hash, id, wrong] of [['mongodb/L1/02-find-filter.md', '#/engine/mongodb/L1/e-mg-l1-02', 'e-mg-l1-02', 'db.customers.find({ tier: "gold" '], ['dynamodb/L1/05-get-item.md', '#/engine/dynamodb/L1/e-dy-l1-05', 'e-dy-l1-05', '{"op": "GetItem", "input": {"TableName": "Books"']]) {
    const l = fm(f);
    await open(hash, { lesson: true });
    await typeStep(id, 0, wrong); log(`  [${id} syntax] ${await submit(id, 0)}`);
    await shot(`${name}-${id}-error`);
    await typeStep(id, 0, String(l.lab.steps[0].solution).trim()); log(`  [${id} right] ${await submit(id, 0)}`);
    await shot(`${name}-${id}-right`); await axe(id);
  }
  await open('#/engine/postgres/L3/e-pg-l3-16', { lesson: true });
  const nxt = `[...document.querySelectorAll('#engine-page button')].find(b => /^(Tiếp|Next)/.test(b.textContent.trim()))`;
  const pos = [];
  for (let i = 0; i < 8; i++) { const r = await ev(`(b => b ? [b.disabled, Math.round(b.getBoundingClientRect().top + scrollY), Math.round(b.getBoundingClientRect().left)].join(',') : 'none')(${nxt})`); pos.push(r); if (r.startsWith('true') || r === 'none') break; await ev(`${nxt}.click()`); await sleep(400); }
  log(`  [viz steps] ${pos.join(' / ')} anims=${await ev(`document.getAnimations().filter(a => a.playState === 'running').length`)}`);
  await shot(`${name}-viz-end`);
}
async function welcomeSql(name) {
  await reset({ theme: 'light', lang: 'vi', state: 'new' });
  await send('Page.navigate', { url: BASE + '#/engine' }); await sleep(3000);
  for (let i = 0; i < 6; i++) {
    if (await ev(`!!document.querySelector('[data-w="pick-general"]')`)) { await ev(`document.querySelector('[data-w="pick-general"]').click()`); break; }
    await ev(`(d => [...d.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent).pop()?.click())(document.getElementById('welcome-dialog'))`); await sleep(600);
  }
  await sleep(2500);
  log(`  [welcome sql-only] hash=${await ev('location.hash')} dialog=${await ev(`document.getElementById('welcome-dialog')?.open`)} h1=${await ev(`document.querySelector('main:not([hidden]) h1')?.textContent`)}`);
  await shot(`${name}-welcome-sqlonly`);
}
