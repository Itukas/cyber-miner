/**
 * 新功能配置文件：成就、任务、合成、事件、技能树
 */

// 成就系统配置
const AchievementConfig = {
    achievements: [
        // 进度类成就
        { id: 'first_click', name: '初次点击', desc: '完成第一次点击', icon: '👆', reward: 100, check: () => game.stats.totalClicks >= 1 },
        { id: 'click_100', name: '点击狂人', desc: '累计点击100次', icon: '👆', reward: 500, check: () => game.stats.totalClicks >= 100 },
        { id: 'click_1000', name: '点击大师', desc: '累计点击1000次', icon: '👆', reward: 5000, check: () => game.stats.totalClicks >= 1000 },
        { id: 'level_10', name: '初出茅庐', desc: '达到第10关', icon: '🎯', reward: 1000, check: () => game.combat.level >= 10 },
        { id: 'level_50', name: '经验丰富', desc: '达到第50关', icon: '🎯', reward: 50000, check: () => game.combat.level >= 50 },
        { id: 'level_100', name: '传奇战士', desc: '达到第100关', icon: '🎯', reward: 500000, check: () => game.combat.level >= 100 },
        { id: 'bytes_1k', name: '小有积蓄', desc: '累计获得1k Bytes', icon: '💰', reward: 200, check: () => game.stats.totalBytesEarned >= 1000 },
        { id: 'bytes_1m', name: '百万富翁', desc: '累计获得1M Bytes', icon: '💰', reward: 50000, check: () => game.stats.totalBytesEarned >= 1000000 },
        { id: 'bytes_1b', name: '亿万富翁', desc: '累计获得1B Bytes', icon: '💰', reward: 5000000, check: () => game.stats.totalBytesEarned >= 1000000000 },
        
        // 装备类成就
        { id: 'equip_first', name: '初次装备', desc: '装备第一件物品', icon: '🎒', reward: 200, check: () => Object.values(game.equipped).some(e => e !== null) },
        { id: 'legendary_equip', name: '传说装备', desc: '装备一件传说品质物品', icon: '⭐', reward: 10000, check: () => Object.values(game.equipped).some(e => e && e.rarity === 'legendary') },
        { id: 'mythic_equip', name: '神话装备', desc: '装备一件神话品质物品', icon: '💎', reward: 100000, check: () => Object.values(game.equipped).some(e => e && e.rarity === 'mythic') },
        { id: 'inventory_50', name: '收藏家', desc: '背包拥有50件物品', icon: '📦', reward: 5000, check: () => game.inventory.length >= 50 },
        
        // 战斗类成就
        { id: 'first_boss', name: '首战告捷', desc: '击败第一个BOSS', icon: '👹', reward: 2000, check: () => game.stats.bossKills >= 1 },
        { id: 'boss_10', name: 'BOSS杀手', desc: '击败10个BOSS', icon: '👹', reward: 50000, check: () => game.stats.bossKills >= 10 },
        { id: 'crit_100', name: '暴击专家', desc: '累计触发100次暴击', icon: '💥', reward: 5000, check: () => game.stats.totalCrits >= 100 },
        
        // 商店类成就
        { id: 'buy_10', name: '购物狂', desc: '购买10次升级', icon: '🛒', reward: 1000, check: () => Object.values(game.levels).reduce((a, b) => a + b, 0) >= 10 },
        { id: 'buy_100', name: '升级达人', desc: '购买100次升级', icon: '🛒', reward: 50000, check: () => Object.values(game.levels).reduce((a, b) => a + b, 0) >= 100 },
    ]
};

// 每日任务配置
const DailyQuestConfig = {
    quests: [
        { id: 'daily_click_50', name: '点击50次', desc: '今天点击50次', icon: '👆', reward: 500, target: 50, type: 'click' },
        { id: 'daily_level_5', name: '通关5关', desc: '今天通关5关', icon: '🎯', reward: 1000, target: 5, type: 'level' },
        { id: 'daily_equip_3', name: '装备3件', desc: '今天装备3件物品', icon: '🎒', reward: 800, target: 3, type: 'equip' },
        { id: 'daily_bytes_10k', name: '赚取10k', desc: '今天赚取10k Bytes', icon: '💰', reward: 2000, target: 10000, type: 'bytes' },
        { id: 'daily_boss_1', name: '击败BOSS', desc: '今天击败1个BOSS', icon: '👹', reward: 3000, target: 1, type: 'boss' },
    ]
};

