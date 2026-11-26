import { describe, expect, it } from 'vitest';
import { format, RedisSim } from '../src/engine/redis/interpreter';
import { parseLine } from '../src/engine/redis/parse';

/** v47 spike: replies are checked as redis-cli prints them. */
const cli = (db: RedisSim) => (line: string, client = 0) => format(db.exec(line, client));
const fresh = () => { const db = new RedisSim(); return { db, r: cli(db) }; };

describe('parseLine (redis-cli quoting)', () => {
  it('splits, quotes and escapes', () => {
    expect(parseLine('  SET  k  v ')).toEqual(['SET', 'k', 'v']);
    expect(parseLine('SET k "hello world"')).toEqual(['SET', 'k', 'hello world']);
    expect(parseLine('SET k "a\\nb\\x41\\""')).toEqual(['SET', 'k', 'a\nbA"']);
    expect(parseLine("SET k 'it\\'s \\n'")).toEqual(['SET', 'k', "it's \\n"]);
    expect(parseLine('SET k ""')).toEqual(['SET', 'k', '']);
    expect(parseLine('')).toEqual([]);
  });
  it('refuses unbalanced quotes and a quote glued to text', () => {
    expect(parseLine('SET k "abc')).toBeNull();
    expect(parseLine('SET k "a"b')).toBeNull();
    expect(format(new RedisSim().exec('GET "x'))).toBe('(error) Invalid argument(s)');
  });
});

describe('strings', () => {
  it('GET/SET/APPEND/STRLEN/MGET/MSET', () => {
    const { r } = fresh();
    expect(r('GET nope')).toBe('(nil)');
    expect(r('SET greeting "hello world"')).toBe('OK');
    expect(r('get greeting')).toBe('"hello world"');
    expect(r('APPEND greeting !')).toBe('(integer) 12');
    expect(r('STRLEN greeting')).toBe('(integer) 12');
    expect(r('MSET a 1 b 2')).toBe('OK');
    expect(r('MGET a nope b')).toBe('1) "1"\n2) (nil)\n3) "2"');
    expect(r('MSET a')).toBe("(error) ERR wrong number of arguments for 'mset' command");
  });
  it('SET NX/XX/GET and errors', () => {
    const { r } = fresh();
    expect(r('SET lock me NX')).toBe('OK');
    expect(r('SET lock you NX')).toBe('(nil)');
    expect(r('SET other x XX')).toBe('(nil)');
    expect(r('SET lock them XX GET')).toBe('"me"');
    expect(r('SET k v NX XX')).toBe('(error) ERR syntax error');
    expect(r('SET k v EX 0')).toBe("(error) ERR invalid expire time in 'set' command");
    expect(r('SET k v EX abc')).toBe('(error) ERR value is not an integer or out of range');
  });
  it('INCR/INCRBY/DECR/DECRBY', () => {
    const { r } = fresh();
    expect(r('INCR views')).toBe('(integer) 1');
    expect(r('INCRBY views 10')).toBe('(integer) 11');
    expect(r('DECR views')).toBe('(integer) 10');
    expect(r('DECRBY views 3')).toBe('(integer) 7');
    expect(r('SET name boon')).toBe('OK');
    expect(r('INCR name')).toBe('(error) ERR value is not an integer or out of range');
    expect(r('SET big 9223372036854775807')).toBe('OK');
    expect(r('INCR big')).toBe('(error) ERR increment or decrement would overflow');
  });
  it('escapes like redis-cli', () => {
    const { r } = fresh();
    r('SET k "tab\\there"');
    expect(r('GET k')).toBe('"tab\\there"');
    r('SET vi "cà"');
    expect(r('GET vi')).toBe('"c\\xc3\\xa0"');
  });
});

