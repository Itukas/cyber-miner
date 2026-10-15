// ==========================================
// 整合版 script.js (战斗+挖矿双收益版)
// ==========================================

// --- 1. DOM 元素引用 ---
const visualEls = {
    // 核心动画区
    core: document.getElementById('data-core'),
    rippleContainer: document.getElementById('ripple-container'),
    tooltip: document.getElementById('game-tooltip'),

    // 战斗 UI
    levelDisplay: document.getElementById('level-display'),
    enemyName: document.getElementById('enemy-name'),
    hpBarFill: document.getElementById('hp-bar-fill'),
    hpText: document.getElementById('hp-text'),
    timerBar: document.getElementById('boss-timer-bar'),
    timerFill: document.querySelector('.timer-fill'),
    timerText: document.querySelector('.timer-text')
};

// --- 2. 全局游戏状态 ---
if (typeof GameConfig === 'undefined' || typeof LootConfig === 'undefined') {
    alert("错误：配置文件未加载！请确保 config.js 和 loot-config.js 在 script.js 之前引入。");
}

// 默认战斗配置
const CombatDefaults = {
    baseHp: 20,
    hpGrowth: 1.15,
    bossHpMult: 10,
    bossTime: 15,
    baseReward: 10,
    rewardGrowth: 1.15
};
const CombatConfig = (GameConfig.combat) ? GameConfig.combat : CombatDefaults;

let game = {
    bytes: GameConfig.settings.initialBytes,
    levels: {},
    inventory: [],
    equipped: { cpu: null, ram: null, disk: null, net: null, pwr: null },
    stats: {
        clickPower: 1, autoPower: 0,
        critChance: 0, critDamage: 1.5, discount: 0, luck: 1,
        // 新增统计
        totalClicks: 0,
        totalBytesEarned: 0,
        bossKills: 0,
        totalCrits: 0
    },
    flags: {
        sellMode: false, selectedIndices: []
    },
    combat: {
        level: 1,
        currentHp: 20,
        maxHp: 20,
        isBoss: false,
        bossTimer: 0,
        bossInterval: null
    },
    // 新功能状态
    achievements: {
        unlocked: [],
        progress: {}
    },
    dailyQuests: {
        date: new Date().toDateString(),
        quests: [],
        progress: {}
    },
    skills: {},
    activeEvents: [],
    lastEventTime: 0,
    // 宝箱系统
    chests: [],
    activeBuffs: []
};

// --- 3. 战斗系统逻辑 ---

const ENEMY_NAMES = [
    "电子臭虫", "数据碎片", "内存泄漏", "僵尸进程", "逻辑炸弹",
    "蠕虫病毒", "木马程序", "幽灵协议", "AI 叛军", "量子幽灵"
];
const BOSS_NAMES = [
    "防火墙守卫", "核心溢出", "深网主宰", "赛博恶魔", "奇点吞噬者"
];

function spawnEnemy() {
    const isBoss = (game.combat.level % 10 === 0);

    // 血量公式
    let hp = CombatConfig.baseHp * Math.pow(CombatConfig.hpGrowth, game.combat.level - 1);

    if (isBoss) {
        hp *= CombatConfig.bossHpMult;
        startBossTimer();
    } else {
        stopBossTimer();
    }

    hp = Math.max(1, Math.floor(hp));

    game.combat.currentHp = hp;
    game.combat.maxHp = hp;
    game.combat.isBoss = isBoss;

    let name = "";
    if (isBoss) {
        const bossIndex = Math.floor(game.combat.level / 10) - 1;
        name = "⚠️ " + (BOSS_NAMES[bossIndex % BOSS_NAMES.length] || "未知实体") + " ⚠️";
    } else {
        name = ENEMY_NAMES[(game.combat.level - 1) % ENEMY_NAMES.length] || "未知错误";
    }

    updateCombatUI(name);
}

function damageEnemy(amount) {
    if (game.combat.currentHp <= 0) return;

    game.combat.currentHp -= amount;

    updateHpBar();

    if (game.combat.currentHp <= 0) {
        onEnemyDeath();
    }
}

function onEnemyDeath() {
    // 击杀额外奖励 (作为 Loot 包)
    let reward = CombatConfig.baseReward * Math.pow(CombatConfig.rewardGrowth, game.combat.level - 1);
    
    // 应用技能效果
    const bossMult = game.combat.isBoss && game.skills && game.skills['skill_boss_reward'] ? 1.5 : 1;
    reward *= bossMult;

    if (game.combat.isBoss) {
        reward *= 10;
        game.stats.bossKills++;
        stopBossTimer();
        showToast(`BOSS 击杀! 关卡升级!`, "#ffd700");
        updateQuestProgress('boss', 1);
    }
    
    // 应用事件效果
    reward *= getActiveEventMultiplier('bytesMultiplier');
    reward = Math.floor(reward);
    game.bytes += reward;
    game.stats.totalBytesEarned += reward;
    
    // 更新Bytes任务进度
    updateBytesQuestProgress(reward);

    // 掉落装备（每次击杀都有概率掉落）
    tryDrop('click');
    
    // BOSS必掉装备，普通怪物也有较高概率
    const dropChance = game.combat.isBoss ? 1.0 : 0.3;
    if (Math.random() < dropChance) {
        generateLoot('click');
    }

    game.combat.level++;
    updateQuestProgress('level', 1);

    // 飘字提示获得了额外战利品
    spawnFloatingText(reward, 'money');
    updateUI();
    saveGame();
    
    checkAchievements();

    spawnEnemy();
}

function startBossTimer() {
    stopBossTimer();
    game.combat.bossTimer = CombatConfig.bossTime;

    if (visualEls.timerBar) visualEls.timerBar.style.display = 'block';
    if (visualEls.core) visualEls.core.classList.add('core-boss');

    game.combat.bossInterval = setInterval(() => {
        game.combat.bossTimer -= 0.1;
        if (visualEls.timerFill) {
            const pct = (game.combat.bossTimer / CombatConfig.bossTime) * 100;
            visualEls.timerFill.style.width = `${pct}%`;
        }
        if (visualEls.timerText) {
            visualEls.timerText.innerText = `${game.combat.bossTimer.toFixed(1)}s`;
        }
        if (game.combat.bossTimer <= 0) {
            failBossFight();
        }
    }, 100);
}

function stopBossTimer() {
    if (game.combat.bossInterval) {
        clearInterval(game.combat.bossInterval);
        game.combat.bossInterval = null;
    }
    if (visualEls.timerBar) visualEls.timerBar.style.display = 'none';
    if (visualEls.core) visualEls.core.classList.remove('core-boss');
}

function failBossFight() {
    stopBossTimer();
    showToast("挑战超时! 退回上一关", "#ff4d4d");
    game.combat.level = Math.max(1, game.combat.level - 1);
    spawnEnemy();
}

function updateCombatUI(name) {
    if (visualEls.levelDisplay) visualEls.levelDisplay.innerText = `LEVEL ${game.combat.level}`;
    if (visualEls.enemyName && name) visualEls.enemyName.innerText = name;
    updateHpBar();
}

function updateHpBar() {
    if (!visualEls.hpBarFill) return;
    const pct = Math.max(0, (game.combat.currentHp / game.combat.maxHp) * 100);
    visualEls.hpBarFill.style.width = `${pct}%`;
    if (visualEls.hpText) {
        visualEls.hpText.innerText = `${formatBytes(Math.max(0, game.combat.currentHp))} / ${formatBytes(game.combat.maxHp)}`;
    }
}

// --- 4. 工具函数 ---
function formatBytes(num) {
    if (num < 1000) return Math.floor(num);
    if (num < 1000000) return (num/1000).toFixed(1) + 'k';
    if (num < 1000000000) return (num/1000000).toFixed(2) + 'M';
    return (num/1000000000).toFixed(2) + 'G';
}

function findItemById(id) {
    for (const cat of GameConfig.shopCategories) {
        const item = cat.items.find(i => i.id === id);
        if (item) return item;
    }
    return null;
}

function showToast(msg, color) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = color || '#fff';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- 5. 核心逻辑 (Shop System) ---
function getCost(item) {
    const level = game.levels[item.id] || 0;
    const discountMult = Math.max(0.1, 1 - game.stats.discount);
    let cost = Math.floor(item.baseCost * Math.pow(item.costMultiplier, level));
    return Math.floor(cost * discountMult);
}

