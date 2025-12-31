const LootConfig = {
    // 稀有度配置
    rarity: {
        common:    { name: '普通', color: '#b0b0b0', multiplier: 1, prob: 0.60 }, // 白
        uncommon:  { name: '优秀', color: '#00ff41', multiplier: 2, prob: 0.25 }, // 绿
        rare:      { name: '精良', color: '#00e5ff', multiplier: 5, prob: 0.10 }, // 蓝
        legendary: { name: '传说', color: '#ffa500', multiplier: 15, prob: 0.04 }, // 橙
        mythic:    { name: '神话', color: '#ff003c', multiplier: 50, prob: 0.01 }  // 红
    },

    // 掉落规则设置
    settings: {
        dropChanceClick: 0.05, // 每次点击 5% 概率掉落
        dropChanceAuto: 0.02,  // 每次自动挂机tick 2% 概率掉落
        maxInventory: 20       // 背包最大格数
    },

    // 装备底材池 (随机掉落时从这里抽)
    // slot对应: cpu, ram, disk, net, pwr
    // type对应: 'clickFlat', 'clickPct', 'autoFlat', 'autoPct'
    equipmentBase: [
        { name: '超频芯片', slot: 'cpu', type: 'clickPct', baseVal: 0.1, desc: '点击算力 +10%' },
        { name: '量子核心', slot: 'cpu', type: 'autoPct', baseVal: 0.1, desc: '自动算力 +10%' },

        { name: '高速缓存', slot: 'ram', type: 'clickFlat', baseVal: 10, desc: '点击算力 +10' },
        { name: 'ECC内存', slot: 'ram', type: 'autoFlat', baseVal: 50, desc: '自动算力 +50' },

        { name: '固态硬盘', slot: 'disk', type: 'autoPct', baseVal: 0.05, desc: '自动算力 +5%' },
        { name: '云端存储', slot: 'disk', type: 'clickPct', baseVal: 0.05, desc: '点击算力 +5%' },

        { name: '光纤线缆', slot: 'net', type: 'clickFlat', baseVal: 5, desc: '点击算力 +5' },
        { name: '5G模块',   slot: 'net', type: 'autoFlat', baseVal: 20, desc: '自动算力 +20' },

        { name: '核聚变电池', slot: 'pwr', type: 'autoPct', baseVal: 0.15, desc: '自动算力 +15%' },
        { name: '稳压模块',   slot: 'pwr', type: 'clickPct', baseVal: 0.15, desc: '点击算力 +15%' }
    ]
};