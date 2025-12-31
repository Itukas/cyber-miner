import { game } from '../core/state.js';
import { LootConfig } from '../config/loot.js';
import { saveGame } from './io.js';
import { renderInventory, updateUI } from './ui.js';
import { showToast, formatBytes } from '../core/utils.js';
import { recalcPower } from './shop.js';
import { spawnFloatingText } from './visuals.js';

// 生成掉落
export function generateLoot(source) {
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

    // 随机底材
    const baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];
    const rarity = LootConfig.rarity[rarityKey];

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

// 尝试掉落包装器
export function tryDrop(type) {
    generateLoot(type);
}

// 计算出售价格
function getSellPrice(item) {
    const rarityCfg = LootConfig.rarity[item.rarity];
    return Math.floor(LootConfig.settings.baseSellPrice * rarityCfg.sellMult);
}

// --- 装备操作 ---
export function equipItem(index) {
    const item = game.inventory[index];

    // 先把身上的卸下来
    if (game.equipped[item.slot]) {
        returnToInventory(game.equipped[item.slot]);
    }

    // 装备新的 (处理堆叠)
    if (item.count > 1) {
        item.count--;
        game.equipped[item.slot] = {...item, count: 1};
    } else {
        game.equipped[item.slot] = item;
        game.inventory.splice(index, 1);
    }

    // document.getElementById('item-info-panel').innerText = "已装备"; // UI 操作可放在 renderInventory 里刷新
    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
}

export function unequipItem(slot) {
    if (!game.equipped[slot]) return;
    returnToInventory(game.equipped[slot]);
    game.equipped[slot] = null;
    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
}

function returnToInventory(item) {
    const existing = game.inventory.find(i => i.baseId === item.baseId && i.rarity === item.rarity);
    if (existing) existing.count++;
    else game.inventory.push(item);
}

// --- 出售操作 ---
export function toggleSellMode() {
    game.flags.sellMode = !game.flags.sellMode;
    game.flags.selectedIndices = [];
    renderInventory();

    const btn = document.getElementById('btn-multi-sell');
    if(btn) {
        btn.innerText = game.flags.sellMode ? "取消选择" : "多选出售";
        btn.classList.toggle('active-mode', game.flags.sellMode);
    }
    const actionPanel = document.getElementById('bulk-actions');
    if(actionPanel) actionPanel.style.display = game.flags.sellMode ? 'flex' : 'none';
}

export function toggleSelection(index) {
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

export function sellSelected() {
    if (game.flags.selectedIndices.length === 0) return;
    let totalGain = 0;
    game.flags.selectedIndices.sort((a, b) => b - a);
    game.flags.selectedIndices.forEach(index => {
        const item = game.inventory[index];
        totalGain += getSellPrice(item) * item.count;
        game.inventory.splice(index, 1);
    });
    game.bytes += totalGain;
    showToast(`出售成功！获得 ${formatBytes(totalGain)}`, '#ffd700');
    toggleSellMode();
    saveGame();
    updateUI();
}

export function sellOneItem(index) {
    const item = game.inventory[index];
    const price = getSellPrice(item);
    game.bytes += price;
    if (item.count > 1) item.count--;
    else game.inventory.splice(index, 1);

    updateUI();
    renderInventory();
    saveGame();
    spawnFloatingText(price, 'auto');
}

export function sellByRarity(rarityKey) {
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

    const rarityName = LootConfig.rarity[rarityKey].name;
    if (confirm(`确定要出售所有 [${rarityName}] 及以下的物品吗？\n预计获得: ${formatBytes(totalGain)}`)) {
        game.inventory = newInventory;
        game.bytes += totalGain;
        showToast(`回收完成！获得 ${formatBytes(totalGain)}`, '#ffd700');
        saveGame();
        renderInventory();
        updateUI();
    }
}

// 物品详情弹窗内容生成
export function showItemOptions(index) {
    const item = game.inventory[index];
    const infoPanel = document.getElementById('item-info-panel');
    if(!infoPanel) return;

    const rarityCfg = LootConfig.rarity[item.rarity];

    let valStr = '';
    if (item.type.includes('Pct') || item.type.includes('Chance') || item.type.includes('discount') || item.type.includes('luck')) {
        valStr = `+${(item.value * 100).toFixed(1)}%`;
    } else {
        valStr = `+${Math.floor(item.value)}`;
    }
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
}