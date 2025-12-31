// --- DOM 元素引用 ---
const visualEls = {
    core: document.getElementById('data-core'),
    rippleContainer: document.getElementById('ripple-container')
};

// --- 全局游戏状态 ---
let game = {
    bytes: GameConfig.settings.initialBytes,
    clickPower: GameConfig.settings.clickBasePower,
    autoPower: 0,
    levels: {}, // 商店物品等级
    inventory: [], // 背包
    equipped: { cpu: null, ram: null, disk: null, net: null, pwr: null } // 装备槽
};

// --- 辅助函数 ---
function findItemById(id) {
    for (const cat of GameConfig.shopCategories) {
        const item = cat.items.find(i => i.id === id);
        if (item) return item;
    }
    return null;
}

function getCost(item) {
    const level = game.levels[item.id] || 0;
    return Math.floor(item.baseCost * Math.pow(item.costMultiplier, level));
}

// --- 核心算力计算 (包含商店 + 装备加成) ---
function recalcPower() {
    let baseClick = GameConfig.settings.clickBasePower;
    let baseAuto = 0;

    // 1. 计算商店购买的基础属性
    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const level = game.levels[item.id] || 0;
            const power = item.basePower * level;
            if (item.type === 'click') baseClick += power;
            if (item.type === 'auto') baseAuto += power;
        });
    });

    // 2. 计算装备加成
    let clickMult = 1; // 点击倍率
    let autoMult = 1;  // 自动倍率
    let clickFlat = 0; // 点击附加值
    let autoFlat = 0;  // 自动附加值

    for (let slot in game.equipped) {
        const item = game.equipped[slot];
        if (item) {
            if (item.type === 'clickFlat') clickFlat += item.value;
            if (item.type === 'autoFlat') autoFlat += item.value;
            if (item.type === 'clickPct') clickMult += item.value;
            if (item.type === 'autoPct') autoMult += item.value;
        }
    }

    // 3. 最终公式
    game.clickPower = Math.floor((baseClick + clickFlat) * clickMult);
    game.autoPower = Math.floor((baseAuto + autoFlat) * autoMult);

    // 4. 更新核心外观 (视觉进化)
    updateCoreVisuals();
}

// --- 掉落与背包系统 ---

// 生成随机装备
function generateLoot(source) {
    // 【修改点】调用 LootConfig.settings.maxInventory
    if (game.inventory.length >= LootConfig.settings.maxInventory) {
        showToast("背包已满，无法拾取！", "#ff4d4d");
        return;
    }

    // 随机稀有度
    const rand = Math.random();
    let rarityKey = 'common';
    let accum = 0;
    // 【修改点】调用 LootConfig.rarity
    for (let key in LootConfig.rarity) {
        accum += LootConfig.rarity[key].prob;
        if (rand <= accum) {
            rarityKey = key;
            break;
        }
    }
    const rarity = LootConfig.rarity[rarityKey];

    // 随机底材
    // 【修改点】调用 LootConfig.equipmentBase
    const baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];

    // 生成物品
    const newItem = {
        uid: Date.now() + Math.random(),
        baseId: baseItem.name,
        name: baseItem.name,
        slot: baseItem.slot,
        type: baseItem.type,
        rarity: rarityKey,
        value: baseItem.baseVal * rarity.multiplier,
        desc: baseItem.desc,
        isNew: true
    };

    game.inventory.push(newItem);
    saveGame();
    renderInventory();
    showToast(`获得: [${rarity.name}] ${newItem.name}`, rarity.color);
}

// 尝试触发掉落
function tryDrop(type) {
    // 【修改点】调用 LootConfig.settings
    const chance = type === 'click' ? LootConfig.settings.dropChanceClick : LootConfig.settings.dropChanceAuto;
    if (Math.random() < chance) {
        generateLoot(type);
    }
}

// 渲染背包和装备栏
function renderInventory() {
    const grid = document.getElementById('backpack-grid');
    if (!grid) return;

    grid.innerHTML = '';
    document.getElementById('bag-count').innerText = game.inventory.length;

    // 渲染背包物品
    game.inventory.forEach((item, index) => {
        const el = document.createElement('div');
        // 【修改点】调用 LootConfig.rarity
        const rarityCfg = LootConfig.rarity[item.rarity];

        el.className = `item border-${item.rarity}`;
        const icons = { cpu:'🧩', ram:'💾', disk:'💿', net:'📡', pwr:'🔋' };
        el.innerHTML = `${icons[item.slot] || '📦'} <span class="item-lvl">${rarityCfg.name}</span>`;

        el.onclick = () => showItemOptions(index);
        grid.appendChild(el);
    });

    // 渲染已装备槽位
    for (let slot in game.equipped) {
        const item = game.equipped[slot];
        const slotEl = document.getElementById(`slot-${slot}`);
        if (!slotEl) continue;

        if (item) {
            // 【修改点】调用 LootConfig.rarity
            const rarityCfg = LootConfig.rarity[item.rarity];
            slotEl.className = `slot border-${item.rarity}`;
            slotEl.innerHTML = `${item.name}<br><span style="color:${rarityCfg.color}">${rarityCfg.name}</span>`;
        } else {
            slotEl.className = 'slot';
            slotEl.innerHTML = slot.toUpperCase();
        }
    }
}