function recalcPower() {
    let baseClick = GameConfig.settings.clickBasePower;
    let baseAuto = 0;
    let clickSkillMult = 1, autoSkillMult = 1;

    // 重置基础值
    game.stats.critChance = 0;
    game.stats.critDamage = 1.5;
    game.stats.discount = 0;
    game.stats.luck = 1;

    // 应用技能效果
    if (SkillTreeConfig && game.skills) {
        SkillTreeConfig.skills.forEach(skill => {
            const level = game.skills[skill.id] || 0;
            if (level === 0) return;
            
            Object.keys(skill.effect).forEach(key => {
                const value = skill.effect[key] * level;
                if (key === 'clickPowerBase') {
                    clickSkillMult *= (1 + value);
                } else if (key === 'autoPowerBase') {
                    autoSkillMult *= (1 + value);
                } else {
                    game.stats[key] = (game.stats[key] || 0) + value;
                }
            });
        });
    }

    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const level = game.levels[item.id] || 0;
            const power = item.basePower * level;
            if (item.type === 'click') baseClick += power;
            if (item.type === 'auto') baseAuto += power;
        });
    });

    let clickMult = 1, autoMult = 1;
    let damageBonus = 1; // 装备伤害加成

    for (let slot in game.equipped) {
        const item = game.equipped[slot];
        if (item) {
            switch(item.type) {
                // 固定值类型已废弃，转换为百分比
                case 'clickFlat': 
                case 'clickPct':  clickMult += item.value; break;
                case 'autoFlat':  
                case 'autoPct':   autoMult += item.value; break;
                case 'critChance': game.stats.critChance += item.value; break;
                case 'critDmg':    game.stats.critDamage += item.value; break;
                case 'discount':   game.stats.discount += item.value; break;
                case 'luck':       game.stats.luck += item.value; break;
            }
            
            // 装备伤害加成（后期功能）
            if (EquipmentDamageConfig && game.combat.level >= EquipmentDamageConfig.startLevel) {
                const levelBonus = (game.combat.level - EquipmentDamageConfig.startLevel) * EquipmentDamageConfig.damagePerLevel;
                const rarityBonus = EquipmentDamageConfig.rarityBonus[item.rarity] || 0;
                damageBonus += levelBonus + rarityBonus;
            }
        }
    }
    
    // 应用Buff效果（只应用永久性的，临时倍率buff在点击/自动时实时应用）
    if (!game.activeBuffs) game.activeBuffs = [];
    const now = Date.now();
    game.activeBuffs = game.activeBuffs.filter(b => b && b.endTime > now);
    
    // 只应用非倍率类的buff（如暴击率）
    game.activeBuffs.forEach(buff => {
        switch(buff.type) {
            case 'critChance':
                game.stats.critChance += buff.value;
                break;
            // clickPowerMult, autoPowerMult, allDamageMult, bytesMultiplier 在点击/自动时实时应用
        }
    });

    // 计算基础算力（不包含临时倍率buff，倍率buff在点击/自动时实时应用）
    game.stats.clickPower = Math.floor(baseClick * clickSkillMult * clickMult * damageBonus);
    game.stats.autoPower = Math.floor(baseAuto * autoSkillMult * autoMult * damageBonus);

    updateCoreVisuals();
}

window.buyItem = function (id) {
    const item = findItemById(id);
    if (!item) return;

    const quote = getPurchaseQuote(item);
    if (!quote.count) return;
    game.bytes = Math.max(0, game.bytes - quote.cost);
    game.levels[id] = (game.levels[id] || 0) + quote.count;
    recalcPower();
    checkAchievements();
    updateUI();
    saveGame();
    showToast(`已购买 ${item.name} ×${quote.count}`, '#00ff41');
};

// --- 6. 掉落与背包 (Inventory System) ---
function generateLoot(source) {
    const chance = (source === 'click' ? LootConfig.settings.dropChanceClick : LootConfig.settings.dropChanceAuto) * game.stats.luck;
    if (Math.random() > chance) return;

    // 检查双倍掉落技能
    const doubleDrop = game.skills && game.skills['skill_double_drop'] && Math.random() < 0.05;
    const dropCount = doubleDrop ? 2 : 1;

    for (let i = 0; i < dropCount; i++) {
        const rand = Math.random();
        let rarityKey = 'common';
        let accum = 0;
        for (let key in LootConfig.rarity) {
            accum += LootConfig.rarity[key].prob;
            if (rand <= accum) { rarityKey = key; break; }
        }
        const rarity = LootConfig.rarity[rarityKey];
        const baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];
        const existingItem = game.inventory.find(i => i.baseId === baseItem.name && i.rarity === rarityKey);

        if (existingItem) {
            existingItem.count++;
            if (i === 0) { // 只显示一次提示
                showToast(`获得: [${rarity.name}] ${baseItem.name} (堆叠 x${existingItem.count})${doubleDrop ? ' ✨双倍！' : ''}`, rarity.color);
            }
        } else {
            const maxInv = LootConfig.settings.maxInventory + (game.skills && game.skills['skill_inventory'] ? game.skills['skill_inventory'] * 20 : 0);
            if (game.inventory.length >= maxInv) {
                showToast("背包已满，无法拾取！", "#ff4d4d");
                return;
            }
            const newItem = {
                uid: Date.now() + Math.random() + i,
                baseId: baseItem.name,
                name: baseItem.name,
                slot: baseItem.slot,
                type: baseItem.type,
                rarity: rarityKey,
                value: baseItem.baseVal * rarity.multiplier,
                desc: baseItem.desc,
                count: 1
            };
            game.inventory.push(newItem);
            if (i === 0) { // 只显示一次提示
                showToast(`获得: [${rarity.name}] ${newItem.name}${doubleDrop ? ' ✨双倍！' : ''}`, rarity.color);
            }
        }
    }
    saveGame();
    renderInventory();
}

function tryDrop(type) {
    generateLoot(type);
    tryDropChest(type);
}

// 宝箱掉落系统
function tryDropChest(source) {
    if (!ChestConfig) return;
    
    // 计算掉落概率
    let chance = ChestConfig.dropChance.base + (game.combat.level - 1) * ChestConfig.dropChance.perLevel;
    if (game.combat.isBoss) {
        chance += ChestConfig.dropChance.bossBonus;
    }
    
    // 应用幸运值
    chance *= game.stats.luck;
    
    if (Math.random() > chance) return;
    
    // 根据概率选择宝箱类型
    const rand = Math.random();
    let accum = 0;
    let chestType = null;
    
    for (let chest of ChestConfig.types) {
        accum += chest.prob;
        if (rand <= accum) {
            chestType = chest;
            break;
        }
    }
    
    if (!chestType) chestType = ChestConfig.types[0];
    
    // 创建宝箱
    const chest = {
        id: Date.now() + Math.random(),
        type: chestType.id,
        name: chestType.name,
        icon: chestType.icon,
        color: chestType.color,
        rewards: chestType.rewards,
        createdAt: Date.now()
    };
    
    if (!game.chests) game.chests = [];
    game.chests.push(chest);
    showToast(`🎁 获得: ${chestType.icon} ${chestType.name}！`, chestType.color);
    saveGame();
    renderChests();
}

