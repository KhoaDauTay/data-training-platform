import { RedisSim, format, keySlot } from '../src/engine/redis/interpreter';
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
const L: string[] = []; const log = (...a: unknown[]) => L.push(a.join(' '));
it('probe', () => {
const db = new RedisSim();
const r = (l: string) => format(db.exec(l));
log('START', db.now);
for (const k of ['cart:{u7}','{u7}:name','{u7}:city','u7:name','u7:city','cart:{u9}','{shop}:u7','{shop}:u9','{u9}:x','{bf}:orders','stock:p07','{bf}:stock:p01']) log(k, keySlot(k));
r('HSET user:7 name Lily city DaNang'); r('SET u:8:name Boon'); r('SET u:8:city Hue'); r('HSET user:8 name Boon city Hue');
for (const k of ['user:7','u:8:name','u:8:city','user:8']) log(k, db.usage(k));
for (const k of ['page:home','page:faq','page:sale','page:new']) { r(`SET ${k} x1`); log(k, db.usage(k)); }



writeFileSync('C:/Users/KHOA~1.HUY/AppData/Local/Temp/claude/be8c95d1f89f2452/e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc/scratchpad/probe.txt', L.join('\n'));
});
