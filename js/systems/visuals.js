import { visualEls, game } from '../core/state.js';
import { LootConfig } from '../config/loot.js';
import { formatBytes } from '../core/utils.js';

// 更新核心颜色等级
export function updateCoreVisuals() {
    if (!visualEls.core) return;
    const p = game.stats.clickPower;
    visualEls.core.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4');
    if (p < 50) visualEls.core.classList.add('tier-1');
    else if (p < 500) visualEls.core.classList.add('tier-2');
    else if (p < 5000) visualEls.core.classList.add('tier-3');
    else visualEls.core.classList.add('tier-4');
}

// 核心跳动动画 (自动挖矿时调用)
export function pulseCore() {
    if (visualEls.core) {
        visualEls.core.classList.remove('core-auto-pulse');
        void visualEls.core.offsetWidth; // 强制重绘
        visualEls.core.classList.add('core-auto-pulse');
    }
}

// 创建波纹
export function createRipple(color) {
    if (!visualEls.rippleContainer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    if(color === 'red') ripple.style.borderColor = '#ff003c';
    visualEls.rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 飘字特效
export function spawnFloatingText(amount, type) {
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

// --- 悬浮窗 (Tooltip) ---
export function showTooltip(item) {
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
                    if (isPct(item.type)) {
                        diffStr = `${sign}${(diff * 100).toFixed(1)}%`;
                    } else {
                        diffStr = `${sign}${Math.floor(diff)}`;
                    }
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

export function moveTooltip(e) {
    if (!visualEls.tooltip) return;
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    const rect = visualEls.tooltip.getBoundingClientRect();
    const finalX = (x + rect.width > window.innerWidth) ? e.clientX - rect.width - 10 : x;
    const finalY = (y + rect.height > window.innerHeight) ? e.clientY - rect.height - 10 : y;
    visualEls.tooltip.style.left = `${finalX}px`;
    visualEls.tooltip.style.top = `${finalY}px`;
}

export function hideTooltip() {
    if (visualEls.tooltip) visualEls.tooltip.style.display = 'none';
}

// 私有辅助函数 (不导出)
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