// 开启宝箱
window.openChest = function(chestId) {
    if (!game.chests) game.chests = [];
    const chest = game.chests.find(c => c.id === chestId);
    if (!chest) return;
    
    const chestType = ChestConfig.types.find(t => t.id === chest.type);
    if (!chestType) return;
    
    // 获得Bytes奖励
    const bytesReward = Math.floor(
        (Math.random() * (chestType.rewards.bytes.max - chestType.rewards.bytes.min) + chestType.rewards.bytes.min) 
        * chestType.rewards.bytes.mult
    );
    game.bytes += bytesReward;
    game.stats.totalBytesEarned += bytesReward;
    
    // 获得装备奖励
    let equipmentRewards = [];
    if (chestType.rewards.equipment && Math.random() < chestType.rewards.equipment.chance) {
        const equipmentCount = chestType.rewards.equipment.count || 1;
        for (let i = 0; i < equipmentCount; i++) {
            // 根据宝箱品质决定装备稀有度
            const rarityProbs = {
                'common_chest': { common: 0.7, uncommon: 0.3 },
                'rare_chest': { uncommon: 0.5, rare: 0.5 },
                'legendary_chest': { rare: 0.4, legendary: 0.5, mythic: 0.1 },
                'mythic_chest': { legendary: 0.3, mythic: 0.7 }
            };
            
            const probs = rarityProbs[chestType.id] || rarityProbs['common_chest'];
            const rand = Math.random();
            let rarityKey = 'common';
            let accum = 0;
            for (let key in probs) {
                accum += probs[key];
                if (rand <= accum) {
                    rarityKey = key;
                    break;
                }
            }
            
            const rarity = LootConfig.rarity[rarityKey];
            const baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];
            const existingItem = game.inventory.find(i => i.baseId === baseItem.name && i.rarity === rarityKey);
            
            if (existingItem) {
                existingItem.count++;
                equipmentRewards.push({ item: existingItem, isNew: false });
            } else {
                const maxInv = LootConfig.settings.maxInventory + (game.skills && game.skills['skill_inventory'] ? game.skills['skill_inventory'] * 20 : 0);
                if (game.inventory.length < maxInv) {
                    const newItem = {
                        uid: Date.now() + Math.random() + i,
                        baseId: baseItem.name,
                        name: baseItem.name,
                        slot: baseItem.slot,
                        type: baseItem.type,
                        rarity: rarityKey,
                        value: baseItem.baseVal * rarity.multiplier,
                        desc: baseItem.desc,
                        count: 1
                    };
                    game.inventory.push(newItem);
                    equipmentRewards.push({ item: newItem, isNew: true });
                }
            }
        }
    }
    
    // 随机获得1-3个buff
    const buffCount = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
    const availableBuffs = [...chestType.rewards.buffs];
    const selectedBuffs = [];
    
    for (let i = 0; i < buffCount && availableBuffs.length > 0; i++) {
        const buffIndex = Math.floor(Math.random() * availableBuffs.length);
        selectedBuffs.push(availableBuffs[buffIndex]);
        availableBuffs.splice(buffIndex, 1);
    }
    
    // 应用buff
    selectedBuffs.forEach(buff => {
        activateBuff(buff);
    });
    
    // 移除宝箱
    game.chests = game.chests.filter(c => c.id !== chestId);
    
    // 显示奖励信息
    let rewardText = `✨ 开启${chestType.name}！获得 ${formatBytes(bytesReward)}`;
    if (equipmentRewards.length > 0) {
        rewardText += ` 和 ${equipmentRewards.length}件装备`;
    }
    if (selectedBuffs.length > 0) {
        rewardText += ` 和 ${selectedBuffs.length}个Buff`;
    }
    showToast(rewardText, chestType.color);
    spawnFloatingText(bytesReward, 'money');
    
    // 显示装备获得提示
    equipmentRewards.forEach(({ item, isNew }) => {
        const rarityCfg = LootConfig.rarity[item.rarity];
        if (isNew) {
            showToast(`获得: [${rarityCfg.name}] ${item.name}`, rarityCfg.color);
        }
    });
    
    saveGame();
    updateUI();
    renderChests();
};

// 激活Buff
function activateBuff(buff) {
    if (!game.activeBuffs) game.activeBuffs = [];
    const existingBuff = game.activeBuffs.find(b => b && b.type === buff.type);
    
    if (existingBuff) {
        // 如果已有相同类型的buff，延长持续时间或叠加效果
        existingBuff.endTime = Math.max(existingBuff.endTime, Date.now() + buff.duration);
        if (buff.type === 'bytesMultiplier' || buff.type === 'allDamageMult') {
            existingBuff.value = Math.max(existingBuff.value, buff.value);
        } else if (buff.type === 'clickPowerMult' || buff.type === 'autoPowerMult') {
            // 倍率buff取最大值
            existingBuff.value = Math.max(existingBuff.value, buff.value);
        } else {
            existingBuff.value += buff.value;
        }
    } else {
        // 添加新buff
        game.activeBuffs.push({
            type: buff.type,
            value: buff.value,
            name: buff.name,
            icon: buff.icon,
            endTime: Date.now() + buff.duration
        });
    }
    
    // 设置定时器移除buff
    setTimeout(() => {
        removeBuff(buff.type);
    }, buff.duration);
}

// 移除Buff
function removeBuff(buffType) {
    game.activeBuffs = game.activeBuffs.filter(b => b.type !== buffType);
    recalcPower();
    renderBuffs();
}

// 渲染宝箱列表
function renderChests() {
    const container = document.getElementById('chests-container');
    if (!container) return;
    
    if (!game.chests) game.chests = [];
    
    container.innerHTML = '';
    
    if (game.chests.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">暂无宝箱</div>';
        return;
    }
    
    game.chests.forEach(chest => {
        const div = document.createElement('div');
        div.className = 'chest-item card-style';
        div.style.borderColor = chest.color;
        
        div.innerHTML = `
            <div class="chest-header">
                <span class="chest-icon" style="font-size:2rem;">${chest.icon}</span>
                <div class="chest-info">
                    <h3 style="color:${chest.color}">${chest.name}</h3>
                    <p style="color:#888; font-size:0.8rem;">点击开启获得奖励和Buff</p>
                </div>
            </div>
            <button class="buy-btn can-buy" onclick="openChest(${chest.id})" style="margin-top:10px;">
                开启宝箱
            </button>
        `;
        container.appendChild(div);
    });
}

