// ==========================================
// 整合版 script.js (无需模块化，直接运行)
// ==========================================

// --- 1. DOM 元素引用 ---
const visualEls = {
    core: document.getElementById('data-core'),
    rippleContainer: document.getElementById('ripple-container'),
    tooltip: document.getElementById('game-tooltip')
};

// --- 2. 全局游戏状态 ---
// 确保 GameConfig 已加载
if (typeof GameConfig === 'undefined' || typeof LootConfig === 'undefined') {
    alert("错误：配置文件未加载！请确保 config.js 和 loot-config.js 在 script.js 之前引入。");
}

let game = {
    bytes: GameConfig.settings.initialBytes,
    levels: {},
    inventory: [],
    equipped: { cpu: null, ram: null, disk: null, net: null, pwr: null },
    stats: {
        clickPower: 1, autoPower: 0,
        critChance: 0, critDamage: 1.5, discount: 0, luck: 1
    },
    flags: {
        sellMode: false, selectedIndices: []
    }
};

// --- 3. 工具函数 ---
function formatBytes(num) {
    if (num < 1000) return Math.floor(num);
    if (num < 1000000) return (num/1000).toFixed(1) + 'k';
    if (num < 1000000000) return (num/1000000).toFixed(2) + 'M';
    return (num/1000000000).toFixed(2) + 'G';
}

function findItemById(id) {
    for (const cat of GameConfig.shopCategories) {
        const item = cat.items.find(i => i.id === id);
        if (item) return item;
    }
    return null;
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

// --- 4. 核心逻辑 (Shop System) ---
function getCost(item) {
    const level = game.levels[item.id] || 0;
    const discountMult = Math.max(0.1, 1 - game.stats.discount);
    let cost = Math.floor(item.baseCost * Math.pow(item.costMultiplier, level));
    return Math.floor(cost * discountMult);
}

function recalcPower() {
    let baseClick = GameConfig.settings.clickBasePower;
    let baseAuto = 0;

    // 重置动态属性
    game.stats.critChance = 0;
    game.stats.critDamage = 1.5;
    game.stats.discount = 0;
    game.stats.luck = 1;

    // 计算商店升级加成
    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const level = game.levels[item.id] || 0;
            const power = item.basePower * level;
            if (item.type === 'click') baseClick += power;
            if (item.type === 'auto') baseAuto += power;
        });
    });

    // 计算装备加成
    let clickMult = 1, autoMult = 1, clickFlat = 0, autoFlat = 0;

    for (let slot in game.equipped) {
        const item = game.equipped[slot];
        if (item) {
            switch(item.type) {
                case 'clickFlat': clickFlat += item.value; break;
                case 'autoFlat':  autoFlat += item.value; break;
                case 'clickPct':  clickMult += item.value; break;
                case 'autoPct':   autoMult += item.value; break;
                case 'critChance': game.stats.critChance += item.value; break;
                case 'critDmg':    game.stats.critDamage += item.value; break;
                case 'discount':   game.stats.discount += item.value; break;
                case 'luck':       game.stats.luck += item.value; break;
            }
        }
    }

    // 更新最终面板
    game.stats.clickPower = Math.floor((baseClick + clickFlat) * clickMult);
    game.stats.autoPower = Math.floor((baseAuto + autoFlat) * autoMult);

    updateCoreVisuals();
}

// 购买函数
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
        if(btn) {
            btn.innerText = "GET!";
            setTimeout(() => updateUI(), 300);
        }
    }
};

// --- 5. 掉落与背包 (Inventory System) ---
function generateLoot(source) {
    const chance = (source === 'click' ? LootConfig.settings.dropChanceClick : LootConfig.settings.dropChanceAuto) * game.stats.luck;
    if (Math.random() > chance) return;

    // 随机稀有度
    const rand = Math.random();
    let rarityKey = 'common';
    let accum = 0;
    for (let key in LootConfig.rarity) {
        accum += LootConfig.rarity[key].prob;
        if (rand <= accum) { rarityKey = key; break; }
    }
    const rarity = LootConfig.rarity[rarityKey];

    // 随机底材
    const baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];

    // 堆叠检测
    const existingItem = game.inventory.find(i => i.baseId === baseItem.name && i.rarity === rarityKey);

    if (existingItem) {
        existingItem.count++;
        showToast(`获得: [${rarity.name}] ${baseItem.name} (堆叠 x${existingItem.count})`, rarity.color);
    } else {
        if (game.inventory.length >= LootConfig.settings.maxInventory) {
            showToast("背包已满，无法拾取！", "#ff4d4d");
            return;
        }
        const newItem = {
            uid: Date.now() + Math.random(),
            baseId: baseItem.name,
            name: baseItem.name,
            slot: baseItem.slot,
            type: baseItem.type,
            rarity: rarityKey,
            value: baseItem.baseVal * rarity.multiplier,
            desc: baseItem.desc,
            count: 1
        };
        game.inventory.push(newItem);
        showToast(`获得: [${rarity.name}] ${newItem.name}`, rarity.color);
    }
    saveGame();
    renderInventory();
}