// 装备合成配置
const CraftConfig = {
    recipes: [
        // 3个同品质同类型 -> 1个高一级品质
        { 
            input: { rarity: 'common', count: 3, sameType: true }, 
            output: { rarity: 'uncommon', multiplier: 1.2 },
            cost: 100
        },
        { 
            input: { rarity: 'uncommon', count: 3, sameType: true }, 
            output: { rarity: 'rare', multiplier: 1.2 },
            cost: 500
        },
        { 
            input: { rarity: 'rare', count: 3, sameType: true }, 
            output: { rarity: 'legendary', multiplier: 1.2 },
            cost: 2000
        },
        { 
            input: { rarity: 'legendary', count: 3, sameType: true }, 
            output: { rarity: 'mythic', multiplier: 1.2 },
            cost: 10000
        },
        // 5个任意同品质 -> 1个随机高一级品质
        { 
            input: { rarity: 'common', count: 5, sameType: false }, 
            output: { rarity: 'uncommon', multiplier: 1.0, random: true },
            cost: 200
        },
        { 
            input: { rarity: 'uncommon', count: 5, sameType: false }, 
            output: { rarity: 'rare', multiplier: 1.0, random: true },
            cost: 1000
        },
    ]
};

// 随机事件配置
const EventConfig = {
    events: [
        {
            id: 'lucky_strike',
            name: '幸运一击',
            desc: '接下来30秒内，所有收益翻倍！',
            icon: '🍀',
            duration: 30000,
            effect: { bytesMultiplier: 2, dropChanceMultiplier: 2 }
        },
        {
            id: 'speed_boost',
            name: '速度爆发',
            desc: '接下来20秒内，点击速度提升50%！',
            icon: '⚡',
            duration: 20000,
            effect: { clickPowerMultiplier: 1.5 }
        },
        {
            id: 'treasure_chest',
            name: '宝藏箱',
            desc: '发现一个宝藏箱！',
            icon: '💎',
            duration: 0,
            effect: { bytesReward: () => game.bytes * 0.1, itemReward: { rarity: 'rare', count: 1 } }
        },
        {
            id: 'hacker_attack',
            name: '黑客攻击',
            desc: '遭到黑客攻击！损失10% Bytes，但获得3倍掉落率持续1分钟',
            icon: '👾',
            duration: 60000,
            effect: { bytesPenalty: () => game.bytes * 0.1, dropChanceMultiplier: 3 }
        },
        {
            id: 'energy_surge',
            name: '能量爆发',
            desc: '能量爆发！自动算力提升100%持续30秒',
            icon: '💥',
            duration: 30000,
            effect: { autoPowerMultiplier: 2 }
        }
    ],
    spawnChance: 0.001, // 每次点击/自动挖矿时触发概率
    minInterval: 60000 // 最小间隔60秒
};

// 技能树配置
const SkillTreeConfig = {
    skills: [
        // 第一层：基础增强
        {
            id: 'skill_click_base',
            name: '点击基础',
            desc: '基础点击力 +10%',
            icon: '👆',
            cost: 1000,
            maxLevel: 10,
            effect: { clickPowerBase: 0.1 }
        },
        {
            id: 'skill_auto_base',
            name: '自动基础',
            desc: '基础自动算力 +10%',
            icon: '⚙️',
            cost: 1000,
            maxLevel: 10,
            effect: { autoPowerBase: 0.1 }
        },
        {
            id: 'skill_crit_chance',
            name: '暴击概率',
            desc: '暴击率 +2%',
            icon: '💥',
            cost: 2000,
            maxLevel: 10,
            effect: { critChance: 0.02 }
        },
        {
            id: 'skill_crit_damage',
            name: '暴击伤害',
            desc: '暴击伤害 +10%',
            icon: '💥',
            cost: 2000,
            maxLevel: 10,
            effect: { critDamage: 0.1 }
        },
        // 第二层：进阶增强
        {
            id: 'skill_luck',
            name: '幸运值',
            desc: '装备掉落率 +5%',
            icon: '🍀',
            cost: 5000,
            maxLevel: 5,
            requires: ['skill_click_base'],
            effect: { luck: 0.05 }
        },
        {
            id: 'skill_discount',
            name: '商店折扣',
            desc: '商店价格 -2%',
            icon: '💳',
            cost: 5000,
            maxLevel: 5,
            requires: ['skill_auto_base'],
            effect: { discount: 0.02 }
        },
        {
            id: 'skill_inventory',
            name: '背包扩容',
            desc: '背包容量 +20',
            icon: '📦',
            cost: 3000,
            maxLevel: 5,
            effect: { inventorySize: 20 }
        },
        // 第三层：高级技能
        {
            id: 'skill_double_drop',
            name: '双倍掉落',
            desc: '有5%概率掉落双倍物品',
            icon: '✨',
            cost: 20000,
            maxLevel: 1,
            requires: ['skill_luck'],
            effect: { doubleDropChance: 0.05 }
        },
        {
            id: 'skill_auto_crit',
            name: '自动暴击',
            desc: '自动攻击也有10%暴击率',
            icon: '⚡',
            cost: 25000,
            maxLevel: 1,
            requires: ['skill_crit_chance'],
            effect: { autoCritChance: 0.1 }
        },
        {
            id: 'skill_boss_reward',
            name: 'BOSS奖励',
            desc: 'BOSS掉落奖励 +50%',
            icon: '👹',
            cost: 30000,
            maxLevel: 1,
            requires: ['skill_crit_damage'],
            effect: { bossRewardMultiplier: 1.5 }
        }
    ]
};
