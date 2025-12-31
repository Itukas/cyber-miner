import { GameConfig } from '../config/game.js';

// 格式化数字 (1.2k, 1.5M)
export function formatBytes(num) {
    if (num < 1000) return Math.floor(num);
    if (num < 1000000) return (num/1000).toFixed(1) + 'k';
    if (num < 1000000000) return (num/1000000).toFixed(2) + 'M';
    return (num/1000000000).toFixed(2) + 'G';
}

// 根据ID查找商品
export function findItemById(id) {
    for (const cat of GameConfig.shopCategories) {
        const item = cat.items.find(i => i.id === id);
        if (item) return item;
    }
    return null;
}

// Toast 提示
export function showToast(msg, color) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = color || '#fff';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}