function tryDrop(type) {
    generateLoot(type);
}

function getSellPrice(item) {
    const rarityCfg = LootConfig.rarity[item.rarity];
    return Math.floor(LootConfig.settings.baseSellPrice * rarityCfg.sellMult);
}

// 装备操作挂载到 window
window.equipItem = function(index) {
    const item = game.inventory[index];
    if (game.equipped[item.slot]) returnToInventory(game.equipped[item.slot]);

    if (item.count > 1) {
        item.count--;
        game.equipped[item.slot] = {...item, count: 1};
    } else {
        game.equipped[item.slot] = item;
        game.inventory.splice(index, 1);
    }

    // 刷新显示
    const panel = document.getElementById('item-info-panel');
    if(panel) panel.innerText = "已装备";

    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
};

window.unequipItem = function(slot) {
    if (!game.equipped[slot]) return;
    returnToInventory(game.equipped[slot]);
    game.equipped[slot] = null;
    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
};

function returnToInventory(item) {
    const existing = game.inventory.find(i => i.baseId === item.baseId && i.rarity === item.rarity);
    if (existing) existing.count++;
    else game.inventory.push(item);
}

window.toggleSellMode = function() {
    game.flags.sellMode = !game.flags.sellMode;
    game.flags.selectedIndices = [];
    renderInventory();

    const btn = document.getElementById('btn-multi-sell');
    if(btn) {
        btn.innerText = game.flags.sellMode ? "取消选择" : "多选出售";
        btn.classList.toggle('active-mode', game.flags.sellMode);
    }
    const actions = document.getElementById('bulk-actions');
    if(actions) actions.style.display = game.flags.sellMode ? 'flex' : 'none';
};

window.toggleSelection = function(index) {
    const pos = game.flags.selectedIndices.indexOf(index);
    if (pos >= 0) game.flags.selectedIndices.splice(pos, 1);
    else game.flags.selectedIndices.push(index);
    renderInventory();
    updateBulkSellBtn();
}

function updateBulkSellBtn() {
    const btn = document.getElementById('btn-confirm-sell');
    if(!btn) return;

    if(game.flags.selectedIndices.length > 0) {
        let total = 0;
        game.flags.selectedIndices.forEach(idx => {
            total += getSellPrice(game.inventory[idx]) * game.inventory[idx].count;
        });
        btn.innerText = `出售选中 (${formatBytes(total)})`;
        btn.disabled = false;
        btn.classList.add('can-buy');
    } else {
        btn.innerText = "请选择物品";
        btn.disabled = true;
        btn.classList.remove('can-buy');
    }
}

window.sellSelected = function() {
    if (game.flags.selectedIndices.length === 0) return;
    let totalGain = 0;
    // 倒序删除防止索引错位
    game.flags.selectedIndices.sort((a, b) => b - a);
    game.flags.selectedIndices.forEach(index => {
        const item = game.inventory[index];
        totalGain += getSellPrice(item) * item.count;
        game.inventory.splice(index, 1);
    });
    game.bytes += totalGain;
    showToast(`出售成功！获得 ${formatBytes(totalGain)}`, '#ffd700');
    window.toggleSellMode();
    saveGame();
    updateUI();
};

window.sellByRarity = function(rarityKey) {
    const levels = ['common', 'uncommon', 'rare', 'legendary', 'mythic'];
    const targetLvl = levels.indexOf(rarityKey);
    let totalGain = 0;

    const newInventory = game.inventory.filter(item => {
        const itemLvl = levels.indexOf(item.rarity);
        if (itemLvl <= targetLvl) {
            totalGain += getSellPrice(item) * item.count;
            return false;
        }
        return true;
    });

    if (game.inventory.length === newInventory.length) {
        showToast("没有符合条件的物品", "#fff");
        return;
    }

    if (confirm(`确定要出售所有 [${LootConfig.rarity[rarityKey].name}] 及以下的物品吗？\n预计获得: ${formatBytes(totalGain)}`)) {
        game.inventory = newInventory;
        game.bytes += totalGain;
        showToast(`回收完成！获得 ${formatBytes(totalGain)}`, '#ffd700');
        saveGame();
        renderInventory();
        updateUI();
    }
};