// 渲染Buff列表
function renderBuffs() {
    const container = document.getElementById('buffs-container');
    if (!container) return;
    
    if (!game.activeBuffs) game.activeBuffs = [];
    
    container.innerHTML = '';
    
    // 清理过期的buff
    const now = Date.now();
    game.activeBuffs = game.activeBuffs.filter(b => b && b.endTime > now);
    
    if (game.activeBuffs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888; padding:10px;">暂无Buff</div>';
        return;
    }
    
    game.activeBuffs.forEach((buff, index) => {
        const remaining = Math.max(0, buff.endTime - now);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        const div = document.createElement('div');
        div.className = 'buff-item';
        div.id = `buff-item-${index}`;
        
        div.innerHTML = `
            <span class="buff-icon">${buff.icon}</span>
            <div class="buff-info">
                <div class="buff-name">${buff.name}</div>
                <div class="buff-time" id="buff-time-${index}">${minutes}:${seconds.toString().padStart(2, '0')}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

// 实时更新Buff倒计时
function updateBuffsTimer() {
    if (!game.activeBuffs) return;
    
    const now = Date.now();
    const beforeCount = game.activeBuffs.length;
    game.activeBuffs = game.activeBuffs.filter(b => b && b.endTime > now);
    const afterCount = game.activeBuffs.length;
    
    // 如果有buff过期，重新渲染整个列表
    if (beforeCount !== afterCount) {
        renderBuffs();
        recalcPower();
        updateUI();
        return;
    }
    
    // 更新每个buff的倒计时
    game.activeBuffs.forEach((buff, index) => {
        const timeEl = document.getElementById(`buff-time-${index}`);
        if (!timeEl) return;
        
        const remaining = Math.max(0, buff.endTime - now);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 如果剩余时间少于10秒，改变颜色提示
        if (remaining < 10000) {
            timeEl.style.color = '#ff4d4d';
            timeEl.style.fontWeight = 'bold';
        } else if (remaining < 60000) {
            timeEl.style.color = '#ffa500';
            timeEl.style.fontWeight = 'normal';
        } else {
            timeEl.style.color = '#8b949e';
            timeEl.style.fontWeight = 'normal';
        }
    });
}

function getSellPrice(item) {
    const rarityCfg = LootConfig.rarity[item.rarity];
    return Math.floor(LootConfig.settings.baseSellPrice * rarityCfg.sellMult);
}

window.equipItem = function(index) {
    const item = game.inventory[index];
    if (game.equipped[item.slot]) returnToInventory(game.equipped[item.slot]);

    if (item.count > 1) {
        item.count--;
        game.equipped[item.slot] = {...item, count: 1};
    } else {
        game.equipped[item.slot] = item;
        game.inventory.splice(index, 1);
    }

    const panel = document.getElementById('item-info-panel');
    if(panel) panel.innerText = "已装备";

    updateQuestProgress('equip', 1);
    checkAchievements();

    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
};

window.unequipItem = function(slot) {
    if (!game.equipped[slot]) return;
    returnToInventory(game.equipped[slot]);
    game.equipped[slot] = null;
    recalcPower();
    saveGame();
    renderInventory();
    updateUI();
};

function returnToInventory(item) {
    const existing = game.inventory.find(i => i.baseId === item.baseId && i.rarity === item.rarity);
    if (existing) existing.count++;
    else game.inventory.push(item);
}

window.toggleSellMode = function() {
    game.flags.sellMode = !game.flags.sellMode;
    game.flags.selectedIndices = [];
    renderInventory();

    const btn = document.getElementById('btn-multi-sell');
    if(btn) {
        btn.innerText = game.flags.sellMode ? "取消选择" : "多选出售";
        btn.classList.toggle('active-mode', game.flags.sellMode);
    }
    const actions = document.getElementById('bulk-actions');
    if(actions) actions.style.display = game.flags.sellMode ? 'flex' : 'none';
};

window.toggleSelection = function(index) {
    const pos = game.flags.selectedIndices.indexOf(index);
    if (pos >= 0) game.flags.selectedIndices.splice(pos, 1);
    else game.flags.selectedIndices.push(index);
    renderInventory();
    updateBulkSellBtn();
}

function updateBulkSellBtn() {
    const btn = document.getElementById('btn-confirm-sell');
    if(!btn) return;

    if(game.flags.selectedIndices.length > 0) {
        let total = 0;
        game.flags.selectedIndices.forEach(idx => {
            total += getSellPrice(game.inventory[idx]) * game.inventory[idx].count;
        });
        btn.innerText = `出售选中 (${formatBytes(total)})`;
        btn.disabled = false;
        btn.classList.add('can-buy');
    } else {
        btn.innerText = "请选择物品";
        btn.disabled = true;
        btn.classList.remove('can-buy');
    }
}

window.sellSelected = function() {
    if (game.flags.selectedIndices.length === 0) return;
    let totalGain = 0;
    game.flags.selectedIndices.sort((a, b) => b - a);
    game.flags.selectedIndices.forEach(index => {
        const item = game.inventory[index];
        totalGain += getSellPrice(item) * item.count;
        game.inventory.splice(index, 1);
    });
    game.bytes += totalGain;
    showToast(`出售成功！获得 ${formatBytes(totalGain)}`, '#ffd700');
    window.toggleSellMode();
    saveGame();
    updateUI();
};

window.sellByRarity = function(rarityKey) {
    const levels = ['common', 'uncommon', 'rare', 'legendary', 'mythic'];
    const targetLvl = levels.indexOf(rarityKey);
    let totalGain = 0;

    const newInventory = game.inventory.filter(item => {
        const itemLvl = levels.indexOf(item.rarity);
        if (itemLvl <= targetLvl) {
            totalGain += getSellPrice(item) * item.count;
            return false;
        }
        return true;
    });

    if (game.inventory.length === newInventory.length) {
        showToast("没有符合条件的物品", "#fff");
        return;
    }

    if (confirm(`确定要出售所有 [${LootConfig.rarity[rarityKey].name}] 及以下的物品吗？\n预计获得: ${formatBytes(totalGain)}`)) {
        game.inventory = newInventory;
        game.bytes += totalGain;
        showToast(`回收完成！获得 ${formatBytes(totalGain)}`, '#ffd700');
        saveGame();
        renderInventory();
        updateUI();
    }
};

window.sellOneItem = function(index) {
    const item = game.inventory[index];
    const price = getSellPrice(item);
    game.bytes += price;
    if (item.count > 1) item.count--;
    else game.inventory.splice(index, 1);

    document.getElementById('item-info-panel').innerText = "已出售";
    updateUI();
    renderInventory();
    saveGame();
    spawnFloatingText(price, 'auto');
};

window.showItemOptions = function(index) {
    const item = game.inventory[index];
    const infoPanel = document.getElementById('item-info-panel');
    if(!infoPanel) return;

    const rarityCfg = LootConfig.rarity[item.rarity];
    const valStr = formatStat(item.type, item.value);
    const price = getSellPrice(item);

    infoPanel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
            <span style="color: ${rarityCfg.color}; font-weight:bold;">${rarityCfg.name} ${item.name}</span>
            <span style="font-size:0.8em; color:#666">库存: ${item.count}</span>
        </div>
        <div style="margin:5px 0; color:#ddd">${item.desc} <span style="color:${rarityCfg.color}">(${valStr})</span></div>
        <div style="margin-top:5px; display:flex; gap:10px;">
            <button class="buy-btn" onclick="equipItem(${index})">装备</button>
            <button class="buy-btn" style="background:#444; border-color:#666" onclick="sellOneItem(${index})">
                出售 (⚡${formatBytes(price)})
            </button>
        </div>
    `;
};

// --- 7. 视觉特效 (Visuals) ---
function updateCoreVisuals() {
    if (!visualEls.core) return;
    const p = game.stats.clickPower;
    visualEls.core.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4');
    if (p < 50) visualEls.core.classList.add('tier-1');
    else if (p < 500) visualEls.core.classList.add('tier-2');
    else if (p < 5000) visualEls.core.classList.add('tier-3');
    else visualEls.core.classList.add('tier-4');
}

function spawnFloatingText(amount, type) {
    if (playerSettings.reducedMotion) return;
    const container = document.getElementById('floating-text-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'float-text';

    if (type === 'crit') {
        el.innerText = '💥 ' + formatBytes(amount);
        el.classList.add('float-crit');
    } else if (type === 'money') {
        el.innerText = '💰 +' + formatBytes(amount);
        el.style.color = '#ffd700';
        el.style.fontSize = '1.4rem';
        el.style.zIndex = '20';
        el.style.textShadow = '0 0 5px #000';
    } else if (type === 'auto') {
        el.innerText = '-' + formatBytes(amount);
        el.classList.add('float-auto');
    } else if (type === 'damage') {
        el.innerText = '-' + formatBytes(amount);
        el.classList.add('float-normal');
    } else {
        // 兼容回退
        el.innerText = '+' + formatBytes(amount);
        if(amount < 100) el.classList.add('float-normal');
        else el.classList.add('float-high');
    }

    const x = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
    const y = window.innerHeight / 2 - 100 + (Math.random() - 0.5) * 50;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function createRipple(color) {
    if (playerSettings.reducedMotion) return;
    if (!visualEls.rippleContainer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    if(color === 'red') ripple.style.borderColor = '#ff003c';
    visualEls.rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 悬浮窗逻辑
function showTooltip(item) {
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
                    if (isPct(item.type)) diffStr = `${sign}${(diff * 100).toFixed(1)}%`;
                    else diffStr = `${sign}${Math.floor(diff)}`;

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

function moveTooltip(e) {
    if (!visualEls.tooltip) return;
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    const rect = visualEls.tooltip.getBoundingClientRect();
    const finalX = (x + rect.width > window.innerWidth) ? e.clientX - rect.width - 10 : x;
    const finalY = (y + rect.height > window.innerHeight) ? e.clientY - rect.height - 10 : y;
    visualEls.tooltip.style.left = `${finalX}px`;
    visualEls.tooltip.style.top = `${finalY}px`;
}

function hideTooltip() {
    if (visualEls.tooltip) visualEls.tooltip.style.display = 'none';
}

function getStatName(type) {
    const map = {
        clickFlat: '点击加成', autoFlat: '自动加成', clickPct: '点击加成', autoPct: '自动加成',
        critChance: '暴击率', critDmg: '暴击伤害', discount: '商店折扣', luck: '幸运值'
    };
    return map[type] || '属性';
}

function formatStat(type, value) {
    // 判断是否为百分比类型
    if (isPct(type)) {
        return `+${(value * 100).toFixed(1)}%`;
    }
    // 固定值类型
    return `+${Math.floor(value)}`;
}

function isPct(type) {
    // 百分比类型：Pct（百分比加成）, Chance（概率）, Dmg（伤害倍率）, discount（折扣）, luck（幸运值）
    return type.includes('Pct') || type.includes('Chance') || type.includes('Dmg') || type.includes('discount') || type.includes('luck');
}

// --- 8. 渲染 (UI Render) ---
function renderShop() {
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
            div.onclick = () => window.buyItem(item.id);

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

function renderInventory() {
    const grid = document.getElementById('backpack-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const bagCount = document.getElementById('bag-count');
    if(bagCount) {
        const maxInv = LootConfig.settings.maxInventory + (game.skills && game.skills['skill_inventory'] ? game.skills['skill_inventory'] * 20 : 0);
        bagCount.innerText = `${game.inventory.length}/${maxInv}`;
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
            if (game.flags.sellMode) window.toggleSelection(index);
            else window.showItemOptions(index);
        };

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
            slotEl.onmouseenter = null;
            slotEl.onmousemove = null;
            slotEl.onmouseleave = null;
        }
    }
}

function updateUI() {
    renderDashboard();
    // 更新顶部的钱
    const topScore = document.getElementById('top-score');
    if(topScore) topScore.innerText = formatBytes(game.bytes);

    // 兼容挖掘界面的旧显示
    const oldScore = document.querySelector('.score-board span');
    if(oldScore) oldScore.innerText = formatBytes(game.bytes);

    const statsHTML = `
        <p>点击: <span class="val" style="color:#fff">${formatBytes(game.stats.clickPower)}</span> 
           <span style="font-size:0.8em; color:#ff003c">(${ (game.stats.critChance*100).toFixed(0) }% / x${game.stats.critDamage.toFixed(1)})</span>
        </p>
        <p>自动: <span class="val" style="color:#fff">${formatBytes(game.stats.autoPower)}</span>/s</p>
        <p style="font-size:0.8em; color:#888; margin-top:5px;">
           运气: <span style="color:#ffd700">${ (game.stats.luck * 100).toFixed(0) }%</span> 
           折扣: <span style="color:#00e5ff">-${ (game.stats.discount * 100).toFixed(0) }%</span>
        </p>
    `;
    const statsEl = document.querySelector('.stats');
    if(statsEl) statsEl.innerHTML = statsHTML;

    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const quote = getPurchaseQuote(item);
            const cost = quote.count ? quote.cost : getCost(item);
            const btn = document.getElementById(`btn-${item.id}`);
            const lvlLabel = document.getElementById(`lvl-${item.id}`);

            if (btn) {
                if (btn.innerText !== "GET!") {
                    btn.innerText = `${formatBytes(cost)} B${quote.count > 1 ? ` ×${quote.count}` : ''}`;
                }
                btn.disabled = !quote.count;
                if (game.bytes >= cost) btn.classList.add('can-buy');
                else btn.classList.remove('can-buy');
            }
            if(lvlLabel) lvlLabel.innerText = `(Lv.${game.levels[item.id]||0})`;
        });
    });
}

// --- 9. 主循环与初始化 ---
function handleClick() {
    // 应用事件效果
    const bytesMult = getActiveEventMultiplier('bytesMultiplier');
    const clickMult = getActiveEventMultiplier('clickPowerMultiplier');
    
    // 应用Buff中的bytesMultiplier和点击倍率
    if (!game.activeBuffs) game.activeBuffs = [];
    const now = Date.now();
    game.activeBuffs = game.activeBuffs.filter(b => b && b.endTime > now);
    
    const buffBytesMult = game.activeBuffs.find(b => b && b.type === 'bytesMultiplier');
    const totalBytesMult = bytesMult * (buffBytesMult ? buffBytesMult.value : 1);
    
    // 应用点击倍率buff
    let clickBuffMult = 1;
    game.activeBuffs.forEach(buff => {
        if (buff.type === 'clickPowerMult' || buff.type === 'allDamageMult') {
            clickBuffMult *= buff.value;
        }
    });
    
    let damage = game.stats.clickPower * clickMult * clickBuffMult;
    let isCrit = false;

    if (Math.random() < game.stats.critChance) {
        damage *= game.stats.critDamage;
        isCrit = true;
        game.stats.totalCrits++;
    }

    // 统计
    game.stats.totalClicks++;
    const bytesEarned = damage * totalBytesMult;
    game.bytes += bytesEarned;
    game.stats.totalBytesEarned += bytesEarned;
    
    // 更新Bytes任务进度
    updateBytesQuestProgress(bytesEarned);

    // 攻击敌人
    damageEnemy(damage);

    // 视觉反馈
    if (visualEls.core) {
        visualEls.core.classList.remove('core-active', 'core-active-crit');
        void visualEls.core.offsetWidth;
        visualEls.core.classList.add(isCrit ? 'core-active-crit' : 'core-active');
        setTimeout(() => visualEls.core.classList.remove('core-active', 'core-active-crit'), 100);
    }

    createRipple(isCrit ? 'red' : 'green');
    spawnFloatingText(damage, isCrit ? 'crit' : 'damage');

    // 更新任务进度
    updateQuestProgress('click', 1);
    
    // 检查成就
    checkAchievements();
    
    // 尝试触发事件
    trySpawnEvent();

    // 更新UI（钱变了）
    updateUI();
    
    // 如果在技能页面，实时更新技能按钮状态
    const skillsView = document.getElementById('view-skills');
    if (skillsView && skillsView.style.display !== 'none') {
        updateSkillButtons();
    }
}

function createSaveData() {
    return {
        version: 4,
        savedAt: Date.now(),
        bytes: game.bytes,
        levels: game.levels,
        inventory: game.inventory,
        equipped: game.equipped,
        combatLevel: game.combat.level,
        stats: game.stats,
        achievements: game.achievements,
        dailyQuests: game.dailyQuests,
        skills: game.skills,
        lastEventTime: game.lastEventTime,
        chests: game.chests,
        activeBuffs: game.activeBuffs
    };
}

function saveGame() {
    if (replacingSave) return false;
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(createSaveData()));
    } catch (error) {
        document.getElementById('save-status').textContent = '保存失败，请导出备份';
        return false;
    }
    const status = document.getElementById('save-status');
    if (status) {
        status.innerText = '已自动存档';
        status.title = new Date().toLocaleTimeString();
    }
    return true;
}

function loadGame() {
    let save;
    let offlineSince = null;
    try { save = localStorage.getItem('CyberMinerSave_v3'); } catch (_) { /* export remains available */ }
    if (save) {
        try {
            const data = JSON.parse(save);
            offlineSince = data.savedAt;
            game.bytes = data.bytes || 0;
            game.levels = data.levels || {};
            game.inventory = data.inventory || [];
            game.equipped = data.equipped || { cpu: null, ram: null, disk: null, net: null, pwr: null };
            game.inventory.forEach(i => { if(!i.count) i.count = 1; });
            game.combat.level = data.combatLevel || 1;
            
            // 加载新功能数据
            if (data.stats) {
                // 合并统计，确保新字段有默认值
                game.stats = {
                    ...game.stats,
                    ...data.stats
                };
            }
            if (data.achievements) {
                game.achievements = {
                    unlocked: data.achievements.unlocked || [],
                    progress: data.achievements.progress || {}
                };
            }
            if (data.dailyQuests) {
                game.dailyQuests = {
                    date: data.dailyQuests.date || new Date().toDateString(),
                    quests: data.dailyQuests.quests || [],
                    progress: data.dailyQuests.progress || {}
                };
            }
            if (data.skills) {
                game.skills = data.skills;
            }
            game.lastEventTime = data.lastEventTime || 0;
            if (data.chests) {
                game.chests = data.chests;
            }
            if (data.activeBuffs) {
                // 恢复buff，但需要重新计算结束时间
                game.activeBuffs = data.activeBuffs.map(buff => {
                    const remaining = buff.endTime - Date.now();
                    if (remaining > 0) {
                        return {
                            ...buff,
                            endTime: Date.now() + remaining
                        };
                    }
                    return null;
                }).filter(b => b !== null);
            }
        } catch (e) {
            console.error('加载存档失败:', e);
        }
    }
    
    // 初始化每日任务（必须在加载后调用，以便检查日期）
    initDailyQuests();
    
    recalcPower();
    renderInventory();
    renderChests();
    renderBuffs();

    // 初始化怪物
    spawnEnemy();
    grantOfflineIncome(offlineSince);
}

window.resetGame = function() {
    if (confirm('确定要清空数据重来吗？')) {
        localStorage.removeItem('CyberMinerSave_v3');
        replacingSave = true;
        location.reload();
    }
};

// 转换背包中已有的固定值装备为百分比
function convertFlatToPct() {
    if (!game.inventory) return;
    
    let converted = 0;
    game.inventory.forEach(item => {
        if (item.type === 'clickFlat' || item.type === 'autoFlat') {
            // 找到对应的基础装备配置
            const baseItem = LootConfig.equipmentBase.find(b => b.name === item.baseId || b.name === item.name);
            if (baseItem) {
                // 如果基础装备已经是百分比类型，转换当前装备
                if (baseItem.type === 'clickPct' || baseItem.type === 'autoPct') {
                    // 计算原始固定值对应的百分比（假设基础算力为100）
                    // 固定值10 -> 百分比0.1 (10%)
                    // 固定值50 -> 百分比0.5 (50%)
                    // 但更合理的是直接使用基础装备的baseVal和稀有度倍数
                    const rarityCfg = LootConfig.rarity[item.rarity];
                    const newValue = baseItem.baseVal * rarityCfg.multiplier;
                    
                    item.type = baseItem.type;
                    item.value = newValue;
                    item.desc = baseItem.desc;
                    converted++;
                }
            } else {
                // 如果找不到基础装备，根据固定值估算百分比
                // 假设基础算力为100，固定值10 = 10% = 0.1
                if (item.type === 'clickFlat') {
                    item.type = 'clickPct';
                    item.value = item.value / 100; // 转换为百分比
                    item.desc = item.desc.replace('+', '+').replace(/\d+/, (item.value * 100).toFixed(0) + '%');
                } else if (item.type === 'autoFlat') {
                    item.type = 'autoPct';
                    item.value = item.value / 100; // 转换为百分比
                    item.desc = item.desc.replace('+', '+').replace(/\d+/, (item.value * 100).toFixed(0) + '%');
                }
                converted++;
            }
        }
    });
    
    // 同样转换已装备的物品
    for (let slot in game.equipped) {
        const item = game.equipped[slot];
        if (item && (item.type === 'clickFlat' || item.type === 'autoFlat')) {
            const baseItem = LootConfig.equipmentBase.find(b => b.name === item.baseId || b.name === item.name);
            if (baseItem) {
                if (baseItem.type === 'clickPct' || baseItem.type === 'autoPct') {
                    const rarityCfg = LootConfig.rarity[item.rarity];
                    const newValue = baseItem.baseVal * rarityCfg.multiplier;
                    
                    item.type = baseItem.type;
                    item.value = newValue;
                    item.desc = baseItem.desc;
                    converted++;
                }
            } else {
                if (item.type === 'clickFlat') {
                    item.type = 'clickPct';
                    item.value = item.value / 100;
                    item.desc = item.desc.replace('+', '+').replace(/\d+/, (item.value * 100).toFixed(0) + '%');
                } else if (item.type === 'autoFlat') {
                    item.type = 'autoPct';
                    item.value = item.value / 100;
                    item.desc = item.desc.replace('+', '+').replace(/\d+/, (item.value * 100).toFixed(0) + '%');
                }
                converted++;
            }
        }
    }
    
    if (converted > 0) {
        console.log(`已转换 ${converted} 件固定值装备为百分比`);
        recalcPower();
        saveGame();
    }
}

function init() {
    console.log("游戏初始化...");

    renderShop();
    loadGame();
    
    // 转换已有的固定值装备为百分比
    convertFlatToPct();
    
    updateUI();
    
    // 初始化新功能界面
    initDailyQuests(); // 确保任务已初始化
    renderAchievements();
    renderQuests();
    renderCraft();
    renderSkills();
    renderChests();
    renderBuffs();

    // 自动挂机循环
    setInterval(() => {
        if (game.stats.autoPower > 0) {
            // 应用事件效果
            const bytesMult = getActiveEventMultiplier('bytesMultiplier');
            const autoMult = getActiveEventMultiplier('autoPowerMultiplier');
            
            // 应用Buff中的bytesMultiplier和自动倍率
            if (!game.activeBuffs) game.activeBuffs = [];
            const now = Date.now();
            game.activeBuffs = game.activeBuffs.filter(b => b && b.endTime > now);
            
            const buffBytesMult = game.activeBuffs.find(b => b && b.type === 'bytesMultiplier');
            const totalBytesMult = bytesMult * (buffBytesMult ? buffBytesMult.value : 1);
            
            // 应用自动倍率buff
            let autoBuffMult = 1;
            game.activeBuffs.forEach(buff => {
                if (buff.type === 'autoPowerMult' || buff.type === 'allDamageMult') {
                    autoBuffMult *= buff.value;
                }
            });
            
            let autoDamage = game.stats.autoPower * autoMult * autoBuffMult;
            
            // 自动暴击
            if (game.skills && game.skills['skill_auto_crit'] && Math.random() < 0.1) {
                autoDamage *= game.stats.critDamage;
            }

            // --- 修改：挂机同时产出钱 ---
            const bytesEarned = autoDamage * totalBytesMult;
            game.bytes += bytesEarned;
            game.stats.totalBytesEarned += bytesEarned;
            
            // 更新Bytes任务进度
            updateBytesQuestProgress(bytesEarned);
            // ---------------------------

            // 自动攻击
            damageEnemy(autoDamage);

            // 更新UI
            updateUI();
            
            // 如果在技能页面，实时更新技能按钮状态
            const skillsView = document.getElementById('view-skills');
            if (skillsView && skillsView.style.display !== 'none') {
                updateSkillButtons();
            }

            // 只有活着的时候才冒字
            if (game.combat.currentHp > 0) {
                spawnFloatingText(autoDamage, 'auto');
                if (visualEls.core) {
                    visualEls.core.classList.remove('core-auto-pulse');
                    void visualEls.core.offsetWidth;
                    visualEls.core.classList.add('core-auto-pulse');
                }
            }
            // 自动挂机概率掉落（应用事件效果）
            const dropMult = getActiveEventMultiplier('dropChanceMultiplier');
            const originalLuck = game.stats.luck;
            game.stats.luck *= dropMult;
            tryDrop('auto');
            game.stats.luck = originalLuck;
        }
    }, 1000);

    setInterval(saveGame, GameConfig.settings.autoSaveInterval);
    
    // Buff倒计时实时更新（每秒更新一次）
    setInterval(() => {
        if (game.dailyQuests.date !== new Date().toDateString()) {
            initDailyQuests();
            renderQuests();
        }
        updateBuffsTimer();
    }, 1000);

    // 绑定核心点击
    if (visualEls.core) {
        visualEls.core.addEventListener('click', handleClick);
        visualEls.core.addEventListener('mousedown', (e) => e.preventDefault());
    }
}

// ==========================================
// 新功能系统实现
// ==========================================

// --- 成就系统 ---
function checkAchievements() {
    if (!AchievementConfig) return;
    
    AchievementConfig.achievements.forEach(ach => {
        if (game.achievements.unlocked.includes(ach.id)) return;
        
        if (ach.check()) {
            game.achievements.unlocked.push(ach.id);
            game.bytes += ach.reward;
            showToast(`🏆 成就解锁: ${ach.name}！获得 ${formatBytes(ach.reward)}`, '#ffd700');
            spawnFloatingText(ach.reward, 'money');
            renderAchievements();
            saveGame();
        }
    });
}

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container || !AchievementConfig) return;
    
    container.innerHTML = '';
    const unlocked = new Set(game.achievements.unlocked);
    
    AchievementConfig.achievements.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'achievement-item card-style';
        if (unlocked.has(ach.id)) div.classList.add('unlocked');
        
        div.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-info">
                <h3>${ach.name}</h3>
                <p>${ach.desc}</p>
                <div class="achievement-reward">奖励: ${formatBytes(ach.reward)}</div>
            </div>
            ${unlocked.has(ach.id) ? '<div class="achievement-check">✓</div>' : ''}
        `;
        container.appendChild(div);
    });
}

// --- 每日任务系统 ---
function initDailyQuests() {
    const today = new Date().toDateString();
    const isNewDay = game.dailyQuests.date !== today;
    const needsInit = !game.dailyQuests.quests || game.dailyQuests.quests.length === 0;
    
    // 如果日期不同，或者任务列表为空，需要初始化
    if (isNewDay || needsInit) {
        // 如果是新的一天，重置进度
        if (isNewDay) {
            game.dailyQuests.progress = {};
        }
        
        // 确保进度对象存在
        if (!game.dailyQuests.progress) {
            game.dailyQuests.progress = {};
        }
        
        // 更新日期和任务列表
        game.dailyQuests.date = today;
        game.dailyQuests.quests = [...DailyQuestConfig.quests];
        
        // 确保所有任务都有进度记录
        DailyQuestConfig.quests.forEach(q => {
            if (game.dailyQuests.progress[q.id] === undefined) {
                game.dailyQuests.progress[q.id] = 0;
            }
        });
    }
}

function updateQuestProgress(type, amount = 1) {
    // 确保任务已初始化
    initDailyQuests();
    
    if (!game.dailyQuests.quests || game.dailyQuests.quests.length === 0) {
        console.warn('每日任务未初始化');
        return;
    }
    
    let progressUpdated = false;
    
    game.dailyQuests.quests.forEach(quest => {
        if (quest.type !== type) return;
        
        // 确保进度对象存在
        if (!game.dailyQuests.progress) {
            game.dailyQuests.progress = {};
        }
        
        const currentProgress = game.dailyQuests.progress[quest.id] || 0;
        if (currentProgress >= quest.target) return;
        
        const newProgress = Math.min(currentProgress + amount, quest.target);
        game.dailyQuests.progress[quest.id] = newProgress;
        progressUpdated = true;
        
        if (newProgress >= quest.target && currentProgress < quest.target) {
            game.bytes += quest.reward;
            showToast(`📋 任务完成: ${quest.name}！获得 ${formatBytes(quest.reward)}`, '#00e5ff');
            spawnFloatingText(quest.reward, 'money');
        }
    });
    
    if (progressUpdated) {
        saveGame();
        renderQuests();
    }
}

// 更新Bytes任务进度（单独处理，因为需要跟踪累计值）
function updateBytesQuestProgress(bytesEarned) {
    initDailyQuests();
    if (!game.dailyQuests.quests || game.dailyQuests.quests.length === 0) {
        initDailyQuests();
    }
    if (!game.dailyQuests.quests || game.dailyQuests.quests.length === 0) return;
    
    game.dailyQuests.quests.forEach(quest => {
        if (quest.type !== 'bytes') return;
        const currentProgress = game.dailyQuests.progress[quest.id] || 0;
        if (currentProgress >= quest.target) return;
        
        const newProgress = Math.min(currentProgress + bytesEarned, quest.target);
        game.dailyQuests.progress[quest.id] = newProgress;
        
        if (newProgress >= quest.target && currentProgress < quest.target) {
            game.bytes += quest.reward;
            showToast(`📋 任务完成: ${quest.name}！获得 ${formatBytes(quest.reward)}`, '#00e5ff');
            spawnFloatingText(quest.reward, 'money');
            saveGame();
        }
    });
    renderQuests();
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container || !DailyQuestConfig) return;
    
    container.innerHTML = '';
    
    // 确保使用当前日期任务
    const quests = game.dailyQuests.quests && game.dailyQuests.quests.length > 0 
        ? game.dailyQuests.quests 
        : DailyQuestConfig.quests;
    
    quests.forEach(quest => {
        const progress = game.dailyQuests.progress[quest.id] || 0;
        const completed = progress >= quest.target;
        
        const div = document.createElement('div');
        div.className = 'quest-item card-style';
        if (completed) div.classList.add('completed');
        
        const pct = Math.min(100, (progress / quest.target) * 100);
        
        div.innerHTML = `
            <div class="quest-header">
                <span class="quest-icon">${quest.icon}</span>
                <div class="quest-info">
                    <h3>${quest.name}</h3>
                    <p>${quest.desc}</p>
                </div>
                <div class="quest-reward">${formatBytes(quest.reward)}</div>
            </div>
            <div class="quest-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${pct}%"></div>
                </div>
                <span class="progress-text">${progress} / ${quest.target}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- 装备合成系统 ---
