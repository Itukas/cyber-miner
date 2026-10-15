// Quality-of-life features. Loaded before the engine; initialized after init().
const SAVE_KEY = 'CyberMinerSave_v3'; // Preserve compatibility with existing players.
const BACKUP_KEY = 'CyberMinerSave_backup';
const playerSettings = { reducedMotion: false };
let purchaseAmount = 1;
let replacingSave = false;

function getPurchaseQuote(item) {
    const limit = purchaseAmount === 'max' ? 10000 : purchaseAmount;
    const level = game.levels[item.id] || 0;
    const discount = Math.max(0.1, 1 - game.stats.discount);
    let cost = 0, count = 0;
    while (count < limit) {
        const next = Math.floor(Math.floor(item.baseCost * Math.pow(item.costMultiplier, level + count)) * discount);
        if (!Number.isFinite(next) || cost + next > game.bytes) break;
        cost += next;
        count++;
    }
    return { cost, count };
}

function calculateOfflineIncome(savedAt, now, power) {
    if (!Number.isFinite(savedAt) || savedAt <= 0 || !Number.isFinite(power) || power <= 0) return 0;
    const seconds = Math.min(8 * 3600, Math.max(0, (now - savedAt) / 1000));
    if (seconds < 60) return 0;
    return Math.floor(seconds * power * 0.5);
}

function grantOfflineIncome(savedAt) {
    const earned = calculateOfflineIncome(savedAt, Date.now(), game.stats.autoPower);
    if (!earned || !Number.isFinite(game.bytes + earned)) return;
    game.bytes += earned;
    game.stats.totalBytesEarned += earned;
    document.getElementById('offline-report').textContent = `本次离线获得 ${formatBytes(earned)} Bytes，已自动入账。`;
    saveGame(); // Consume the timestamp before another reload can claim it.
    showToast(`欢迎回来！离线收益 +${formatBytes(earned)} Bytes`, '#00e5ff');
}