describe('keys and the virtual clock', () => {
  it('EXPIRE/TTL/PTTL/PERSIST follow the clock, expiry is lazy', () => {
    const { db, r } = fresh();
    r('SET session abc');
    expect(r('TTL session')).toBe('(integer) -1');
    expect(r('TTL nope')).toBe('(integer) -2');
    expect(r('EXPIRE session 10')).toBe('(integer) 1');
    db.advance(3_400);
    expect(r('TTL session')).toBe('(integer) 7');
    expect(r('PTTL session')).toBe('(integer) 6600');
    db.advance(6_600);
    expect(r('GET session')).toBe('(nil)');
    expect(r('TTL session')).toBe('(integer) -2');
    expect(r('EXISTS session')).toBe('(integer) 0');
    r('SET code 42 EX 60');
    expect(r('PERSIST code')).toBe('(integer) 1');
    expect(r('PERSIST code')).toBe('(integer) 0');
    db.advance(120_000);
    expect(r('GET code')).toBe('"42"');
  });
  it('SET clears the TTL, INCR and KEEPTTL keep it', () => {
    const { db, r } = fresh();
    r('SET hits 1 PX 5000');
    r('INCR hits');
    expect(r('PTTL hits')).toBe('(integer) 5000');
    r('SET hits 9 KEEPTTL');
    expect(r('PTTL hits')).toBe('(integer) 5000');
    r('SET hits 0');
    expect(r('TTL hits')).toBe('(integer) -1');
    r('PEXPIRE hits 100');
    db.advance(100);
    expect(r('DBSIZE')).toBe('(integer) 0');
  });
  it('DEL/EXISTS/TYPE/KEYS/SCAN MATCH', () => {
    const { r } = fresh();
    r('MSET user:1 a user:2 b order:1 c');
    r('HSET user:9 name lily');
    expect(r('EXISTS user:1 user:1 nope')).toBe('(integer) 2');
    expect(r('TYPE user:9')).toBe('hash');
    expect(r('TYPE nope')).toBe('none');
    expect(r('KEYS user:?')).toBe('1) "user:1"\n2) "user:2"\n3) "user:9"');
    expect(r('KEYS user:[12]')).toBe('1) "user:1"\n2) "user:2"');
    expect(r('SCAN 0 MATCH user:* TYPE hash')).toBe('1) "0"\n2) 1) "user:9"');
    expect(r('DEL user:1 nope order:1')).toBe('(integer) 2');
    expect(r('KEYS *')).toBe('1) "user:2"\n2) "user:9"');
  });
});

describe('hashes', () => {
  it('HSET/HGET/HGETALL/HINCRBY/HDEL', () => {
    const { r } = fresh();
    expect(r('HSET user:1 name Lily city "Da Nang"')).toBe('(integer) 2');
    expect(r('HSET user:1 name Boon')).toBe('(integer) 0');
    expect(r('HGET user:1 name')).toBe('"Boon"');
    expect(r('HGETALL user:1')).toBe('1) "name"\n2) "Boon"\n3) "city"\n4) "Da Nang"');
    expect(r('HINCRBY user:1 visits 5')).toBe('(integer) 5');
    expect(r('HINCRBY user:1 name 1')).toBe('(error) ERR hash value is not an integer');
    expect(r('HDEL user:1 name city visits nope')).toBe('(integer) 3');
    expect(r('EXISTS user:1')).toBe('(integer) 0');
    expect(r('HGETALL user:1')).toBe('(empty array)');
    expect(r('HSET user:1 name')).toBe("(error) ERR wrong number of arguments for 'hset' command");
  });
});

describe('lists', () => {
  it('LPUSH/RPUSH/LPOP/RPOP/LRANGE/LLEN', () => {
    const { r } = fresh();
    expect(r('RPUSH queue a b c')).toBe('(integer) 3');
    expect(r('LPUSH queue z y')).toBe('(integer) 5');
    expect(r('LRANGE queue 0 -1')).toBe('1) "y"\n2) "z"\n3) "a"\n4) "b"\n5) "c"');
    expect(r('LRANGE queue -2 100')).toBe('1) "b"\n2) "c"');
    expect(r('LRANGE queue 5 9')).toBe('(empty array)');
    expect(r('LPOP queue')).toBe('"y"');
    expect(r('RPOP queue 2')).toBe('1) "c"\n2) "b"');
    expect(r('LLEN queue')).toBe('(integer) 2');
    expect(r('LPOP nope')).toBe('(nil)');
    r('SET s x');
    expect(r('LPUSH s y')).toBe('(error) WRONGTYPE Operation against a key holding the wrong kind of value');
  });
});

