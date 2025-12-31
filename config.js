/**
 * CYBER MINER 核心配置文件
 * 负责：基础设置、商店升级项 (共60个物品，数值已平滑处理)
 */
const GameConfig = {
    // 基础游戏设置
    settings: {
        initialBytes: 0,        // 初始资源
        clickBasePower: 1,      // 初始点击力
        autoSaveInterval: 5000  // 自动存档间隔 (5秒)
    },
// 【新增】战斗平衡性配置
    combat: {
        baseHp: 20,           // 1级怪物血量
        hpGrowth: 1.12,       // 怪物血量成长幅度 (1.12 = 每级增加12%)
        bossHpMult: 8,        // Boss血量是同级小怪的几倍
        bossTime: 15,         // Boss战限时 (秒)

        baseReward: 10,       // 1级怪物掉落金币
        rewardGrowth: 1.12,   // 掉落成长幅度
    },
    // 商店分类列表
    shopCategories: [
        // ==========================================
        // 分类 1: 个人强化 (点击力提升)
        // 这里的物品让人感觉到自己在通过装备和改造变强
        // ==========================================
        {
            id: 'category_click',
            title: '🦾 义体与外设 (点击增强)',
            items: [
                { id: 'mouse_click', name: '机械微动鼠标', desc: '清脆的点击声是生产力的象征', baseCost: 15, basePower: 1, costMultiplier: 1.5, type: 'click' },
                { id: 'mouse_pad', name: '精密鼠标垫', desc: '丝般顺滑，减少摩擦力', baseCost: 100, basePower: 3, costMultiplier: 1.5, type: 'click' },
                { id: 'keyboard_rgb', name: 'RGB 机械键盘', desc: '光污染能提升 200% 的手速', baseCost: 500, basePower: 8, costMultiplier: 1.5, type: 'click' },
                { id: 'gaming_chair', name: '电竞工学椅', desc: '保护你的腰，让你持久作战', baseCost: 1200, basePower: 15, costMultiplier: 1.45, type: 'click' },
                { id: 'energy_drink', name: '牛磺酸能量饮', desc: '透支未来的精力来换取现在的点击', baseCost: 2500, basePower: 25, costMultiplier: 1.4, type: 'click' },
                { id: 'haptic_gloves', name: '触觉反馈手套', desc: '每一次点击都能感受到数据的脉动', baseCost: 6000, basePower: 50, costMultiplier: 1.4, type: 'click' },
                { id: 'cyber_arm_v1', name: '义体手臂 V1', desc: '入门级赛博义肢，甚至有点漏油', baseCost: 15000, basePower: 100, costMultiplier: 1.4, type: 'click' },
                { id: 'cyber_eye', name: '战术目镜', desc: '自动标记点击热区', baseCost: 40000, basePower: 250, costMultiplier: 1.4, type: 'click' },
                { id: 'synaptic_booster', name: '突触加速器', desc: '反应速度突破人类极限', baseCost: 120000, basePower: 600, costMultiplier: 1.35, type: 'click' },
                { id: 'neural_link', name: '脑机接口', desc: '直接用意念点击，这就是未来', baseCost: 500000, basePower: 2000, costMultiplier: 1.35, type: 'click' },
                { id: 'ai_assistant', name: '植入式AI助手', desc: '它在你的潜意识里帮你点击', baseCost: 2500000, basePower: 8000, costMultiplier: 1.4, type: 'click' },
                { id: 'hive_mind_link', name: '蜂巢思维链接', desc: '借用他人的大脑算力', baseCost: 15000000, basePower: 40000, costMultiplier: 1.5, type: 'click' },
                { id: 'time_dilator', name: '时间膨胀插件', desc: '在别人的一秒里，你点击了无限次', baseCost: 100000000, basePower: 200000, costMultiplier: 1.6, type: 'click' },
                { id: 'reality_warper', name: '现实扭曲力场', desc: '修改物理法则，让点击必定发生', baseCost: 1000000000, basePower: 1500000, costMultiplier: 1.7, type: 'click' },
                { id: 'omni_finger', name: '神之指', desc: '这一指，点破苍穹', baseCost: 20000000000, basePower: 10000000, costMultiplier: 1.8, type: 'click' }
            ]
        },

        // ==========================================
        // 分类 2: 物理矿机 (初期自动挂机)
        // 范围：1 -> 35,000,000 (35M)
        // ==========================================
        {
            id: 'category_hardware',
            title: '⛏️ 实体矿机设施',
            items: [
                { id: 'abacus', name: '古老算盘', desc: '甚至不需要用电', baseCost: 50, basePower: 1, costMultiplier: 1.15, type: 'auto' },
                { id: 'old_laptop', name: '报废笔记本', desc: '还能开机就是一个奇迹', baseCost: 150, basePower: 2, costMultiplier: 1.2, type: 'auto' },
                { id: 'office_pc', name: '公司淘汰主机', desc: '偷偷装在仓库里挖矿', baseCost: 600, basePower: 5, costMultiplier: 1.2, type: 'auto' },
                { id: 'gpu_basic', name: '二手矿卡', desc: '经历过上一轮矿潮的幸存者', baseCost: 1500, basePower: 12, costMultiplier: 1.25, type: 'auto' },
                { id: 'gpu_rig', name: '6卡矿机架', desc: '房间里变得很热', baseCost: 6000, basePower: 40, costMultiplier: 1.25, type: 'auto' },
                { id: 'asic_miner', name: 'ASIC 专用矿机', desc: '噪音很大，但算力很纯', baseCost: 15000, basePower: 100, costMultiplier: 1.3, type: 'auto' },
                { id: 'mining_farm', name: '小型矿场', desc: '你需要租一个地下室', baseCost: 60000, basePower: 350, costMultiplier: 1.3, type: 'auto' },
                { id: 'server_rack', name: '刀片服务器机柜', desc: '企业级的稳定性', baseCost: 200000, basePower: 1000, costMultiplier: 1.35, type: 'auto' },
                { id: 'data_center', name: '数据中心', desc: '这一层的电费都是你交', baseCost: 1000000, basePower: 4500, costMultiplier: 1.35, type: 'auto' },
                { id: 'cooling_system', name: '液氮冷却系统', desc: '超频！只要不爆炸就往死里超', baseCost: 5000000, basePower: 20000, costMultiplier: 1.4, type: 'auto' },
                { id: 'supercomputer', name: '超级计算机', desc: '以前只用来模拟核爆', baseCost: 25000000, basePower: 90000, costMultiplier: 1.4, type: 'auto' },
                { id: 'fusion_power', name: '小型核聚变电池', desc: '解决电费问题的终极方案', baseCost: 120000000, basePower: 400000, costMultiplier: 1.45, type: 'auto' },
                { id: 'quantum_server', name: '量子处理器', desc: '0和1同时存在', baseCost: 600000000, basePower: 1800000, costMultiplier: 1.5, type: 'auto' },
                { id: 'orbital_station', name: '轨道服务器站', desc: '利用太空低温散热', baseCost: 3000000000, basePower: 8000000, costMultiplier: 1.55, type: 'auto' },
                { id: 'moon_base', name: '月球氦-3基地', desc: '把月球背面变成你的机房', baseCost: 15000000000, basePower: 35000000, costMultiplier: 1.6, type: 'auto' }
            ]
        },

        // ==========================================
        // 分类 3: 网络与软件 (中期自动挂机)
        // 范围：60M -> 300Q (3e17)
        // 接档 Hardware (Last: 35M) -> 这里从 60M 开始
        // ==========================================
        {
            id: 'category_software',
            title: '🌐 网络与黑客帝国',
            items: [
                { id: 'hello_world', name: 'Hello World', desc: '一切的开始，迈向软件领域', baseCost: 25000000000, basePower: 60000000, costMultiplier: 1.3, type: 'auto' }, // 60M
                { id: 'web_crawler', name: '全网爬虫', desc: '自动搜集互联网上的闲散算力', baseCost: 100000000000, basePower: 250000000, costMultiplier: 1.35, type: 'auto' }, // 250M
                { id: 'ddos_bot', name: '流量劫持', desc: '不仅能攻击，还能借用算力', baseCost: 500000000000, basePower: 1200000000, costMultiplier: 1.4, type: 'auto' }, // 1.2B
                { id: 'script_kiddie', name: '雇佣脚本小子', desc: '便宜的黑客劳动力', baseCost: 2500000000000, basePower: 6000000000, costMultiplier: 1.4, type: 'auto' }, // 6B
                { id: 'vpn_tunnel', name: '量子加密隧道', desc: '没人能追踪你的流量来源', baseCost: 12000000000000, basePower: 30000000000, costMultiplier: 1.45, type: 'auto' }, // 30B
                { id: 'botnet_zombie', name: '僵尸网络', desc: '控制全球 10% 的智能家电', baseCost: 60000000000000, basePower: 150000000000, costMultiplier: 1.45, type: 'auto' }, // 150B
                { id: 'dark_web_node', name: '暗网核心节点', desc: '你是地下世界的规则制定者', baseCost: 300000000000000, basePower: 800000000000, costMultiplier: 1.5, type: 'auto' }, // 800B
                { id: 'ai_algorithm', name: '自进化算法', desc: '代码自己写代码，效率指数级上升', baseCost: 1500000000000000, basePower: 4000000000000, costMultiplier: 1.5, type: 'auto' }, // 4T
                { id: 'neural_net', name: '全球神经网络', desc: '将所有连网设备变成你的神经元', baseCost: 8000000000000000, basePower: 20000000000000, costMultiplier: 1.55, type: 'auto' }, // 20T
                { id: 'cloud_city', name: '云端浮空城', desc: '整个城市的数据中心都已上云', baseCost: 40000000000000000, basePower: 100000000000000, costMultiplier: 1.55, type: 'auto' }, // 100T
                { id: 'satellite_link', name: '星链矩阵', desc: '覆盖地表的每一寸土地', baseCost: 200000000000000000, basePower: 500000000000000, costMultiplier: 1.6, type: 'auto' }, // 500T
                { id: 'internet_v2', name: 'Web 9.0 协议', desc: '重新定义互联网，收取所有流量税', baseCost: 1000000000000000000, basePower: 2500000000000000, costMultiplier: 1.6, type: 'auto' }, // 2.5Q (Quad)
                { id: 'global_firewall', name: '绝对防火墙', desc: '互联网现在是你的局域网', baseCost: 5000000000000000000, basePower: 12000000000000000, costMultiplier: 1.65, type: 'auto' }, // 12Q
                { id: 'digital_nation', name: '数字国度', desc: '拥有独立主权的数字世界', baseCost: 25000000000000000000, basePower: 60000000000000000, costMultiplier: 1.7, type: 'auto' }, // 60Q
                { id: 'matrix_core', name: '母体核心', desc: '欢迎来到真实世界', baseCost: 120000000000000000000, basePower: 300000000000000000, costMultiplier: 1.8, type: 'auto' } // 300Q
            ]
        },

        // ==========================================
        // 分类 4: 宇宙级科技 (后期自动挂机)
        // 范围：1.5 Quintillion -> 10 Octillion
        // 接档 Software (Last: 300Q = 3e17) -> 这里从 1.5e18 开始
        // ==========================================
        {
            id: 'category_scifi',
            title: '🌌 宇宙奇点科技',
            items: [
                { id: 'plasma_reactor', name: '等离子反应堆', desc: '比太阳更热，能源无限', baseCost: 600000000000000000000, basePower: 1500000000000000000, costMultiplier: 1.5, type: 'auto' }, // 1.5 Quintillion
                { id: 'quantum_comp', name: '量子霸权主机', desc: '同时计算所有可能的结果', baseCost: 3000000000000000000000, basePower: 8000000000000000000, costMultiplier: 1.55, type: 'auto' }, // 8 Quintillion
                { id: 'star_lifter', name: '恒星汲取器', desc: '直接从恒星表面抽取物质', baseCost: 15000000000000000000000, basePower: 40000000000000000000, costMultiplier: 1.6, type: 'auto' }, // 40Q
                { id: 'dyson_sphere', name: '戴森球', desc: '包裹恒星，榨干每一滴能量', baseCost: 80000000000000000000000, basePower: 200000000000000000000, costMultiplier: 1.65, type: 'auto' }, // 200Q
                { id: 'black_hole_miner', name: '黑洞吸积盘', desc: '在事件视界边缘挖矿', baseCost: 400000000000000000000000, basePower: 1000000000000000000000, costMultiplier: 1.7, type: 'auto' }, // 1 Sextillion
                { id: 'matter_computer', name: '可编程物质', desc: '整个星球都是你的CPU', baseCost: 2000000000000000000000000, basePower: 5000000000000000000000, costMultiplier: 1.75, type: 'auto' },
                { id: 'antimatter_engine', name: '反物质引擎', desc: '湮灭产生的纯粹能量', baseCost: 10000000000000000000000000, basePower: 25000000000000000000000, costMultiplier: 1.8, type: 'auto' },
                { id: 'reality_sim', name: '现实模拟器', desc: '我们所在的世界，只是你的一个进程', baseCost: 50000000000000000000000000, basePower: 120000000000000000000000, costMultiplier: 1.85, type: 'auto' },
                { id: 'dimension_hook', name: '维度钩爪', desc: '从高维空间窃取能量', baseCost: 250000000000000000000000000, basePower: 600000000000000000000000, costMultiplier: 1.9, type: 'auto' },
                { id: 'entropy_reducer', name: '逆熵力场', desc: '违背热力学第二定律', baseCost: 1200000000000000000000000000, basePower: 3000000000000000000000000, costMultiplier: 1.95, type: 'auto' }, // 3 Septillion
                { id: 'timeline_manager', name: '时间线管理局', desc: '同时在过去和未来挖矿', baseCost: 6000000000000000000000000000, basePower: 15000000000000000000000000, costMultiplier: 2.0, type: 'auto' },
                { id: 'void_siphon', name: '虚空虹吸', desc: '从无中生有', baseCost: 30000000000000000000000000000, basePower: 80000000000000000000000000, costMultiplier: 2.1, type: 'auto' },
                { id: 'multiverse_brain', name: '多元宇宙大脑', desc: '所有平行宇宙的算力总和', baseCost: 150000000000000000000000000000, basePower: 400000000000000000000000000, costMultiplier: 2.2, type: 'auto' },
                { id: 'cosmic_admin', name: '宇宙管理员权限', desc: 'sudo rm -rf universe', baseCost: 800000000000000000000000000000, basePower: 2000000000000000000000000000, costMultiplier: 2.3, type: 'auto' },
                { id: 'the_final_answer', name: '终极答案', desc: '42', baseCost: 10000000000000000000000000000000, basePower: 10000000000000000000000000000, costMultiplier: 2.5, type: 'auto' } // 10 Octillion
            ]
        }
    ]
};