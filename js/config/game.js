/**
 * CYBER MINER 核心配置文件
 * 负责：基础设置、商店升级项
 */

export const GameConfig = {
    // 基础游戏设置
    settings: {
        initialBytes: 0,        // 初始资源
        clickBasePower: 1,      // 初始点击力
        autoSaveInterval: 5000  // 自动存档间隔 (5秒)
    },

    // 商店分类列表
    shopCategories: [
        {
            id: 'category_click',
            title: '🦾 义体与外设 (点击增强)',
            items: [
                { id: 'mouse_click', name: '机械微动鼠标', desc: '清脆的点击声是生产力的象征', baseCost: 15, basePower: 1, costMultiplier: 1.5, type: 'click' },
                { id: 'keyboard_rgb', name: 'RGB 机械键盘', desc: '光污染能提升 200% 的手速', baseCost: 500, basePower: 5, costMultiplier: 1.5, type: 'click' },
                { id: 'energy_drink', name: '牛磺酸能量饮', desc: '透支未来的精力来换取现在的点击', baseCost: 2500, basePower: 20, costMultiplier: 1.4, type: 'click' },
                { id: 'cyber_arm_v1', name: '义体手臂 V1', desc: '入门级赛博义肢，甚至有点漏油', baseCost: 10000, basePower: 80, costMultiplier: 1.4, type: 'click' },
                { id: 'neural_link', name: '脑机接口', desc: '直接用意念点击，这就是未来', baseCost: 500000, basePower: 500, costMultiplier: 1.35, type: 'click' },
                { id: 'time_dilator', name: '时间膨胀插件', desc: '在别人的一秒里，你点击了无限次', baseCost: 100000000, basePower: 50000, costMultiplier: 1.6, type: 'click' }
            ]
        },
        {
            id: 'category_hardware',
            title: '⛏️ 实体矿机设施',
            items: [
                { id: 'old_laptop', name: '报废笔记本', desc: '还能开机就是一个奇迹', baseCost: 100, basePower: 1, costMultiplier: 1.2, type: 'auto' },
                { id: 'gpu_basic', name: '二手矿卡', desc: '经历过上一轮矿潮的幸存者', baseCost: 1100, basePower: 8, costMultiplier: 1.25, type: 'auto' },
                { id: 'asic_miner', name: 'ASIC 专用矿机', desc: '噪音很大，但算力很纯', baseCost: 12000, basePower: 45, costMultiplier: 1.3, type: 'auto' },
                { id: 'server_rack', name: '刀片服务器机柜', desc: '你需要一个专门的房间放它', baseCost: 130000, basePower: 200, costMultiplier: 1.35, type: 'auto' },
                { id: 'cooling_system', name: '液氮冷却系统', desc: '超频！只要不爆炸就往死里超', baseCost: 1400000, basePower: 1000, costMultiplier: 1.4, type: 'auto' },
                { id: 'fusion_power', name: '小型核聚变电池', desc: '解决电费问题的终极方案', baseCost: 20000000, basePower: 5500, costMultiplier: 1.45, type: 'auto' }
            ]
        },
        {
            id: 'category_software',
            title: '🌐 网络与黑客帝国',
            items: [
                { id: 'script_kiddie', name: '脚本小子', desc: '雇佣便宜的黑客帮你干活', baseCost: 300000000, basePower: 25000, costMultiplier: 1.4, type: 'auto' },
                { id: 'botnet_zombie', name: '僵尸网络', desc: '控制全球 10% 的智能马桶为你挖矿', baseCost: 1500000000, basePower: 80000, costMultiplier: 1.45, type: 'auto' },
                { id: 'ai_algorithm', name: '自进化算法', desc: '代码自己写代码，效率指数级上升', baseCost: 20000000000, basePower: 350000, costMultiplier: 1.5, type: 'auto' },
                { id: 'cloud_city', name: '云端浮空城', desc: '整个城市都是你的数据中心', baseCost: 500000000000, basePower: 2000000, costMultiplier: 1.5, type: 'auto' },
                { id: 'internet_v2', name: 'Web 9.0 协议', desc: '重新定义互联网，收取所有流量税', baseCost: 8000000000000, basePower: 15000000, costMultiplier: 1.55, type: 'auto' }
            ]
        },
        {
            id: 'category_scifi',
            title: '🌌 宇宙奇点科技',
            items: [
                { id: 'quantum_comp', name: '量子霸权主机', desc: '薛定谔的算力，挖了又好像没挖', baseCost: 100000000000000, basePower: 100000000, costMultiplier: 1.6, type: 'auto' },
                { id: 'dyson_sphere', name: '戴森球', desc: '包裹恒星，榨干每一滴能量', baseCost: 5000000000000000, basePower: 800000000, costMultiplier: 1.7, type: 'auto' },
                { id: 'matter_computer', name: '暗物质引擎', desc: '利用宇宙的阴暗面进行计算', baseCost: 90000000000000000, basePower: 5000000000, costMultiplier: 1.8, type: 'auto' },
                { id: 'reality_sim', name: '现实模拟器', desc: '我们所在的世界，只是你的一个进程', baseCost: 999000000000000000, basePower: 99999999999, costMultiplier: 2.0, type: 'auto' }
            ]
        }
    ]
};