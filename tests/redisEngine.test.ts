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
    expect(format(new RedisSim().exec('GET "x'))).toBe('Invalid argument(s)');
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
    expect(r('PTTL session')).toBe('(integer) 0'); // db.c keyIsExpired: now > when, so the key still lives at its expiry
    db.advance(1);
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
    db.advance(101);
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
    expect(r('HKEYS user:1')).toBe('1) "name"\n2) "city"\n3) "visits"');
    expect(r('HVALS user:1')).toBe('1) "Boon"\n2) "Da Nang"\n3) "5"');
    expect(r('HLEN user:1')).toBe('(integer) 3');
    expect(r('HEXISTS user:1 city')).toBe('(integer) 1');
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
    expect(r('LPOP queue 1 2')).toBe("(error) ERR wrong number of arguments for 'lpop' command");
    expect(r('LPOP queue x')).toBe('(error) ERR value is not an integer or out of range');
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
    expect(r('ZREM board new nope')).toBe('(integer) 1');
    expect(r('ZCARD board')).toBe('(integer) 3');
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
    expect(r('MULTI')).toBe('(error) ERR Command not allowed inside a transaction'); // Valkey 8.1: NO_MULTI flag
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
    r('WATCH stock');
    expect(r('UNWATCH')).toBe('OK');
    r('SET stock 9', 1);
    r('MULTI');
    r('GET stock');
    expect(r('EXEC')).toBe('1) "9"');
    expect(r('FLUSHALL')).toBe('OK');
    expect(r('DBSIZE')).toBe('(integer) 0');
  });
  it('WATCH also aborts when the watched key expires', () => {
    const { db, r } = fresh();
    r('SET seat A EX 5');
    r('WATCH seat');
    r('MULTI');
    r('GET seat');
    db.advance(5_001);
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

describe('v47 R1: checked against the Valkey 8.1 source (commit 38316e6c)', () => {
  it('server.c: unknown command and arity come before the subscribe-mode refusal; NO_MULTI dooms the EXEC', () => {
    const { r } = fresh();
    r('SUBSCRIBE news', 1);
    expect(r('FOO x', 1)).toBe("(error) ERR unknown command 'FOO', with args beginning with: 'x' ");
    expect(r('GET', 1)).toBe("(error) ERR wrong number of arguments for 'get' command");
    r('MULTI');
    expect(r('WATCH k')).toBe('(error) ERR Command not allowed inside a transaction');
    r('SET k 1');
    expect(r('EXEC')).toBe('(error) EXECABORT Transaction discarded because of previous errors.');
    expect(r('GET k')).toBe('(nil)');
  });
  it('expire.c: EXPIRE NX/XX/GT/LT, option errors before the number, a past time deletes', () => {
    const { r } = fresh();
    r('SET rl 1');
    expect(r('EXPIRE rl 60 XX')).toBe('(integer) 0');
    expect(r('EXPIRE rl 60 NX')).toBe('(integer) 1');
    expect(r('EXPIRE rl 90 NX')).toBe('(integer) 0');
    expect(r('EXPIRE rl 30 GT')).toBe('(integer) 0');
    expect(r('EXPIRE rl 90 GT')).toBe('(integer) 1');
    expect(r('EXPIRE rl 10 LT')).toBe('(integer) 1');
    expect(r('TTL rl')).toBe('(integer) 10');
    expect(r('EXPIRE rl abc FOO')).toBe('(error) ERR Unsupported option FOO');
    expect(r('EXPIRE rl 5 NX XX')).toBe('(error) ERR NX and XX, GT or LT options at the same time are not compatible');
    expect(r('EXPIRE rl 5 GT LT')).toBe('(error) ERR GT and LT options at the same time are not compatible');
    expect(r('EXPIRE rl -1')).toBe('(integer) 1');
    expect(r('EXISTS rl')).toBe('(integer) 0');
  });
  it('t_zset.c: pair count before NX+XX, GT/LT update only upward/downward, ZRANGE REV, d2string -0', () => {
    const { r } = fresh();
    expect(r('ZADD b NX XX 1')).toBe('(error) ERR syntax error');
    expect(r('ZADD b GT NX 1 m')).toBe('(error) ERR GT, LT, and/or NX options at the same time are not compatible');
    r('ZADD best 50 lily');
    expect(r('ZADD best GT 40 lily 70 boon')).toBe('(integer) 1');
    expect(r('ZADD best GT CH 60 lily')).toBe('(integer) 1');
    expect(r('ZADD best LT 99 lily')).toBe('(integer) 0');
    expect(r('ZRANGE best 0 0 REV WITHSCORES')).toBe('1) "boon"\n2) "70"');
    expect(r('ZREVRANGE best 0 0 REV')).toBe('(error) ERR syntax error');
    r('ZADD z -0 a');
    expect(r('ZSCORE z a')).toBe('"-0"');
  });
  it('t_list.c: LPOP with count 0 is an empty array, a negative count is refused', () => {
    const { r } = fresh();
    r('RPUSH q a');
    expect(r('LPOP q 0')).toBe('(empty array)');
    expect(r('LPOP q -1')).toBe('(error) ERR value is out of range, must be positive');
    expect(r('LPOP nope 2')).toBe('(nil)');
  });
});
describe('v48 E1: checked against the Valkey 8.1 source (commit 38316e6c)', () => {
  it('server.c commandCheckExistence: unknown subcommand, container arity, subcommand arity', () => {
    const { r } = fresh();
    expect(r('XGROUP')).toBe("(error) ERR wrong number of arguments for 'xgroup' command");
    expect(r('XGROUP FOO k g')).toBe("(error) ERR unknown subcommand 'FOO'. Try XGROUP HELP.");
    expect(r('object encoding')).toBe("(error) ERR wrong number of arguments for 'object|encoding' command");
    expect(r('XGROUP CREATE s g $ BAD')).toBe("(error) ERR unknown subcommand or wrong number of arguments for 'CREATE'. Try XGROUP HELP.");
  });
  it('t_stream.c xreadCommand: STREAMS is required, COUNT 0 = no limit, > only for groups', () => {
    const { db, r } = fresh();
    const t = db.now;
    r('XADD s * a 1');
    r('XADD s * a 2');
    expect(r('XREAD COUNT 1 BLOCK 0')).toBe('(error) ERR syntax error');
    expect(r('XREAD COUNT 0 STREAMS s 0').split('\n').filter((l) => l.includes(`"${t}-`)).length).toBe(2);
    expect(r('XREAD STREAMS s >')).toBe('(error) ERR The > ID can be specified only when calling XREADGROUP using the GROUP <group> <consumer> option.');
    expect(r('XREAD GROUP g c STREAMS s 0')).toBe('(error) ERR The GROUP option is only supported by XREADGROUP. You called XREAD instead.');
    expect(r('XREADGROUP COUNT 1 NOACK STREAMS s >')).toBe('(error) ERR Missing GROUP option for XREADGROUP');
    expect(r('XREADGROUP GROUP g c STREAMS s')).toBe("(error) ERR wrong number of arguments for 'xreadgroup' command");
    expect(r('XREADGROUP GROUP g c STREAMS s x >')).toBe("(error) ERR Unbalanced 'xreadgroup' list of streams: for each stream key an ID or '>' must be specified.");
    expect(r('XRANGE s - + COUNT 0')).toBe('(nil)');
    expect(r('XRANGE nope - + COUNT 0')).toBe('(empty array)');
  });
  it('consumer groups: XGROUP CREATE, XREADGROUP >, history, XACK, XPENDING (summary counts are bulk strings)', () => {
    const { db, r } = fresh();
    const t = db.now;
    expect(r('XGROUP CREATE s g $')).toBe('(error) ERR The XGROUP subcommand requires the key to exist. Note that for CREATE you may want to use the MKSTREAM option to create an empty stream automatically.');
    expect(r('XGROUP CREATE s g $ MKSTREAM')).toBe('OK');
    expect(r('XGROUP CREATE s g $')).toBe('(error) BUSYGROUP Consumer Group name already exists');
    expect(r('XREADGROUP GROUP nope c STREAMS s >')).toBe("(error) NOGROUP No such key 's' or consumer group 'nope' in XREADGROUP with GROUP option");
    expect(r('XREADGROUP GROUP g c STREAMS s $')).toMatch(/^\(error\) ERR The \$ ID is meaningless in the context of XREADGROUP/);
    expect(r('XPENDING s g')).toBe('1) (integer) 0\n2) (nil)\n3) (nil)\n4) (nil)');
    r('XADD s * o 1');
    r('XADD s * o 2');
    expect(r('XREADGROUP GROUP g c1 COUNT 1 STREAMS s >')).toBe(`1) 1) "s"\n   2) 1) 1) "${t}-0"\n         2) 1) "o"\n            2) "1"`);
    expect(r('XREADGROUP GROUP g c2 STREAMS s >').includes(`"${t}-1"`)).toBe(true);
    expect(r('XREADGROUP GROUP g c3 STREAMS s >')).toBe('(nil)');
    expect(r('XREADGROUP GROUP g c3 STREAMS s 0')).toBe('1) 1) "s"\n   2) (empty array)');
    expect(r('XPENDING s g')).toBe(`1) (integer) 2\n2) "${t}-0"\n3) "${t}-1"\n4) 1) 1) "c1"\n      2) "1"\n   2) 1) "c2"\n      2) "1"`);
    db.advance(5000);
    expect(r('XREADGROUP GROUP g c1 STREAMS s 0').includes(`"${t}-0"`)).toBe(true);
    expect(r('XPENDING s g - + 10')).toBe(`1) 1) "${t}-0"\n   2) "c1"\n   3) (integer) 0\n   4) (integer) 2\n2) 1) "${t}-1"\n   2) "c2"\n   3) (integer) 5000\n   4) (integer) 1`);
    expect(r('XPENDING s g IDLE 1000 - + 10 c2').includes('"c2"')).toBe(true);
    expect(r('XPENDING s g - + 10 nobody')).toBe('(empty array)');
    expect(r(`XACK s g ${t}-0 ${t}-9`)).toBe('(integer) 1');
    expect(r('XACK s nope 1-0')).toBe('(integer) 0');
    expect(r('XACK s g bad')).toBe('(error) ERR Invalid stream ID specified as stream command argument');
  });
  it('XCLAIM and XAUTOCLAIM move idle entries and count deliveries; JUSTID does not count', () => {
    const { db, r } = fresh();
    const t = db.now;
    r('XGROUP CREATE s g 0 MKSTREAM');
    r('XADD s * o 1');
    r('XADD s * o 2');
    r('XREADGROUP GROUP g w1 STREAMS s >');
    db.advance(60000);
    expect(r(`XCLAIM s g w2 120000 ${t}-0`)).toBe('(empty array)');
    expect(r(`XCLAIM s g w2 30000 ${t}-0 JUSTID`)).toBe(`1) "${t}-0"`);
    expect(r(`XCLAIM s g w2 0 ${t}-0 FOO`)).toBe("(error) ERR Unrecognized XCLAIM option 'FOO'");
    expect(r('XCLAIM s g w2 x 1-0')).toBe('(error) ERR Invalid min-idle-time argument for XCLAIM');
    expect(r('XAUTOCLAIM s g w3 30000 0-0 COUNT 1')).toBe(`1) "0-0"\n2) 1) 1) "${t}-1"\n      2) 1) "o"\n         2) "2"\n3) (empty array)`);
    expect(r('XPENDING s g - + 10')).toBe(`1) 1) "${t}-0"\n   2) "w2"\n   3) (integer) 0\n   4) (integer) 1\n2) 1) "${t}-1"\n   2) "w3"\n   3) (integer) 0\n   4) (integer) 2`);
    expect(r('XAUTOCLAIM s g w3 0 0-0 COUNT 0')).toBe('(error) ERR COUNT must be > 0');
    expect(r('XCLAIM nope g w 0 1-0')).toBe("(error) NOGROUP No such key 'nope' or consumer group 'g'");
  });
  it('XADD/XTRIM MAXLEN: exact trims entries, ~ only whole 100-entry nodes', () => {
    const { r } = fresh();
    for (let i = 1; i <= 150; i++) r(`XADD s ${i}-0 n ${i}`);
    expect(r('XTRIM s MAXLEN ~ 100')).toBe('(integer) 0');
    expect(r('XTRIM s MAXLEN ~ 50')).toBe('(integer) 100');
    expect(r('XADD s MAXLEN 3 * n x').startsWith('"')).toBe(true);
    expect(r('XLEN s')).toBe('(integer) 3');
    expect(r('XTRIM s LIMIT 5')).toBe('(error) ERR syntax error, LIMIT cannot be used without specifying a trimming strategy');
    expect(r('XTRIM s MAXLEN 1 LIMIT 5')).toBe('(error) ERR syntax error, LIMIT cannot be used without the special ~ option');
    expect(r('XTRIM s MAXLEN -1')).toBe('(error) ERR The MAXLEN argument must be >= 0.');
  });
  it('pub/sub: pushes() hands each subscriber its messages; PUBSUB NUMSUB/CHANNELS', () => {
    const { db, r } = fresh();
    r('SUBSCRIBE orders', 1);
    r('SUBSCRIBE orders', 2);
    expect(r('PUBLISH orders o9')).toBe('(integer) 2');
    expect(db.pushes().map(([c, m]) => [c, format(m)])).toEqual([[1, '1) "message"\n2) "orders"\n3) "o9"'], [2, '1) "message"\n2) "orders"\n3) "o9"']]);
    expect(r('PUBSUB NUMSUB orders none')).toBe('1) "orders"\n2) (integer) 2\n3) "none"\n4) (integer) 0');
    expect(r('PUBSUB CHANNELS')).toBe('1) "orders"');
  });
  it('maxmemory: noeviction answers OOM to writes only; allkeys-lru evicts the longest idle key before the command', () => {
    const { db, r } = fresh();
    expect(r('CONFIG SET maxmemory-policy fifo')).toBe("(error) ERR CONFIG SET failed (possibly related to argument 'maxmemory-policy') - argument(s) must be one of the following: volatile-lru, volatile-lfu, volatile-random, volatile-ttl, allkeys-lru, allkeys-lfu, allkeys-random, noeviction");
    expect(r('CONFIG SET maxmemory lots')).toBe("(error) ERR CONFIG SET failed (possibly related to argument 'maxmemory') - argument must be a memory value");
    expect(r('CONFIG SET nope 1')).toBe("(error) ERR Unknown option or number of arguments for CONFIG SET - 'nope'");
    expect(r('CONFIG SET lfu-log-factor x')).toBe("(error) ERR CONFIG SET failed (possibly related to argument 'lfu-log-factor') - argument couldn't be parsed into an integer");
    expect(r('CONFIG SET maxmemory')).toBe("(error) ERR wrong number of arguments for 'config|set' command");
    r('SET a 1');
    db.advance(1000);
    r('SET b 2');
    db.advance(1000);
    r('SET c 3');
    const one = db.usage('a')!;
    expect(r(`CONFIG SET maxmemory ${one * 3}`)).toBe('OK');
    expect(r('CONFIG GET maxmemory')).toBe(`1) "maxmemory"\n2) "${one * 3}"`);
    r('SET d 4');
    expect(r('SET e 5')).toBe("(error) OOM command not allowed when used memory > 'maxmemory'.");
    expect(r('GET a')).toBe('"1"');
    expect(r('DEL d')).toBe('(integer) 1');
    r('SET d 4');
    r('CONFIG SET maxmemory-policy allkeys-lru');
    // b (idle since 1 s) goes before the next command runs, whatever that command is
    expect(r('EXISTS b')).toBe('(integer) 0');
    expect(r('OBJECT IDLETIME c')).toBe('(integer) 0');
    expect(r('KEYS *').split('\n').length).toBe(3);
    expect(r('OBJECT FREQ a')).toMatch(/An LFU maxmemory policy is not selected/);
  });
  it('LFU: new keys start at 5, +1 per access with lfu-log-factor 0, minus one per decay minute; volatile-ttl', () => {
    const { db, r } = fresh();
    r('CONFIG SET maxmemory-policy allkeys-lfu lfu-log-factor 0');
    r('SET hot x');
    expect(r('OBJECT FREQ hot')).toBe('(integer) 5');
    r('GET hot');
    r('GET hot');
    expect(r('OBJECT FREQ hot')).toBe('(integer) 7');
    expect(r('TYPE hot') + r('EXISTS hot') + r('TTL hot')).toBe('string(integer) 1(integer) -1');
    expect(r('OBJECT FREQ hot')).toBe('(integer) 7');
    db.advance(3 * 60000);
    expect(r('OBJECT FREQ hot')).toBe('(integer) 4');
    expect(r('OBJECT IDLETIME hot')).toMatch(/An LFU maxmemory policy is selected/);
    const v = fresh();
    v.r('SET s1 a EX 50');
    v.r('SET s2 b EX 10');
    v.r('SET keep c');
    v.r(`CONFIG SET maxmemory ${v.db.usage('keep')! * 2} maxmemory-policy volatile-ttl`);
    expect(v.r('PING')).toBe('PONG');
    expect(v.r('EXISTS s2') + v.r('EXISTS s1')).toBe('(integer) 0(integer) 1');
  });
  it('OBJECT ENCODING follows valkey.conf limits and never shrinks back', () => {
    const { r } = fresh();
    r('SET n 123');
    r('SET s hello');
    r(`SET big ${'x'.repeat(45)}`);
    expect([r('OBJECT ENCODING n'), r('OBJECT ENCODING s'), r('OBJECT ENCODING big')]).toEqual(['"int"', '"embstr"', '"raw"']);
    r('APPEND s !');
    expect(r('OBJECT ENCODING s')).toBe('"raw"');
    r('SADD ids 1 2 3');
    expect(r('OBJECT ENCODING ids')).toBe('"intset"');
    r('SADD ids x');
    expect(r('OBJECT ENCODING ids')).toBe('"listpack"');
    r('SREM ids x');
    expect(r('OBJECT ENCODING ids')).toBe('"listpack"');
    r(`HSET h f ${'v'.repeat(65)}`);
    expect(r('OBJECT ENCODING h')).toBe('"hashtable"');
    r('HSET h2 f v');
    expect(r('OBJECT ENCODING h2')).toBe('"listpack"');
    expect(r('OBJECT ENCODING nope')).toBe('(nil)');
    expect(r('MEMORY USAGE nope')).toBe('(nil)');
  });
  it('cluster.c: CLUSTER KEYSLOT (redis.io examples), hash tags, CROSSSLOT; EXEC across slots is discarded', () => {
    const { db, r } = fresh();
    expect(r('CLUSTER KEYSLOT somekey')).toBe('(error) ERR This instance has cluster support disabled');
    db.cluster = true;
    expect(r('CLUSTER KEYSLOT somekey')).toBe('(integer) 11058');
    expect(r('CLUSTER KEYSLOT foo{hash_tag}')).toBe('(integer) 2515');
    expect(r('CLUSTER KEYSLOT bar{hash_tag}')).toBe('(integer) 2515');
    expect(r('CLUSTER KEYSLOT a{}b')).not.toBe(r('CLUSTER KEYSLOT b{}a'));
    expect(r('MSET a 1 b 2')).toBe("(error) CROSSSLOT Keys in request don't hash to the same slot");
    expect(r('MSET {u7}:a 1 {u7}:b 2')).toBe('OK');
    expect(r('CLUSTER COUNTKEYSINSLOT 99999')).toBe('(error) ERR Invalid slot');
    r('MULTI');
    r('SET a 1');
    expect(r('SET b 1')).toBe('QUEUED');
    expect(r('EXEC')).toBe("(error) CROSSSLOT Keys in request don't hash to the same slot");
    expect(r('EXEC')).toBe('(error) ERR EXEC without MULTI');
    expect(r('GET a')).toBe('(nil)');
  });
  it('ZUNIONSTORE (WEIGHTS, AGGREGATE, sets score 1), ZCOUNT, ZREMRANGEBYSCORE/BYRANK, TIME', () => {
    const { r } = fresh();
    r('ZADD d1 10 a 5 b');
    r('ZADD d2 3 a 7 c');
    r('SADD vip a');
    expect(r('ZUNIONSTORE w 3 d1 d2 vip')).toBe('(integer) 3');
    expect(r('ZRANGE w 0 -1 WITHSCORES')).toBe('1) "b"\n2) "5"\n3) "c"\n4) "7"\n5) "a"\n6) "14"');
    expect(r('ZUNIONSTORE w 2 d1 d2 WEIGHTS 1 2 AGGREGATE MAX')).toBe('(integer) 3');
    expect(r('ZSCORE w c')).toBe('"14"');
    expect(r('ZUNIONSTORE w 0 d1')).toBe("(error) ERR at least 1 input key is needed for 'zunionstore' command");
    expect(r('ZUNIONSTORE w 3 d1')).toBe('(error) ERR syntax error');
    expect(r('ZCOUNT w (5 +inf')).toBe('(integer) 2');
    expect(r('ZREMRANGEBYSCORE w -inf 5')).toBe('(integer) 1');
    expect(r('ZREMRANGEBYRANK w 0 0')).toBe('(integer) 1');
    expect(r('ZCARD w')).toBe('(integer) 1');
    expect(r('ZCOUNT w x 1')).toBe('(error) ERR min or max is not a float');
    expect(r('TIME')).toBe(`1) "${Date.UTC(2026, 9, 31) / 1000}"\n2) "0"`);
  });
  it('SCAN pages with a cursor: COUNT keys examined per call, MATCH filters after, 0 = done', () => {
    const { r } = fresh();
    for (let i = 0; i < 25; i++) r(`SET k${i} ${i}`);
    const p1 = r('SCAN 0');
    expect(p1.startsWith('1) "10"')).toBe(true);
    expect(p1.split('\n').length).toBe(11);
    expect(r('SCAN 10 COUNT 100').startsWith('1) "0"')).toBe(true);
    expect(r('SCAN 0 MATCH k2*').split('\n')[0]).toBe('1) "10"');
    expect(r('SCAN -1')).toBe('(error) ERR invalid cursor');
  });
});