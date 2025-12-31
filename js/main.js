// 导入所有模块
import { GameConfig } from './config/game.js';
import { game, visualEls } from './core/state.js';
import * as Utils from './core/utils.js';
import * as ShopSystem from './systems/shop.js';
import * as InvSystem from './systems/inventory.js';
import * as UISystem from './systems/ui.js';
import * as IOSystem from './systems/io.js';
import * as Visuals from './systems/visuals.js';

// --- 初始化 ---
function init() {
    console.log("Cyber Miner Engine Starting...");

    // 1. 加载存档
    IOSystem.loadGame();

    // 2. 初始渲染
    UISystem.renderShop();
    UISystem.renderInventory();
    UISystem.updateUI();

    // 3. 启动循环
    setInterval(gameLoop, 1000);
    setInterval(IOSystem.saveGame, GameConfig.settings.autoSaveInterval);

    // 4. 绑定核心点击
    if (visualEls.core) {
        visualEls.core.addEventListener('click', handleCoreClick);
        visualEls.core.addEventListener('mousedown', (e) => e.preventDefault());
    }

    // 5. 【关键】暴露函数给 HTML 的 onclick 使用
    exposeGlobals();
}

function gameLoop() {
    if (game.stats.autoPower > 0) {
        game.bytes += game.stats.autoPower;
        UISystem.updateUI();
        InvSystem.tryDrop('auto');
        Visuals.spawnFloatingText(game.stats.autoPower, 'auto');
        Visuals.pulseCore();
    }
}

function handleCoreClick() {
    // 点击逻辑... (调用 ShopSystem.calculateClickDamage 等)
    // 示例:
    let damage = game.stats.clickPower;
    // ...计算暴击...
    game.bytes += damage;
    UISystem.updateUI();
    // ...特效...
}

// 把模块里的函数挂载到 window，这样 index.html 里的 onclick="buyItem(1)" 才能工作
function exposeGlobals() {
    window.buyItem = ShopSystem.buyItem;
    window.equipItem = InvSystem.equipItem;
    window.unequipItem = InvSystem.unequipItem;
    window.sellOneItem = InvSystem.sellOneItem;
    window.sellSelected = InvSystem.sellSelected;
    window.toggleSellMode = InvSystem.toggleSellMode;
    window.sellByRarity = InvSystem.sellByRarity;
    window.resetGame = IOSystem.resetGame;
    // ... 其他需要 HTML 调用的函数
}

// 启动
init();