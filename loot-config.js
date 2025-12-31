const LootConfig = {
    // 稀有度配置 (增加 sellMult: 出售价格倍率)
    rarity: {
        common:    { name: '普通', color: '#b0b0b0', multiplier: 1, prob: 0.60, sellMult: 1 },
        uncommon:  { name: '优秀', color: '#00ff41', multiplier: 2, prob: 0.25, sellMult: 2 },
        rare:      { name: '精良', color: '#00e5ff', multiplier: 5, prob: 0.10, sellMult: 5 },
        legendary: { name: '传说', color: '#ffa500', multiplier: 15, prob: 0.04, sellMult: 20 },
        mythic:    { name: '神话', color: '#ff003c', multiplier: 50, prob: 0.01, sellMult: 100 }
    },

    // 掉落规则设置
    settings: {
        dropChanceClick: 0.05,
        dropChanceAuto: 0.02,
        maxInventory: 200,       // 堆叠后可以适当扩容背包
        baseSellPrice: 50       // 基础回收价格 (普通装备卖50)
    },

    // 装备底材池
    equipmentBase: [
        { name: '超频芯片', slot: 'cpu', type: 'clickPct', baseVal: 0.1, desc: '点击算力 +10%' },
        { name: '量子核心', slot: 'cpu', type: 'autoPct', baseVal: 0.1, desc: '自动算力 +10%' },
        { name: '高速缓存', slot: 'ram', type: 'clickFlat', baseVal: 10, desc: '点击算力 +10' },
        { name: 'ECC内存', slot: 'ram', type: 'autoFlat', baseVal: 50, desc: '自动算力 +50' },
        { name: '光纤线缆', slot: 'net', type: 'clickFlat', baseVal: 5, desc: '点击算力 +5' },
        { name: '5G模块',   slot: 'net', type: 'autoFlat', baseVal: 20, desc: '自动算力 +20' },
        { name: '瞄准辅助', slot: 'cpu', type: 'critChance', baseVal: 0.05, desc: '暴击率 +5%' },
        { name: '爆伤模组', slot: 'cpu', type: 'critDmg', baseVal: 0.5, desc: '暴击伤害 +50%' },
        { name: '黑市会员卡', slot: 'disk', type: 'discount', baseVal: 0.02, desc: '商店价格 -2%' },
        { name: '幸运硬币', slot: 'disk', type: 'luck', baseVal: 0.1, desc: '装备掉率 +10%' },
        { name: '盗版协议', slot: 'net', type: 'luck', baseVal: 0.05, desc: '装备掉率 +5%' },
        { name: '开源固件', slot: 'disk', type: 'discount', baseVal: 0.03, desc: '商店价格 -3%' },
        { name: '核聚变电池', slot: 'pwr', type: 'autoPct', baseVal: 0.15, desc: '自动算力 +15%' },
        { name: '稳压模块',   slot: 'pwr', type: 'clickPct', baseVal: 0.15, desc: '点击算力 +15%' },
        { name: '固态硬盘', slot: 'disk', type: 'autoPct', baseVal: 0.05, desc: '自动算力 +5%' },
        { name: '云端存储', slot: 'disk', type: 'clickPct', baseVal: 0.05, desc: '点击算力 +5%' }
    ]
};