function renderCraft() {
    const container = document.getElementById('craft-container');
    if (!container || !CraftConfig) return;
    
    container.innerHTML = '';
    
    CraftConfig.recipes.forEach((recipe, idx) => {
        const div = document.createElement('div');
        div.className = 'craft-recipe card-style';
        
        const inputDesc = recipe.input.sameType 
            ? `${recipe.input.count}个${getRarityName(recipe.input.rarity)}同类型装备`
            : `${recipe.input.count}个任意${getRarityName(recipe.input.rarity)}装备`;
        
        // 检查是否有足够的材料
        const hasMaterials = checkCraftMaterials(recipe);
        const canAfford = game.bytes >= recipe.cost;
        const canCraft = hasMaterials && canAfford;
        
        div.innerHTML = `
            <div class="craft-info">
                <h3>${inputDesc}</h3>
                <p style="color:#00e5ff; margin: 5px 0;">→ 合成 →</p>
                <h3>1个${getRarityName(recipe.output.rarity)}装备</h3>
                <p style="color:#888; font-size:0.8rem; margin-top: 5px;">属性提升 ${((recipe.output.multiplier - 1) * 100).toFixed(0)}%</p>
            </div>
            <button class="buy-btn ${canCraft ? 'can-buy' : ''}" onclick="tryCraft(${idx})" id="craft-btn-${idx}">
                合成 (${formatBytes(recipe.cost)})
            </button>
        `;
        container.appendChild(div);
    });
}