// 显示物品详情
function showItemOptions(index) {
    const item = game.inventory[index];
    const infoPanel = document.getElementById('item-info-panel');
    // 【修改点】调用 LootConfig.rarity
    const rarityCfg = LootConfig.rarity[item.rarity];

    let valStr = '';
    if (item.type.includes('Pct')) {
        valStr = `+${(item.value * 100).toFixed(1)}%`;
    } else {
        valStr = `+${Math.floor(item.value)}`;
    }

    const typeName = item.type.includes('click') ? '点击算力' : '自动算力';

    infoPanel.innerHTML = `
        <div style="color: ${rarityCfg.color}; font-weight:bold;">${rarityCfg.name} ${item.name}</div>
        <div>效果: ${typeName} <span style="color:#fff">${valStr}</span></div>
        <div style="margin-top:5px;">
            <button class="buy-btn" onclick="equipItem(${index})">装备</button>
            <button class="danger-btn" onclick="discardItem(${index})">丢弃</button>
        </div>
    `;
}

// 装备逻辑
window.equipItem = function(index) {
    const item = game.inventory[index];

    // 如果槽位有东西，先卸下
    if (game.equipped[item.slot]) {
        game.inventory.push(game.equipped[item.slot]);
    }

    game.equipped[item.slot] = item;
    game.inventory.splice(index, 1);

    document.getElementById('item-info-panel').innerText = "已装备";
    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
};

// 卸下逻辑
window.unequipItem = function(slot) {
    if (!game.equipped[slot]) return;

    // 【修改点】调用 LootConfig.settings.maxInventory
    if (game.inventory.length >= LootConfig.settings.maxInventory) {
        showToast("背包已满，无法卸下！", "#ff4d4d");
        return;
    }

    game.inventory.push(game.equipped[slot]);
    game.equipped[slot] = null;

    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
};

// 丢弃逻辑
window.discardItem = function(index) {
    if(confirm('确定要销毁这个装备吗？')) {
        game.inventory.splice(index, 1);
        document.getElementById('item-info-panel').innerText = "已丢弃";
        saveGame();
        renderInventory();
    }
};

// --- 渲染系统 (Render Shop) ---
function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = '';

    GameConfig.shopCategories.forEach(cat => {
        const header = document.createElement('h2');
        header.innerText = cat.title;
        header.className = 'shop-header';
        container.appendChild(header);

        const gridBox = document.createElement('div');
        gridBox.className = 'shop-grid';

        cat.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'upgrade-item card-style';
            div.id = `item-row-${item.id}`;
            div.onclick = () => buyItem(item.id);

            div.innerHTML = `
                <div class="info">
                    <h3>${item.name}</h3>
                    <p class="desc">${item.desc}</p>
                    <div class="meta-info">
                        <span id="lvl-${item.id}" class="level-tag">Lv.0</span>
                        <span class="power-desc">+${item.basePower} ${item.type === 'click' ? '👆' : '⚙️'}</span>
                    </div>
                </div>
                <button class="buy-btn" id="btn-${item.id}">...</button>
            `;
            gridBox.appendChild(div);
        });
        container.appendChild(gridBox);
    });
}

// --- 购买逻辑 ---
window.buyItem = function (id) {
    const item = findItemById(id);
    if (!item) return;

    const cost = getCost(item);
    if (game.bytes >= cost) {
        game.bytes -= cost;
        game.levels[item.id] = (game.levels[item.id] || 0) + 1;

        recalcPower();
        updateUI();
        saveGame();

        const btn = document.getElementById(`btn-${id}`);
        btn.innerText = "GET!";
        setTimeout(() => updateUI(), 300);
    }
};

// --- 视觉特效系统 ---

function updateCoreVisuals() {
    if (!visualEls.core) return;
    const p = game.clickPower;

    visualEls.core.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4');

    if (p < 50) visualEls.core.classList.add('tier-1');
    else if (p < 500) visualEls.core.classList.add('tier-2');
    else if (p < 5000) visualEls.core.classList.add('tier-3');
    else visualEls.core.classList.add('tier-4');
}