window.sellOneItem = function(index) {
    const item = game.inventory[index];
    const price = getSellPrice(item);
    game.bytes += price;
    if (item.count > 1) item.count--;
    else game.inventory.splice(index, 1);

    document.getElementById('item-info-panel').innerText = "已出售";
    updateUI();
    renderInventory();
    saveGame();
    spawnFloatingText(price, 'auto');
};

window.showItemOptions = function(index) {
    const item = game.inventory[index];
    const infoPanel = document.getElementById('item-info-panel');
    if(!infoPanel) return;

    const rarityCfg = LootConfig.rarity[item.rarity];
    const valStr = formatStat(item.type, item.value);
    const price = getSellPrice(item);

    infoPanel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
            <span style="color: ${rarityCfg.color}; font-weight:bold;">${rarityCfg.name} ${item.name}</span>
            <span style="font-size:0.8em; color:#666">库存: ${item.count}</span>
        </div>
        <div style="margin:5px 0; color:#ddd">${item.desc} <span style="color:${rarityCfg.color}">(${valStr})</span></div>
        <div style="margin-top:5px; display:flex; gap:10px;">
            <button class="buy-btn" onclick="equipItem(${index})">装备</button>
            <button class="buy-btn" style="background:#444; border-color:#666" onclick="sellOneItem(${index})">
                出售 (⚡${formatBytes(price)})
            </button>
        </div>
    `;
};

// --- 6. 视觉特效 (Visuals) ---
function updateCoreVisuals() {
    if (!visualEls.core) return;
    const p = game.stats.clickPower;
    visualEls.core.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4');
    if (p < 50) visualEls.core.classList.add('tier-1');
    else if (p < 500) visualEls.core.classList.add('tier-2');
    else if (p < 5000) visualEls.core.classList.add('tier-3');
    else visualEls.core.classList.add('tier-4');
}

function spawnFloatingText(amount, type) {
    const container = document.getElementById('floating-text-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'float-text';

    if (type === 'crit') {
        el.innerText = '💥 ' + formatBytes(amount);
        el.classList.add('float-crit');
    } else if (type === 'auto') {
        el.innerText = '⚡ ' + formatBytes(amount);
        el.classList.add('float-auto');
    } else {
        el.innerText = '+' + formatBytes(amount);
        if(amount < 100) el.classList.add('float-normal');
        else el.classList.add('float-high');
    }

    const x = window.innerWidth / 2 + (Math.random() - 0.5) * (type==='auto'?200:100);
    const y = window.innerHeight / 2 - 100 + (Math.random() - 0.5) * 50;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function createRipple(color) {
    if (!visualEls.rippleContainer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    if(color === 'red') ripple.style.borderColor = '#ff003c';
    visualEls.rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 悬浮窗逻辑
function showTooltip(item) {
    if (!visualEls.tooltip) return;

    const rarityCfg = LootConfig.rarity[item.rarity];
    const equippedItem = game.equipped[item.slot];

    const currentStatStr = formatStat(item.type, item.value);
    const typeName = getStatName(item.type);

    let compareHTML = '';

    if (equippedItem) {
        if (equippedItem.baseId === item.baseId && equippedItem.rarity === item.rarity) {
            compareHTML = `<div class="tooltip-compare text-neutral">当前已装备</div>`;
        } else {
            compareHTML = `<div class="tooltip-compare"><div>VS 已装备: <span style="color:#ccc">${equippedItem.name}</span></div>`;
            if (equippedItem.type === item.type) {
                const diff = item.value - equippedItem.value;
                if (diff !== 0) {
                    const isBetter = diff > 0;
                    const sign = isBetter ? '+' : '';
                    let diffStr = '';
                    if (isPct(item.type)) diffStr = `${sign}${(diff * 100).toFixed(1)}%`;
                    else diffStr = `${sign}${Math.floor(diff)}`;

                    compareHTML += `<div class="compare-row ${isBetter ? 'text-better' : 'text-worse'}">${typeName} ${diffStr}</div>`;
                } else {
                    compareHTML += `<div class="compare-row text-neutral">属性无变化</div>`;
                }
            } else {
                const oldStatStr = formatStat(equippedItem.type, equippedItem.value);
                const oldTypeName = getStatName(equippedItem.type);
                compareHTML += `
                    <div class="compare-row text-better">+ 获得: ${typeName} ${currentStatStr}</div>
                    <div class="compare-row text-worse">- 失去: ${oldTypeName} ${oldStatStr}</div>
                `;
            }
            compareHTML += `</div>`;
        }
    } else {
        compareHTML = `<div class="tooltip-compare text-better">当前槽位为空 (建议装备)</div>`;
    }

    visualEls.tooltip.innerHTML = `
        <div class="tooltip-header" style="border-color: ${rarityCfg.color}">
            <div class="tooltip-title" style="color: ${rarityCfg.color}">${item.name}</div>
            <div class="tooltip-sub">${rarityCfg.name} ${item.slot.toUpperCase()}</div>
        </div>
        <div class="tooltip-stat"><span>${typeName}</span><span class="stat-val">${currentStatStr}</span></div>
        <div style="font-size:0.75rem; color:#888; margin-top:5px;">${item.desc}</div>
        ${compareHTML}
        <div style="margin-top:8px; font-size:0.7rem; color:#666;">点击装备</div>
    `;
    visualEls.tooltip.style.display = 'block';
}

function moveTooltip(e) {
    if (!visualEls.tooltip) return;
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    const rect = visualEls.tooltip.getBoundingClientRect();
    const finalX = (x + rect.width > window.innerWidth) ? e.clientX - rect.width - 10 : x;
    const finalY = (y + rect.height > window.innerHeight) ? e.clientY - rect.height - 10 : y;
    visualEls.tooltip.style.left = `${finalX}px`;
    visualEls.tooltip.style.top = `${finalY}px`;
}

function hideTooltip() {
    if (visualEls.tooltip) visualEls.tooltip.style.display = 'none';
}

function getStatName(type) {
    const map = {
        clickFlat: '点击算力', autoFlat: '自动算力', clickPct: '点击加成', autoPct: '自动加成',
        critChance: '暴击率', critDmg: '暴击伤害', discount: '商店折扣', luck: '幸运值'
    };
    return map[type] || '属性';
}

function formatStat(type, value) {
    if (isPct(type)) return `+${(value * 100).toFixed(1)}%`;
    return `+${Math.floor(value)}`;
}

function isPct(type) {
    return type.includes('Pct') || type.includes('Chance') || type.includes('discount') || type.includes('luck');
}

// --- 7. 渲染 (UI Render) ---
function renderShop() {
    const container = document.getElementById('shop-container');
    if(!container) return;
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
            div.onclick = () => window.buyItem(item.id);

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

function renderInventory() {
    const grid = document.getElementById('backpack-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const bagCount = document.getElementById('bag-count');
    if(bagCount) bagCount.innerText = game.inventory.length;

    const icons = { cpu:'🧩', ram:'💾', disk:'💿', net:'📡', pwr:'🔋' };

    // 1. 渲染背包
    game.inventory.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = `item border-${item.rarity}`;
        if (game.flags.sellMode && game.flags.selectedIndices.includes(index)) {
            el.classList.add('selected');
        }

        const countTag = item.count > 1 ? `<span class="item-count">${item.count}</span>` : '';
        el.innerHTML = `${icons[item.slot] || '📦'} ${countTag}`;

        el.onclick = () => {
            if (game.flags.sellMode) window.toggleSelection(index);
            else window.showItemOptions(index);
        };

        if (!game.flags.sellMode) {
            el.onmouseenter = () => showTooltip(item);
            el.onmousemove = (e) => moveTooltip(e);
            el.onmouseleave = hideTooltip;
        }
        grid.appendChild(el);
    });

    // 2. 渲染装备栏
    for (let slot in game.equipped) {
        const item = game.equipped[slot];
        const slotEl = document.getElementById(`slot-${slot}`);
        if (!slotEl) continue;

        const iconChar = icons[slot] || '❓';

        if (item) {
            const rarityCfg = LootConfig.rarity[item.rarity];
            slotEl.className = `slot border-${item.rarity} equipped`;
            slotEl.innerHTML = `
                <div class="slot-icon">${iconChar}</div>
                <div class="slot-name">${item.name}</div>
                <div class="slot-rarity" style="color:${rarityCfg.color}">${rarityCfg.name}</div>
            `;
            if (!game.flags.sellMode) {
                slotEl.onmouseenter = () => showTooltip(item);
                slotEl.onmousemove = (e) => moveTooltip(e);
                slotEl.onmouseleave = hideTooltip;
            }
        } else {
            slotEl.className = 'slot empty';
            slotEl.innerHTML = `
                <div class="slot-icon" style="opacity:0.2; filter:grayscale(1);">${iconChar}</div>
                <div class="slot-name" style="color:#444">${slot.toUpperCase()}</div>
                <div class="slot-rarity" style="color:#444">EMPTY</div>
            `;
            slotEl.onmouseenter = null;
            slotEl.onmousemove = null;
            slotEl.onmouseleave = null;
        }
    }
}

function updateUI() {
    document.getElementById('score').innerText = formatBytes(game.bytes);

    const statsHTML = `
        <p>点击: <span class="val">${formatBytes(game.stats.clickPower)}</span> 
           <small style="color:#ff003c" title="暴击率/暴击伤害">(${ (game.stats.critChance*100).toFixed(0) }% / x${game.stats.critDamage.toFixed(1)})</small>
        </p>
        <p>自动: <span class="val">${formatBytes(game.stats.autoPower)}</span>/s</p>
        <p>幸运: <span class="val" style="color:#ffd700">${ (game.stats.luck * 100).toFixed(0) }%</span> 
           折扣: <span class="val" style="color:#00e5ff">-${ (game.stats.discount * 100).toFixed(0) }%</span>
        </p>
    `;
    const statsEl = document.querySelector('.stats');
    if(statsEl) statsEl.innerHTML = statsHTML;

    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const cost = getCost(item);
            const btn = document.getElementById(`btn-${item.id}`);
            const lvlLabel = document.getElementById(`lvl-${item.id}`);
            if (btn && btn.innerText !== "GET!") {
                btn.innerText = `${formatBytes(cost)} B`;
                if (game.bytes >= cost) btn.classList.add('can-buy');
                else btn.classList.remove('can-buy');
            }
            if(lvlLabel) lvlLabel.innerText = `(Lv.${game.levels[item.id]||0})`;
        });
    });
}

// --- 8. 主循环与存档 (Main Loop) ---
function handleClick() {
    let damage = game.stats.clickPower;
    let isCrit = false;

    if (Math.random() < game.stats.critChance) {
        damage *= game.stats.critDamage;
        isCrit = true;
    }

    game.bytes += damage;
    updateUI();
    tryDrop('click');

    // 核心动画
    if (visualEls.core) {
        visualEls.core.classList.remove('core-active', 'core-active-crit');
        void visualEls.core.offsetWidth;
        visualEls.core.classList.add(isCrit ? 'core-active-crit' : 'core-active');
        setTimeout(() => visualEls.core.classList.remove('core-active', 'core-active-crit'), 100);
    }

    createRipple(isCrit ? 'red' : 'green');
    spawnFloatingText(damage, isCrit ? 'crit' : 'click');
}

function saveGame() {
    localStorage.setItem('CyberMinerSave_v3', JSON.stringify({
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
    const save = localStorage.getItem('CyberMinerSave_v3');
    if (save) {
        const data = JSON.parse(save);
        game.bytes = data.bytes || 0;
        game.levels = data.levels || {};
        game.inventory = data.inventory || [];
        game.equipped = data.equipped || { cpu: null, ram: null, disk: null, net: null, pwr: null };
        game.inventory.forEach(i => { if(!i.count) i.count = 1; });
    }
    recalcPower();
    renderInventory();
}

window.resetGame = function() {
    if (confirm('确定要清空数据重来吗？')) {
        localStorage.removeItem('CyberMinerSave_v3');
        location.reload();
    }
};

function init() {
    console.log("游戏初始化...");

    renderShop();
    loadGame();
    updateUI();

    // 自动挂机循环
    setInterval(() => {
        if (game.stats.autoPower > 0) {
            game.bytes += game.stats.autoPower;
            updateUI();
            tryDrop('auto');

            spawnFloatingText(game.stats.autoPower, 'auto');
            if (visualEls.core) {
                visualEls.core.classList.remove('core-auto-pulse');
                void visualEls.core.offsetWidth;
                visualEls.core.classList.add('core-auto-pulse');
            }
        }
    }, 1000);

    setInterval(saveGame, GameConfig.settings.autoSaveInterval);

    // 绑定核心点击
    if (visualEls.core) {
        visualEls.core.addEventListener('click', handleClick);
        visualEls.core.addEventListener('mousedown', (e) => e.preventDefault());
    }
}

// 启动引擎
init();