function checkCraftMaterials(recipe) {
    const candidates = game.inventory.filter(item => item.rarity === recipe.input.rarity);
    
    if (recipe.input.sameType) {
        // 需要同类型，按类型分组
        const byType = {};
        candidates.forEach(item => {
            if (!byType[item.type]) byType[item.type] = [];
            byType[item.type].push(item);
        });
        
        // 找到有足够数量的类型
        for (let type in byType) {
            const total = byType[type].reduce((sum, item) => sum + item.count, 0);
            if (total >= recipe.input.count) {
                return true;
            }
        }
        return false;
    } else {
        // 任意类型，只要总数够就行
        const total = candidates.reduce((sum, item) => sum + item.count, 0);
        return total >= recipe.input.count;
    }
}

function getRarityName(rarity) {
    return LootConfig.rarity[rarity]?.name || rarity;
}

window.tryCraft = function(recipeIndex) {
    const recipe = CraftConfig.recipes[recipeIndex];
    if (!recipe) return;
    
    if (game.bytes < recipe.cost) {
        showToast('Bytes不足！', '#ff4d4d');
        return;
    }
    
    // 查找符合条件的装备
    let candidates = game.inventory.filter(item => item.rarity === recipe.input.rarity);
    
    if (recipe.input.sameType) {
        // 需要同类型，按类型分组
        const byType = {};
        candidates.forEach(item => {
            if (!byType[item.type]) byType[item.type] = [];
            byType[item.type].push(item);
        });
        
        // 找到有足够数量的类型
        let selectedType = null;
        for (let type in byType) {
            const total = byType[type].reduce((sum, item) => sum + item.count, 0);
            if (total >= recipe.input.count) {
                selectedType = type;
                break;
            }
        }
        
        if (!selectedType) {
            showToast(`需要${recipe.input.count}个同类型${getRarityName(recipe.input.rarity)}装备！`, '#ff4d4d');
            renderCraft(); // 更新按钮状态
            return;
        }
        
        candidates = byType[selectedType];
    }
    
    const total = candidates.reduce((sum, item) => sum + item.count, 0);
    if (total < recipe.input.count) {
        showToast(`需要${recipe.input.count}个${getRarityName(recipe.input.rarity)}装备！`, '#ff4d4d');
        renderCraft(); // 更新按钮状态
        return;
    }
    
    // 消耗装备
    let needed = recipe.input.count;
    const toRemove = [];
    candidates.forEach((item) => {
        if (needed <= 0) return;
        const use = Math.min(needed, item.count);
        item.count -= use;
        needed -= use;
        if (item.count <= 0) {
            const idx = game.inventory.indexOf(item);
            if (idx >= 0) toRemove.push(idx);
        }
    });
    
    toRemove.reverse().forEach(idx => game.inventory.splice(idx, 1));
    
    // 生成新装备
    let baseItem;
    if (recipe.output.random) {
        // 随机选择基础装备
        baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];
    } else {
        // 使用第一个装备的类型，从equipmentBase中找到对应的基础装备
        const firstCandidate = candidates[0];
        if (firstCandidate) {
            baseItem = LootConfig.equipmentBase.find(b => b.name === firstCandidate.baseId || b.name === firstCandidate.name);
        }
        // 如果找不到，随机选择一个
        if (!baseItem) {
            baseItem = LootConfig.equipmentBase[Math.floor(Math.random() * LootConfig.equipmentBase.length)];
        }
    }
    
    const newRarity = recipe.output.rarity;
    const rarityCfg = LootConfig.rarity[newRarity];
    
    // 计算新装备的值：基础值 * 稀有度倍数 * 合成配方倍数
    const newValue = baseItem.baseVal * rarityCfg.multiplier * recipe.output.multiplier;
    
    const newItem = {
        uid: Date.now() + Math.random(),
        baseId: baseItem.name,
        name: baseItem.name,
        slot: baseItem.slot,
        type: baseItem.type,
        rarity: newRarity,
        value: newValue,
        desc: baseItem.desc,
        count: 1
    };
    
    game.inventory.push(newItem);
    game.bytes -= recipe.cost;
    
    showToast(`合成成功！获得 [${rarityCfg.name}] ${newItem.name}`, rarityCfg.color);
    saveGame();
    renderInventory();
    renderCraft(); // 重新渲染以更新按钮状态
    updateUI();
};