function createRipple() {
    if (!visualEls.rippleContainer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    visualEls.rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 【修改】支持传入类型的浮动文字函数
function spawnFloatingText(amount, type = 'click') {
    const container = document.getElementById('floating-text-container');
    if (!container) return;

    const el = document.createElement('div');
    // 如果是自动产出，可以加个小图标区别，比如 ⚡
    el.innerText = (type === 'auto' ? '⚡+' : '+') + Math.floor(amount);
    el.className = 'float-text';

    if (type === 'auto') {
        // 如果是自动，直接用自动的样式
        el.classList.add('float-auto');
    } else {
        // 如果是点击，才根据数值大小决定样式 (视觉变强！)
        if (amount < 10) el.classList.add('float-normal');
        else if (amount < 100) el.classList.add('float-medium');
        else if (amount < 1000) el.classList.add('float-high');
        else if (amount < 10000) el.classList.add('float-epic');
        else el.classList.add('float-legend');
    }

    // 位置计算：
    // 点击：在屏幕中心随机
    // 自动：可以让它位置稍微固定一点，或者范围大一点
    const x = window.innerWidth / 2 + (Math.random() - 0.5) * (type === 'auto' ? 200 : 100);
    const y = window.innerHeight / 2 - 100 + (Math.random() - 0.5) * 50;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    container.appendChild(el);

    // 自动产出的文字飘得慢，多留一会
    setTimeout(() => el.remove(), type === 'auto' ? 1500 : 1000);
}
function showToast(msg, color) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = color || '#fff';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- UI 更新 ---
function updateUI() {
    document.getElementById('score').innerText = Math.floor(game.bytes);
    document.getElementById('click-power').innerText = game.clickPower;
    document.getElementById('auto-power').innerText = game.autoPower;

    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const cost = getCost(item);
            const level = game.levels[item.id] || 0;
            const btn = document.getElementById(`btn-${item.id}`);
            const lvlLabel = document.getElementById(`lvl-${item.id}`);

            if (btn && btn.innerText !== "GET!") {
                btn.innerText = `${cost} B`;
            }
            if (lvlLabel) lvlLabel.innerText = `(Lv.${level})`;

            if (btn) {
                if (game.bytes >= cost) btn.classList.add('can-buy');
                else btn.classList.remove('can-buy');
            }
        });
    });
}

// --- 存档与初始化 ---
function saveGame() {
    localStorage.setItem('CyberMinerSave_v2', JSON.stringify({
        bytes: game.bytes,
        levels: game.levels,
        inventory: game.inventory,
        equipped: game.equipped
    }));
    const status = document.getElementById('save-status');
    if (status) {
        status.innerText = '已自动存档';
        setTimeout(() => status.innerText = '', 1500);
    }
}

function loadGame() {
    const save = localStorage.getItem('CyberMinerSave_v2');
    if (save) {
        const data = JSON.parse(save);
        game.bytes = data.bytes || 0;
        game.levels = data.levels || {};
        game.inventory = data.inventory || [];
        game.equipped = data.equipped || { cpu: null, ram: null, disk: null, net: null, pwr: null };
    }
    recalcPower();
    renderInventory();
}

window.resetGame = function () {
    if (confirm('确定要清空数据重来吗？')) {
        localStorage.removeItem('CyberMinerSave_v2');
        location.reload();
    }
};

// 启动引擎
function init() {
    renderShop(); // 渲染商店
    loadGame();   // 加载数据
    updateUI();   // 初始UI更新

    // 自动挂机循环
// 自动挂机循环 (在 init 函数里)
    setInterval(() => {
        if (game.autoPower > 0) {
            game.bytes += game.autoPower;
            updateUI();
            tryDrop('auto');

            // --- 【新增】自动挖矿的视觉反馈 ---

            // 1. 冒出文字 (传入 'auto' 类型)
            spawnFloatingText(game.autoPower, 'auto');

            // 2. 核心轻微跳动 (呼吸感)
            if (visualEls.core) {
                // 移除旧动画以允许重新触发
                visualEls.core.classList.remove('core-auto-pulse');
                void visualEls.core.offsetWidth; // 强制重绘
                visualEls.core.classList.add('core-auto-pulse');
            }
        }
    }, 1000);

    // 自动存档
    setInterval(saveGame, GameConfig.settings.autoSaveInterval);

    // 大按钮点击事件
    const mineBtn = document.getElementById('mine-btn');
    if (mineBtn) {
        mineBtn.addEventListener('click', () => {
            // 逻辑
            game.bytes += game.clickPower;
            updateUI();
            tryDrop('click'); // 点击也有概率掉落

            // 视觉反馈
            mineBtn.style.transform = 'scale(0.97)';
            setTimeout(() => mineBtn.style.transform = 'scale(1)', 50);

            if (visualEls.core) {
                visualEls.core.classList.remove('core-active');
                void visualEls.core.offsetWidth;
                visualEls.core.classList.add('core-active');
                setTimeout(() => visualEls.core.classList.remove('core-active'), 100);
            }

            createRipple();
            spawnFloatingText(game.clickPower);
        });
    }
}

init();