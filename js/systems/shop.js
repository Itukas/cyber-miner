// 1. 引入依赖
import { game } from '../core/state.js';
import { GameConfig } from '../config/game.js';
import { findItemById } from '../core/utils.js'; // 从 utils 引入
import { updateUI } from './ui.js';              // 从 ui 引入
import { saveGame } from './io.js';              // 从 io 引入
import { updateCoreVisuals } from './visuals.js';// 从 visuals 引入

// 2. 导出核心算力计算函数
export function recalcPower() {
    let baseClick = GameConfig.settings.clickBasePower;
    let baseAuto = 0;

    // 重置属性
    game.stats.critChance = 0;
    game.stats.critDamage = 1.5;
    game.stats.discount = 0;
    game.stats.luck = 1;

    // 商店加成
    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const level = game.levels[item.id] || 0;
            const power = item.basePower * level;
            if (item.type === 'click') baseClick += power;
            if (item.type === 'auto') baseAuto += power;
        });
    });

    // 装备加成
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

    // 更新全局状态
    game.stats.clickPower = Math.floor((baseClick + clickFlat) * clickMult);
    game.stats.autoPower = Math.floor((baseAuto + autoFlat) * autoMult);

    // 更新视觉状态 (如核心颜色变化)
    updateCoreVisuals();
}

// 3. 导出价格计算函数
export function getCost(item) {
    const level = game.levels[item.id] || 0;
    const discountMult = Math.max(0.1, 1 - game.stats.discount);
    let cost = Math.floor(item.baseCost * Math.pow(item.costMultiplier, level));
    return Math.floor(cost * discountMult);
}

// 4. 导出购买函数 (不再直接绑定 window.buyItem)
export function buyItem(id) {
    const item = findItemById(id);
    if (!item) return;

    const cost = getCost(item);

    if (game.bytes >= cost) {
        game.bytes -= cost;
        game.levels[item.id] = (game.levels[item.id] || 0) + 1;

        recalcPower();
        updateUI();
        saveGame();

        // 按钮视觉反馈
        const btn = document.getElementById(`btn-${id}`);
        if(btn) {
            btn.innerText = "GET!";
            // 300ms 后刷新UI会把文字变回去
            setTimeout(() => updateUI(), 300);
        }
    }
}