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

// 更新顶部 UI 数值
export function updateUI() {
    // 1. 分数
    const scoreEl = document.getElementById('score');
    if(scoreEl) scoreEl.innerText = formatBytes(game.bytes);

    // 2. 统计面板
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

    // 3. 商店按钮状态更新
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
}

// 渲染背包和装备栏
export function renderInventory() {
    const grid = document.getElementById('backpack-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const bagCountEl = document.getElementById('bag-count');
    if(bagCountEl) bagCountEl.innerText = game.inventory.length;

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