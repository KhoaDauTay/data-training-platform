import { DbClient } from './db/client';

const out = document.getElementById('out')!;
const log = (s: string) => { out.textContent += `
${s}`; };
const db = new DbClient((s, m) => log(`status: ${s}${m ? ` ${m}` : ''}`));

(async () => {
  log(`count: ${JSON.stringify((await db.run('SELECT count(*) FROM shipments')).rows)}`);
  try {
    // CPU-bound (400 triệu dòng), không phải pg_sleep: kiểm terminate() khi worker đang bận tính toán.
    await db.run('SELECT count(*) FROM shipments a, shipments b');
    log('LỖI: query nặng không bị dừng');
  } catch (e) {
    log(`timeout: ${(e as Error).message}`);
  }
  log(`after restart: ${JSON.stringify((await db.run('SELECT 42')).rows)}`);
  log('DONE');
})();
