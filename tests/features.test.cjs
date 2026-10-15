const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function runtime() {
    const context = vm.createContext({ console, Date });
    for (const file of ['config.js', 'loot-config.js', 'features-config.js', 'enhancements.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    }
    return code => vm.runInContext(code, context);
}
test('offline income handles legacy saves, clock skew, minimum duration and eight-hour cap', () => {
    const run = runtime();
    assert.equal(run('calculateOfflineIncome(undefined, 100000, 10)'), 0);
    assert.equal(run('calculateOfflineIncome(100000, 90000, 10)'), 0);
    assert.equal(run('calculateOfflineIncome(100000, 150000, 10)'), 0);
    assert.equal(run('calculateOfflineIncome(100000, 3700000, 10)'), 18000);
    assert.equal(run('calculateOfflineIncome(100000, 90000000, 10)'), 144000);
});
test('bulk buying uses progressive rounded prices and never exceeds budget', () => {
    const run = runtime();
    run('const game = { bytes: 48, levels: {}, stats: { discount: 0 } }; purchaseAmount = 10');
    const quote = run('getPurchaseQuote({id:"test", baseCost:10, costMultiplier:1.5})');
    assert.equal(quote.count, 3);
    assert.equal(quote.cost, 47);
    run('game.bytes = 9; purchaseAmount = "max"');
    assert.equal(run('getPurchaseQuote({id:"test",baseCost:10,costMultiplier:1.5}).count'), 0);
});
test('save import accepts old saves and fractional progress, rejects malformed structures', () => {
    const run = runtime();
    run(`const sample = { bytes:100, combatLevel:1, levels:{}, inventory:[], equipped:{}, dailyQuests:{progress:{daily_bytes_10k:1.5}} }`);
    assert.equal(run('validateSave(JSON.stringify(sample)).version'), 4);
    assert.equal(run('validateSave(JSON.stringify(sample)).dailyQuests.progress.daily_bytes_10k'), 1.5);
    for (const patch of ['bytes:-1', 'inventory:{}', 'levels:{"__proto__":2,evil:2}', 'combatLevel:0', 'activeBuffs:[null]', 'skills:{skill_auto_base:100}']) {
        assert.throws(() => run(`validateSave(JSON.stringify({...sample, ${patch}}))`));
    }
    assert.throws(() => run('validateSave("not json")'));
});
test('import rebuilds equipment labels from trusted configuration', () => {
    const run = runtime();
    const name = run(`validateSave(JSON.stringify({bytes:0,combatLevel:1,levels:{},equipped:{},inventory:[{baseId:'超频芯片',name:'<img onerror=alert(1)>',rarity:'common',value:0.1,count:1}]})).inventory[0].name`);
    assert.equal(name, '超频芯片');
});
