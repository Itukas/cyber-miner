// 1. 引入依赖 (必须引入，否则函数内部报错)
import { game } from '../core/state.js';
import { recalcPower } from './shop.js';        // 确保 shop.js 里导出了 recalcPower
import { renderInventory } from './ui.js'; // 确保 ui.js 里导出了 renderInventory

// 2. 导出函数 (必须加 export)

export function saveGame() {
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

export function loadGame() {
    const save = localStorage.getItem('CyberMinerSave_v3');
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
        localStorage.removeItem('CyberMinerSave_v3');
        location.reload();
    }
}