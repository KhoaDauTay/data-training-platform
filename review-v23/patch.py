p = 'walk.mjs'
s = open(p, encoding='utf8').read()
deep = open('deep.part.mjs', encoding='utf8').read()
s = s.replace("async function run(cfg) {", deep + "\nasync function run(cfg) {", 1)
s = s.replace("  if (state === 'new') {", "  if (cfg.deep) { await deep(name); return; }\n  if (cfg.welcome) { await welcomeSql(name); return; }\n  if (state === 'new') {", 1)
s = s.replace("const CONFIGS = {", "const CONFIGS = {\n  deep1280: { name: 'light-1280-deep', w: 1280, h: 800, theme: 'light', lang: 'vi', state: 'ret', deep: true },\n  deep375: { name: 'dark-375-deep', w: 375, h: 740, theme: 'dark', lang: 'vi', state: 'ret', deep: true, reduced: true },\n  wsql: { name: 'light-1280-new', w: 1280, h: 800, theme: 'light', lang: 'vi', state: 'new', welcome: true },", 1)
s = s.replace("  await send('Network.setBypassServiceWorker', { bypass: true });\n}", "  await send('Network.setBypassServiceWorker', { bypass: true });\n  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });\n}", 1)
s = s.replace("    const m = JSON.parse(e.data);\n", "    const m = JSON.parse(e.data);\n    if (m.method === 'Target.attachedToTarget') { const sid = m.params.sessionId; ws.send(JSON.stringify({ id: ++id, sessionId: sid, method: 'Runtime.enable' })); }\n    if (m.sessionId && (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error'))) errors.push('WORKER ' + JSON.stringify(m.params).slice(0, 300));\n", 1)
open(p, 'w', encoding='utf8').write(s)