function renderDashboard() {
    const target = document.getElementById('dashboard');
    if (!target || document.getElementById('view-settings').style.display === 'none') return;
    const values = [
        ['当前关卡', game.combat.level], ['累计点击', game.stats.totalClicks],
        ['累计收益', game.stats.totalBytesEarned], ['击败 Boss', game.stats.bossKills],
        ['累计暴击', game.stats.totalCrits], ['已解锁成就', game.achievements.unlocked.length]
    ];
    target.innerHTML = values.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${formatBytes(value)}</strong></div>`).join('');
}

// Rebuild imported records from known configuration instead of trusting display HTML.
function validateSave(text) {
    if (text.length > 2 * 1024 * 1024) throw new Error('存档不能超过 2 MB');
    const data = JSON.parse(text);
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    const number = (value, max = 1e100) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
    const require = (condition) => { if (!condition) throw new Error('存档格式无效或包含不支持的数据'); };
    const numericMap = (value, allowed, integer = true) => {
        require(object(value));
        const result = {};
        for (const [key, amount] of Object.entries(value)) {
            require(allowed.includes(key) && number(amount) && (!integer || Number.isInteger(amount)));
            result[key] = amount;
        }
        return result;
    };
    require(object(data) && number(data.bytes) && number(data.combatLevel, 10000) && Number.isInteger(data.combatLevel) && data.combatLevel >= 1);
    require(data.version === undefined || data.version === 4);
    const levels = numericMap(data.levels, GameConfig.shopCategories.flatMap(c => c.items.map(i => i.id)));
    require(Object.values(levels).every(n => n <= 10000));
    const skills = numericMap(data.skills || {}, SkillTreeConfig.skills.map(s => s.id));
    require(SkillTreeConfig.skills.every(s => (skills[s.id] || 0) <= s.maxLevel));
    const item = value => {
        require(object(value));
        const base = LootConfig.equipmentBase.find(i => i.name === value.baseId || i.name === value.name);
        require(base && Object.hasOwn(LootConfig.rarity, value.rarity) && number(value.value) && number(value.count ?? 1, 1e9) && Number.isInteger(value.count ?? 1) && (value.count ?? 1) >= 1);
        return { uid: number(value.uid) ? value.uid : Date.now() + Math.random(), baseId: base.name, name: base.name, slot: base.slot, type: base.type, desc: base.desc, rarity: value.rarity, value: value.value, count: value.count ?? 1 };
    };
    require(Array.isArray(data.inventory) && data.inventory.length <= 1000 && object(data.equipped));
    const inventory = data.inventory.map(item), equipped = {};
    for (const slot of ['cpu', 'ram', 'disk', 'net', 'pwr']) {
        equipped[slot] = data.equipped[slot] == null ? null : item(data.equipped[slot]);
        require(!equipped[slot] || equipped[slot].slot === slot);
    }
    const stats = {};
    require(data.stats === undefined || object(data.stats));
    for (const key of ['totalClicks', 'totalBytesEarned', 'bossKills', 'totalCrits']) {
        stats[key] = data.stats?.[key] ?? 0;
        require(number(stats[key]));
    }
    const unlocked = data.achievements?.unlocked ?? [];
    require(Array.isArray(unlocked) && unlocked.every(id => AchievementConfig.achievements.some(a => a.id === id)));
    const progress = numericMap(data.dailyQuests?.progress || {}, DailyQuestConfig.quests.map(q => q.id), false);
    const chests = data.chests ?? [];
    require(Array.isArray(chests) && chests.length <= 10000);
    const safeChests = chests.map(c => {
        require(object(c));
        const base = ChestConfig.types.find(t => t.id === c.type);
        require(base && number(c.id) && number(c.createdAt));
        return { id: c.id, type: base.id, name: base.name, icon: base.icon, color: base.color, rewards: base.rewards, createdAt: c.createdAt };
    });
    const buffs = data.activeBuffs ?? [];
    require(Array.isArray(buffs) && buffs.length <= 100);
    const safeBuffs = buffs.map(b => {
        require(object(b) && ['bytesMultiplier','allDamageMult','clickPowerMult','autoPowerMult','critChance','dropChance'].includes(b.type) && number(b.value) && number(b.endTime, 1e15));
        return { type: b.type, value: b.value, endTime: b.endTime, name: '增益', icon: '⚡' };
    });
    return { version: 4, savedAt: Date.now(), bytes: data.bytes, combatLevel: data.combatLevel,
        levels, skills, inventory, equipped, stats,
        achievements: { unlocked: [...new Set(unlocked)], progress: {} },
        dailyQuests: { date: typeof data.dailyQuests?.date === 'string' ? data.dailyQuests.date : '', quests: DailyQuestConfig.quests, progress },
        chests: safeChests, activeBuffs: safeBuffs, lastEventTime: 0 };
}

function initEnhancements() {
    const status = message => { document.getElementById('save-status').textContent = message; };
    try { playerSettings.reducedMotion = JSON.parse(localStorage.getItem('CyberMinerSettings') || '{}').reducedMotion === true; } catch (_) {}
    const motion = document.getElementById('reduced-motion');
    motion.checked = playerSettings.reducedMotion;
    document.body.classList.toggle('reduced-motion', motion.checked);
    motion.addEventListener('change', () => {
        playerSettings.reducedMotion = motion.checked;
        document.body.classList.toggle('reduced-motion', motion.checked);
        try { localStorage.setItem('CyberMinerSettings', JSON.stringify(playerSettings)); } catch (_) { status('显示设置无法保存'); }
    });
    document.getElementById('buy-amount').addEventListener('change', event => {
        purchaseAmount = event.target.value === 'max' ? 'max' : Number(event.target.value);
        updateUI();
    });
    visualEls.core.addEventListener('keydown', event => {
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
            if (!event.repeat) handleClick();
        }
    });
    document.getElementById('save-now').addEventListener('click', saveGame);
    document.getElementById('export-save').addEventListener('click', () => {
        try {
            const url = URL.createObjectURL(new Blob([JSON.stringify(createSaveData())], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `cyber-miner-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status('已导出存档');
        } catch (_) { status('导出失败，请重试'); }
    });
    const fileInput = document.getElementById('save-file');
    document.getElementById('import-save').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        try {
            if (file.size > 2 * 1024 * 1024) throw new Error('存档不能超过 2 MB');
            const data = validateSave(await file.text());
            if (!confirm('导入会替换当前进度，并保存当前进度的备份。继续吗？')) return;
            if (!saveGame()) throw new Error('当前进度备份失败，已取消导入');
            localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY));
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            replacingSave = true;
            location.reload();
        } catch (error) { status(`导入失败：${error.message}`); }
        finally { fileInput.value = ''; }
    });
    document.getElementById('restore-backup').addEventListener('click', () => {
        try {
            const backup = localStorage.getItem(BACKUP_KEY);
            if (!backup) { status('还没有导入前备份'); return; }
            const data = validateSave(backup);
            if (!confirm('恢复导入前的备份会替换当前进度，继续吗？')) return;
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            replacingSave = true;
            location.reload();
        } catch (error) { status(`恢复失败：${error.message}`); }
    });
    renderDashboard();
    window.addEventListener('pagehide', () => { if (!replacingSave) saveGame(); });
}