describe('sets', () => {
  it('SADD/SREM/SMEMBERS/SISMEMBER/SINTER/SUNION', () => {
    const { r } = fresh();
    expect(r('SADD tags:a sql redis sql')).toBe('(integer) 2');
    r('SADD tags:b redis mongo');
    expect(r('SISMEMBER tags:a sql')).toBe('(integer) 1');
    expect(r('SINTER tags:a tags:b')).toBe('1) "redis"');
    expect(r('SUNION tags:a tags:b')).toBe('1) "sql"\n2) "redis"\n3) "mongo"');
    expect(r('SINTER tags:a nope')).toBe('(empty array)');
    expect(r('SREM tags:a sql nope')).toBe('(integer) 1');
    expect(r('SMEMBERS tags:a')).toBe('1) "redis"');
    expect(r('SCARD tags:b')).toBe('(integer) 2');
  });
});

describe('sorted sets', () => {
  it('ZADD/ZINCRBY/ZRANGE/ZREVRANGE/ZRANK/ZSCORE/ZRANGEBYSCORE', () => {
    const { r } = fresh();
    expect(r('ZADD board 10 lily 20 boon 10 ana')).toBe('(integer) 3');
    expect(r('ZRANGE board 0 -1 WITHSCORES')).toBe('1) "ana"\n2) "10"\n3) "lily"\n4) "10"\n5) "boon"\n6) "20"');
    expect(r('ZINCRBY board 15.5 lily')).toBe('"25.5"');
    expect(r('ZREVRANGE board 0 1')).toBe('1) "lily"\n2) "boon"');
    expect(r('ZRANK board lily')).toBe('(integer) 2');
    expect(r('ZREVRANK board lily')).toBe('(integer) 0');
    expect(r('ZRANK board nope')).toBe('(nil)');
    expect(r('ZSCORE board boon')).toBe('"20"');
    expect(r('ZRANGEBYSCORE board (10 +inf')).toBe('1) "boon"\n2) "lily"');
    expect(r('ZRANGEBYSCORE board -inf 20 WITHSCORES LIMIT 1 1')).toBe('1) "boon"\n2) "20"');
    expect(r('ZRANGEBYSCORE board x 1')).toBe('(error) ERR min or max is not a float');
    expect(r('ZADD board NX 99 lily 1 new')).toBe('(integer) 1');
    expect(r('ZADD board XX CH 30 boon')).toBe('(integer) 1');
    expect(r('ZADD board abc m')).toBe('(error) ERR value is not a valid float');
    expect(r('ZADD board NX XX 1 m')).toBe('(error) ERR XX and NX options at the same time are not compatible');
  });
});

describe('transactions', () => {
  it('MULTI/EXEC runs queued commands; a runtime error does not roll back', () => {
    const { r } = fresh();
    r('SET name boon');
    expect(r('MULTI')).toBe('OK');
    expect(r('INCR counter')).toBe('QUEUED');
    expect(r('INCR name')).toBe('QUEUED');
    expect(r('SET done yes')).toBe('QUEUED');
    expect(r('EXEC')).toBe('1) (integer) 1\n2) (error) ERR value is not an integer or out of range\n3) OK');
    expect(r('GET done')).toBe('"yes"');
  });
  it('a queue-time error aborts with EXECABORT; DISCARD and nesting', () => {
    const { r } = fresh();
    r('MULTI');
    expect(r('SET a')).toBe("(error) ERR wrong number of arguments for 'set' command");
    r('SET b 1');
    expect(r('EXEC')).toBe('(error) EXECABORT Transaction discarded because of previous errors.');
    expect(r('GET b')).toBe('(nil)');
    expect(r('EXEC')).toBe('(error) ERR EXEC without MULTI');
    r('MULTI');
    expect(r('MULTI')).toBe('(error) ERR MULTI calls can not be nested');
    expect(r('DISCARD')).toBe('OK');
    expect(r('FOO bar')).toBe("(error) ERR unknown command 'FOO', with args beginning with: 'bar' ");
  });
  it('WATCH: another client writing the key makes EXEC return nil', () => {
    const { r } = fresh();
    r('SET stock 5');
    expect(r('WATCH stock')).toBe('OK');
    r('MULTI');
    r('DECR stock');
    expect(r('SET stock 0', 1)).toBe('OK');
    expect(r('EXEC')).toBe('(nil)');
    expect(r('GET stock')).toBe('"0"');
    r('WATCH stock');
    r('MULTI');
    r('DECR stock');
    expect(r('EXEC')).toBe('1) (integer) -1');
  });
  it('WATCH also aborts when the watched key expires', () => {
    const { db, r } = fresh();
    r('SET seat A EX 5');
    r('WATCH seat');
    r('MULTI');
    r('GET seat');
    db.advance(5_000);
    expect(r('EXEC')).toBe('(nil)');
  });
});

