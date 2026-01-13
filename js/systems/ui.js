import { game } from '../core/state.js';
import { GameConfig } from '../config/game.js';
import { LootConfig } from '../config/loot.js';
import { formatBytes } from '../core/utils.js';
import { getCost, buyItem } from './shop.js';
import {
    toggleSellMode, toggleSelection, showItemOptions,
    equipItem, unequipItem
} from './inventory.js'; // 后面会创建这个文件
import { showTooltip, moveTooltip, hideTooltip } from './visuals.js'; // 后面会创建

// --- 轻量缓存：减少重复 DOM 查询与无效重绘 ---
const uiCache = {
    scoreEl: null,
    statsEl: null,
    bagCountEl: null,
    // shop
    shopInited: false,
    shopBtnById: new Map(),
    shopLvlById: new Map(),
    lastCostById: new Map(),
    lastCanBuyById: new Map(),
    // last values
    lastBytes: null,
    lastStatsKey: '',
    lastBagCount: null,
};

function ensureUIRefs() {
    if (!uiCache.scoreEl) uiCache.scoreEl = document.getElementById('score');
    if (!uiCache.statsEl) uiCache.statsEl = document.querySelector('.stats');
    if (!uiCache.bagCountEl) uiCache.bagCountEl = document.getElementById('bag-count');

    // 商店元素在 renderShop() 之后才存在：懒初始化一次
    if (!uiCache.shopInited) {
        uiCache.shopBtnById.clear();
        uiCache.shopLvlById.clear();
        GameConfig.shopCategories.forEach(cat => {
            cat.items.forEach(item => {
                uiCache.shopBtnById.set(item.id, document.getElementById(`btn-${item.id}`));
                uiCache.shopLvlById.set(item.id, document.getElementById(`lvl-${item.id}`));
            });
        });
        uiCache.shopInited = true;
    }
}

// 更新顶部 UI 数值
export function updateUI() {
    ensureUIRefs();

    // 1. 分数
    if (uiCache.scoreEl && uiCache.lastBytes !== game.bytes) {
        // textContent 比 innerText 更少触发布局
        uiCache.scoreEl.textContent = String(formatBytes(game.bytes));
        uiCache.lastBytes = game.bytes;
    }

    // 2. 统计面板
    const statsKey = [
        game.stats.clickPower,
        game.stats.autoPower,
        game.stats.critChance,
        game.stats.critDamage,
        game.stats.luck,
        game.stats.discount
    ].join('|');
    if (uiCache.statsEl && uiCache.lastStatsKey !== statsKey) {
        const statsHTML = `
            <p>点击: <span class="val">${formatBytes(game.stats.clickPower)}</span> 
               <small style="color:#ff003c" title="暴击率/暴击伤害">(${ (game.stats.critChance*100).toFixed(0) }% / x${game.stats.critDamage.toFixed(1)})</small>
            </p>
            <p>自动: <span class="val">${formatBytes(game.stats.autoPower)}</span>/s</p>
            <p>幸运: <span class="val" style="color:#ffd700">${ (game.stats.luck * 100).toFixed(0) }%</span> 
               折扣: <span class="val" style="color:#00e5ff">-${ (game.stats.discount * 100).toFixed(0) }%</span>
            </p>
        `;
        uiCache.statsEl.innerHTML = statsHTML;
        uiCache.lastStatsKey = statsKey;
    }

    // 3. 商店按钮状态更新
    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const cost = getCost(item);
            const btn = uiCache.shopBtnById.get(item.id);
            const lvlLabel = uiCache.shopLvlById.get(item.id);

            // 成本变化时才更新文本（避免每秒把相同字符串写回 DOM）
            const lastCost = uiCache.lastCostById.get(item.id);
            if (btn && btn.innerText !== "GET!" && lastCost !== cost) {
                btn.textContent = `${formatBytes(cost)} B`;
                uiCache.lastCostById.set(item.id, cost);
            }

            // 可购买状态可能随 bytes 变化：仅在变化时切换 class
            if (btn) {
                const canBuy = game.bytes >= cost;
                const lastCanBuy = uiCache.lastCanBuyById.get(item.id);
                if (lastCanBuy !== canBuy) {
                    btn.classList.toggle('can-buy', canBuy);
                    uiCache.lastCanBuyById.set(item.id, canBuy);
                }
            }

            if (lvlLabel) lvlLabel.textContent = `(Lv.${game.levels[item.id] || 0})`;
        });
    });
}

// 渲染商店 (只在初始化时调用一次)
export function renderShop() {
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
            // 注意：这里需要调用 shop.js 里的 buyItem
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

    // 商店 DOM 已重建：下次 updateUI() 重新缓存引用
    uiCache.shopInited = false;
}

// 渲染背包和装备栏
export function renderInventory() {
    const grid = document.getElementById('backpack-grid');
    if (!grid) return;
    grid.innerHTML = '';

    ensureUIRefs();
    if (uiCache.bagCountEl && uiCache.lastBagCount !== game.inventory.length) {
        uiCache.bagCountEl.textContent = String(game.inventory.length);
        uiCache.lastBagCount = game.inventory.length;
    }

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
            if (game.flags.sellMode) toggleSelection(index);
            else showItemOptions(index);
        };

        // 绑定悬停事件 (非出售模式)
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
            // 清理事件
            slotEl.onmouseenter = null;
            slotEl.onmousemove = null;
            slotEl.onmouseleave = null;
        }
    }
}