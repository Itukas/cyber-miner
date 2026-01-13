// 1. 引入依赖 (必须引入，否则函数内部报错)
import { game } from '../core/state.js';
import { recalcPower } from './shop.js';        // 确保 shop.js 里导出了 recalcPower
import { renderInventory } from './ui.js'; // 确保 ui.js 里导出了 renderInventory

// 2. 导出函数 (必须加 export)

let lastSaveAt = 0;
let saveTimer = null;
const SAVE_KEY = 'CyberMinerSave_v3';
const SAVE_THROTTLE_MS = 500; // 防止高频 localStorage 写入卡顿

function doSave() {
    lastSaveAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify({
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

function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        doSave();
    }, SAVE_THROTTLE_MS);
}

export function saveGame() {
    // autoSaveInterval 调用时通常间隔很大：直接存
    // 高频用户操作（掉落/装备/购买）会反复触发：节流合并
    const now = Date.now();
    if (now - lastSaveAt < SAVE_THROTTLE_MS) {
        scheduleSave();
        return;
    }
    doSave();
}

export function loadGame() {
    const save = localStorage.getItem(SAVE_KEY);
    if (save) {
        const data = JSON.parse(save);
        // 恢复数据
        game.bytes = data.bytes || 0;
        game.levels = data.levels || {};
        game.inventory = data.inventory || [];
        game.equipped = data.equipped || { cpu: null, ram: null, disk: null, net: null, pwr: null };

        // 兼容性处理
        game.inventory.forEach(i => { if(!i.count) i.count = 1; });
    }
    // 重新计算和渲染
    recalcPower();
    renderInventory();
}

export function resetGame() {
    if (confirm('确定要清空数据重来吗？')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

// 页面关闭时尽量落盘（避免最后一次操作刚好被节流）
window.addEventListener('beforeunload', () => {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        doSave();
    }
});