describe('streams (basic)', () => {
  it('XADD ids come from the virtual clock; XRANGE/XREAD/XLEN', () => {
    const { db, r } = fresh();
    const t = db.now;
    expect(r('XADD orders * item tea qty 2')).toBe(`"${t}-0"`);
    expect(r('XADD orders * item cake qty 1')).toBe(`"${t}-1"`);
    db.advance(1);
    expect(r('XADD orders * item tea qty 1')).toBe(`"${t + 1}-0"`);
    expect(r('XLEN orders')).toBe('(integer) 3');
    expect(r('XRANGE orders - + COUNT 1')).toBe(`1) 1) "${t}-0"\n   2) 1) "item"\n      2) "tea"\n      3) "qty"\n      4) "2"`);
    expect(r(`XREAD COUNT 5 STREAMS orders ${t}-1`)).toBe(`1) 1) "orders"\n   2) 1) 1) "${t + 1}-0"\n         2) 1) "item"\n            2) "tea"\n            3) "qty"\n            4) "1"`);
    expect(r('XREAD STREAMS orders $')).toBe('(nil)');
    expect(r('XADD orders 5-0 a b')).toBe('(error) ERR The ID specified in XADD is equal or smaller than the target stream top item');
    expect(r('XADD s 0-0 a b')).toBe('(error) ERR The ID specified in XADD must be greater than 0-0');
    expect(r('XREAD STREAMS orders s 0')).toBe("(error) ERR Unbalanced 'xread' list of streams: for each stream key an ID or '$' must be specified.");
  });
});

describe('pub/sub (simulated)', () => {
  it('SUBSCRIBE, PUBLISH counts receivers, messages land in the inbox, subscribe mode refuses GET', () => {
    const { db, r } = fresh();
    expect(r('SUBSCRIBE news alerts', 1)).toBe('1) "subscribe"\n2) "news"\n3) (integer) 1\n1) "subscribe"\n2) "alerts"\n3) (integer) 2');
    expect(r('PUBLISH news hello')).toBe('(integer) 1');
    expect(r('PUBLISH sports goal')).toBe('(integer) 0');
    expect(db.messages(1).map(format)).toEqual(['1) "message"\n2) "news"\n3) "hello"']);
    expect(r('GET x', 1)).toBe("(error) ERR Can't execute 'get': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context");
    expect(r('UNSUBSCRIBE news', 1)).toBe('1) "unsubscribe"\n2) "news"\n3) (integer) 1');
  });
});

describe('format and dump', () => {
  it('pads indices of long arrays like redis-cli', () => {
    const { r } = fresh();
    r('RPUSH l 1 2 3 4 5 6 7 8 9 10');
    expect(r('LRANGE l 0 -1').split('\n').slice(8, 10)).toEqual([' 9) "9"', '10) "10"']);
    expect(r('PING')).toBe('PONG');
    expect(r('ECHO hi')).toBe('"hi"');
  });
  it('dump gives key state for write grading', () => {
    const { db, r } = fresh();
    r('SADD s b a');
    r('SET k v EX 10');
    expect(db.dump()).toEqual({ k: { type: 'string', value: 'v', pttl: 10_000 }, s: { type: 'set', value: ['a', 'b'], pttl: -1 } });
  });
});
