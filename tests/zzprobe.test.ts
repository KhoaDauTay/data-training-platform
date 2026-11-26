import { it } from 'vitest';
import { runLabScript } from '../src/engine/pglab/session';
import { extensionsOf } from '../src/engine/pglab/runner';

const SETUP = `CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE staff (
  login text PRIMARY KEY,
  pw_hash text NOT NULL
);
INSERT INTO staff VALUES
  ('an', crypt('lantern-2026', gen_salt('bf', 8))),
  ('binh', crypt('hoian123', gen_salt('bf', 8))),
  ('chi', crypt('hoian123', gen_salt('bf', 8))),
  ('dung', md5('dung-pass'));
CREATE TABLE customers (
  id int PRIMARY KEY,
  name text NOT NULL,
  phone_enc bytea NOT NULL
);
INSERT INTO customers VALUES
  (1, 'Lan', pgp_sym_encrypt('0905 111 222', 'shop-key')),
  (2, 'Minh', pgp_sym_encrypt('0935 333 444', 'shop-key')),
  (3, 'Thu', pgp_sym_encrypt('0914 555 666', 'shop-key'));
CREATE TABLE uploads (
  id int PRIMARY KEY,
  file_name text NOT NULL,
  body text NOT NULL
);
INSERT INTO uploads VALUES
  (1, 'invoice-11.csv', 'id,total\n1,120\n2,80'),
  (2, 'invoice-11-copy.csv', 'id,total\n1,120\n2,80'),
  (3, 'invoice-12.csv', 'id,total\n1,95');`;
const STEPS = [
  "SELECT login, pw_hash FROM staff ORDER BY login",
  "SELECT crypt('lantern-2026', pw_hash) = pw_hash AS ok FROM staff WHERE login = 'an'",
  "SELECT login FROM staff WHERE crypt('hoian123', pw_hash) = pw_hash ORDER BY login",
  "UPDATE staff SET pw_hash = crypt('Sea-Lantern-9', gen_salt('bf', 8)) WHERE login = 'dung'",
  "SELECT login, crypt('Sea-Lantern-9', pw_hash) = pw_hash AS ok, pw_hash LIKE '$2a$08$%' AS bcrypt FROM staff WHERE login = 'dung'",
  "SELECT pgp_sym_decrypt(phone_enc, 'shop-key') AS phone FROM customers WHERE id = 2",
  "SELECT encode(digest(body, 'sha256'), 'hex') AS sha256, count(*) AS files FROM uploads GROUP BY 1 HAVING count(*) > 1",
  "SELECT file_name, left(encode(digest(body, 'sha256'), 'hex'), 12) AS sha256 FROM uploads ORDER BY id",
  "SELECT count(DISTINCT md5(pw)) AS hashes FROM (VALUES ('hoian123'), ('hoian123')) AS v(pw)",
  "SELECT count(DISTINCT crypt(pw, gen_salt('bf', 8))) AS hashes FROM (VALUES ('hoian123'), ('hoian123')) AS v(pw)",
  "SELECT length(pw_hash), left(pw_hash, 7) FROM staff WHERE login = 'an'",
  "SELECT octet_length(phone_enc) FROM customers WHERE id = 1",
  "SELECT gen_salt('bf', 3)",
  "SELECT pgp_sym_decrypt(phone_enc, 'wrong-key') FROM customers WHERE id = 2",
];

it('probe', async () => {
  const r = await runLabScript({ setup: SETUP, extensions: extensionsOf(SETUP, ...STEPS), steps: STEPS.map((s) => ({ sql: s })) });
  console.log(r.setupError, r.failedStep, r.bootMs, r.ms);
  for (const s of r.steps) console.log(s.sql.slice(0, 70), '=>', s.status, s.ms, 'ms', JSON.stringify(s.rows).slice(0, 700), s.error?.code ?? '', s.error?.message ?? '');
  const r2 = await runLabScript({ setup: SETUP, extensions: extensionsOf(SETUP), steps: ["SELECT pgp_sym_decrypt(phone_enc, 'wrong-key') FROM customers WHERE id = 2"] });
  for (const s of r2.steps) console.log(s.sql.slice(0, 70), '=>', s.status, s.error?.code ?? '', s.error?.message ?? '');
}, 300_000);