// --- 随机事件系统 ---
function trySpawnEvent() {
    if (!EventConfig) return;
    const now = Date.now();
    if (now - game.lastEventTime < EventConfig.minInterval) return;
    if (Math.random() > EventConfig.spawnChance) return;
    
    const event = EventConfig.events[Math.floor(Math.random() * EventConfig.events.length)];
    activateEvent(event);
    game.lastEventTime = now;
}

function activateEvent(event) {
    game.activeEvents.push({
        id: event.id,
        name: event.name,
        desc: event.desc,
        icon: event.icon,
        endTime: Date.now() + event.duration,
        effect: event.effect
    });
    
    showEventNotification(event);
    
    if (event.duration > 0) {
        setTimeout(() => {
            removeEvent(event.id);
        }, event.duration);
    } else {
        // 立即生效的事件
        applyEventEffect(event);
    }
}

function showEventNotification(event) {
    const container = document.getElementById('event-notification');
    if (!container) return;
    
    container.innerHTML = `
        <div class="event-content">
            <span class="event-icon">${event.icon}</span>
            <div>
                <div class="event-title">${event.name}</div>
                <div class="event-desc">${event.desc}</div>
            </div>
        </div>
    `;
    container.style.display = 'block';
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

function removeEvent(eventId) {
    game.activeEvents = game.activeEvents.filter(e => e.id !== eventId);
}

function applyEventEffect(event) {
    if (event.effect.bytesReward) {
        const reward = typeof event.effect.bytesReward === 'function' 
            ? event.effect.bytesReward() 
            : event.effect.bytesReward;
        game.bytes += reward;
        spawnFloatingText(reward, 'money');
        showToast(`获得 ${formatBytes(reward)}！`, '#ffd700');
    }
    
    if (event.effect.bytesPenalty) {
        const penalty = typeof event.effect.bytesPenalty === 'function'
            ? event.effect.bytesPenalty()
            : event.effect.bytesPenalty;
        game.bytes = Math.max(0, game.bytes - penalty);
        showToast(`损失 ${formatBytes(penalty)}`, '#ff4d4d');
    }
    
    if (event.effect.itemReward) {
        for (let i = 0; i < event.effect.itemReward.count; i++) {
            generateLoot('click');
        }
    }
    
    updateUI();
}

function getActiveEventMultiplier(type) {
    let mult = 1;
    game.activeEvents.forEach(event => {
        if (event.effect[type]) {
            mult *= event.effect[type];
        }
    });
    return mult;
}

// --- 技能树系统 ---
function renderSkills() {
    const container = document.getElementById('skills-container');
    if (!container || !SkillTreeConfig) return;
    
    container.innerHTML = '';
    
    SkillTreeConfig.skills.forEach(skill => {
        const level = game.skills[skill.id] || 0;
        const canUpgrade = canUpgradeSkill(skill);
        const cost = getSkillCost(skill, level);
        const canAfford = game.bytes >= cost;
        
        const div = document.createElement('div');
        div.className = 'skill-item card-style';
        if (level >= skill.maxLevel) div.classList.add('maxed');
        if (!canUpgrade) div.classList.add('locked');
        
        div.innerHTML = `
            <div class="skill-header">
                <span class="skill-icon">${skill.icon}</span>
                <div class="skill-info">
                    <h3>${skill.name} (${level}/${skill.maxLevel})</h3>
                    <p>${skill.desc}</p>
                </div>
            </div>
            <div class="skill-cost">
                ${level >= skill.maxLevel 
                    ? '<span style="color:#888">已满级</span>'
                    : `<button class="buy-btn ${canUpgrade && canAfford ? 'can-buy' : ''}" onclick="upgradeSkill('${skill.id}')" id="skill-btn-${skill.id}">
                       升级 (${formatBytes(cost)})
                   </button>`
                }
            </div>
        `;
        container.appendChild(div);
    });
}

function canUpgradeSkill(skill) {
    if (!skill.requires) return true;
    return skill.requires.every(reqId => (game.skills[reqId] || 0) > 0);
}

function getSkillCost(skill, currentLevel) {
    return Math.floor(skill.cost * Math.pow(1.5, currentLevel));
}

// 更新技能按钮状态（不重新渲染整个列表，只更新按钮）
function updateSkillButtons() {
    if (!SkillTreeConfig) return;
    
    SkillTreeConfig.skills.forEach(skill => {
        const level = game.skills[skill.id] || 0;
        const btn = document.getElementById(`skill-btn-${skill.id}`);
        if (!btn) return;
        
        if (level >= skill.maxLevel) {
            btn.outerHTML = '<span style="color:#888">已满级</span>';
            return;
        }
        
        const canUpgrade = canUpgradeSkill(skill);
        const cost = getSkillCost(skill, level);
        const canAfford = game.bytes >= cost;
        
        btn.innerText = `升级 (${formatBytes(cost)})`;
        if (canUpgrade && canAfford) {
            btn.classList.add('can-buy');
        } else {
            btn.classList.remove('can-buy');
        }
    });
}

window.upgradeSkill = function(skillId) {
    const skill = SkillTreeConfig.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    const level = game.skills[skillId] || 0;
    if (level >= skill.maxLevel) return;
    if (!canUpgradeSkill(skill)) {
        showToast('需要先学习前置技能！', '#ff4d4d');
        return;
    }
    
    const cost = getSkillCost(skill, level);
    if (game.bytes < cost) {
        showToast('Bytes不足！', '#ff4d4d');
        return;
    }
    
    game.bytes -= cost;
    game.skills[skillId] = level + 1;
    
    // 应用技能效果
    recalcPower();
    
    showToast(`技能升级: ${skill.name}`, '#00ff41');
    saveGame();
    updateUI();
    renderSkills(); // 重新渲染以更新价格和按钮状态
};



// 标签页切换
window.switchTab = function(tabName) {
    // 隐藏所有视图
    const views = ['view-mining', 'view-shop', 'view-achievements', 'view-quests', 'view-craft', 'view-skills', 'view-chests', 'view-settings'];
    views.forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = 'none';
        }
    });

    // 显示目标视图
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) {
        targetView.style.display = 'block';
    } else {
        console.error(`视图 view-${tabName} 不存在`);
        // 如果目标视图不存在，显示挖掘界面
        const miningView = document.getElementById('view-mining');
        if (miningView) {
            miningView.style.display = 'block';
        }
        return;
    }

    // 更新导航按钮状态
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    const tabMap = { mining: 0, shop: 1, achievements: 2, quests: 3, craft: 4, skills: 5, chests: 6, settings: 7 };
    if (tabMap[tabName] !== undefined && navItems[tabMap[tabName]]) {
        navItems[tabMap[tabName]].classList.add('active');
    }

    // 根据标签页执行相应操作
    if (tabName === 'mining') {
        updateUI();
    } else if (tabName === 'shop') {
        updateUI();
    } else if (tabName === 'achievements') {
        renderAchievements();
    } else if (tabName === 'quests') {
        renderQuests();
    } else if (tabName === 'craft') {
        renderCraft();
    } else if (tabName === 'skills') {
        updateUI(); // 先更新UI确保Bytes是最新的
        renderSkills();
    } else if (tabName === 'chests') {
        renderChests();
    } else if (tabName === 'settings') {
        renderDashboard();
    }
};

// 启动引擎
init();
initEnhancements();
