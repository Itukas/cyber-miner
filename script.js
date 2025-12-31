// 游戏状态数据
let game = {
    bytes: 0,
    clickPower: 1,
    autoPower: 0,
    upgrades: {
        cursor: { count: 0, cost: 15, power: 1 },
        gpu: { count: 0, cost: 100, power: 5 },
        server: { count: 0, cost: 1000, power: 50 }
    }
};

// 各种DOM元素
const els = {
    score: document.getElementById('score'),
    clickPower: document.getElementById('click-power'),
    autoPower: document.getElementById('auto-power'),
    mineBtn: document.getElementById('mine-btn'),
    btns: {
        cursor: document.getElementById('btn-cursor'),
        gpu: document.getElementById('btn-gpu'),
        server: document.getElementById('btn-server')
    }
};

// --- 初始化 ---
function init() {
    loadGame();
    updateUI();
    // 启动自动挂机循环（每秒执行一次）
    setInterval(() => {
        game.bytes += game.autoPower;
        updateUI();
        saveGame(); // 自动存档
    }, 1000);

    // 绑定点击事件
    els.mineBtn.addEventListener('click', () => {
        game.bytes += game.clickPower;
        updateUI(); // 点击需要即时反馈
        playAnim(); // 简单的动画效果
    });
}

// --- 核心逻辑 ---

// 购买升级
window.buyUpgrade = function(type) {
    const item = game.upgrades[type];
    if (game.bytes >= item.cost) {
        game.bytes -= item.cost;
        item.count++;

        // 增加能力
        if (type === 'cursor') {
            game.clickPower += item.power;
        } else {
            game.autoPower += item.power;
        }

        // 价格上涨算法 (每次由原来的1.5倍)
        item.cost = Math.ceil(item.cost * 1.5);

        updateUI();
        saveGame();
    }
};

// 更新界面显示
function updateUI() {
    els.score.innerText = Math.floor(game.bytes);
    els.clickPower.innerText = game.clickPower;
    els.autoPower.innerText = game.autoPower;

    // 更新商店按钮状态（钱够了变绿，不够是灰的）
    for (let type in game.upgrades) {
        const item = game.upgrades[type];
        const btn = els.btns[type];
        btn.innerText = `${item.cost} Bytes`;

        if (game.bytes >= item.cost) {
            btn.classList.add('can-buy');
        } else {
            btn.classList.remove('can-buy');
        }
    }
}

// 简单的点击震动效果
function playAnim() {
    els.mineBtn.style.transform = 'scale(0.95)';
    setTimeout(() => els.mineBtn.style.transform = 'scale(1)', 50);
}

// --- 存档系统 ---

function saveGame() {
    localStorage.setItem('CyberMinerSave', JSON.stringify(game));
    document.getElementById('save-status').innerText = '已自动存档';
    setTimeout(() => document.getElementById('save-status').innerText = '', 2000);
}

function loadGame() {
    const save = localStorage.getItem('CyberMinerSave');
    if (save) {
        // 合并存档，防止版本更新导致旧存档缺少字段
        const savedGame = JSON.parse(save);
        game = { ...game, ...savedGame };
        // 重新计算upgrades里面的对象，因为合并可能丢失深层结构，这里简单处理：
        // 如果存档结构复杂，建议使用递归合并。对于本游戏，直接读取数值即可。
    }
}

// 重置游戏
window.resetGame = function() {
    if(confirm('确定要删除存档从头开始吗？')) {
        localStorage.removeItem('CyberMinerSave');
        location.reload();
    }
}

// 启动
init();