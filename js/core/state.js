import { GameConfig } from '../config/game.js';

// 导出全局状态
export const game = {
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

// 导出 DOM 引用
export const visualEls = {
    core: document.getElementById('data-core'),
    rippleContainer: document.getElementById('ripple-container'),
    tooltip: document.getElementById('game-tooltip')
};