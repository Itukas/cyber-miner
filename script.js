// 全局状态
let game = {
    bytes: GameConfig.settings.initialBytes,
    clickPower: GameConfig.settings.clickBasePower,
    autoPower: 0,
    levels: {} // 存储所有物品等级: { 'mouse_v1': 5, 'gpu_1050': 1 }
};

// --- 辅助函数：快速查找物品 ---
function findItemById(id) {
    for (const cat of GameConfig.shopCategories) {
        const item = cat.items.find(i => i.id === id);
        if (item) return item;
    }
    return null;
}

// --- 核心算力计算 ---
function recalcPower() {
    let newClickPower = GameConfig.settings.clickBasePower;
    let newAutoPower = 0;

    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const level = game.levels[item.id] || 0;
            const totalPower = item.basePower * level;

            if (item.type === 'click') {
                newClickPower += totalPower;
            } else if (item.type === 'auto') {
                newAutoPower += totalPower;
            }
        });
    });

    game.clickPower = newClickPower;
    game.autoPower = newAutoPower;
}

function getCost(item) {
    const level = game.levels[item.id] || 0;
    return Math.floor(item.baseCost * Math.pow(item.costMultiplier, level));
}

// --- 渲染系统 (Render) ---
function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = ''; // 清空现有内容

    GameConfig.shopCategories.forEach(cat => {
        // 1. 渲染分类标题 (保持不变，独占一行)
        const header = document.createElement('h2');
        header.innerText = cat.title;
        header.className = 'shop-header';
        container.appendChild(header);

        // 2. 创建一个网格容器 (这是新增的！)
        const gridBox = document.createElement('div');
        gridBox.className = 'shop-grid'; // 稍后在CSS里定义它

        // 3. 渲染该分类下的物品 (塞进网格容器里)
        cat.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'upgrade-item card-style'; // 加个 card-style 标记
            div.id = `item-row-${item.id}`;
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

        // 4. 把网格容器塞进大容器
        container.appendChild(gridBox);
    });
}
// --- 购买逻辑 ---
window.buyItem = function(id) {
    const item = findItemById(id);
    if (!item) return;

    const cost = getCost(item);
    if (game.bytes >= cost) {
        game.bytes -= cost;
        // 增加等级
        game.levels[item.id] = (game.levels[item.id] || 0) + 1;

        recalcPower();
        updateUI();
        saveGame();

        // 点击反馈
        const btn = document.getElementById(`btn-${id}`);
        const originalText = btn.innerText;
        btn.innerText = "GET!";
        setTimeout(() => updateUI(), 300);
    }
};

// --- UI 更新 ---
function updateUI() {
    document.getElementById('score').innerText = Math.floor(game.bytes);
    document.getElementById('click-power').innerText = game.clickPower;
    document.getElementById('auto-power').innerText = game.autoPower;

    // 遍历所有配置项来更新按钮状态
    GameConfig.shopCategories.forEach(cat => {
        cat.items.forEach(item => {
            const cost = getCost(item);
            const level = game.levels[item.id] || 0;

            const btn = document.getElementById(`btn-${item.id}`);
            const lvlLabel = document.getElementById(`lvl-${item.id}`);

            // 只有当按钮文案不是 "GET!" 的时候才更新价格（防止动画闪烁）
            if (btn.innerText !== "GET!") {
                btn.innerText = `${cost} B`;
            }

            lvlLabel.innerText = `(Lv.${level})`;

            if (game.bytes >= cost) {
                btn.classList.add('can-buy');
            } else {
                btn.classList.remove('can-buy');
            }
        });
    });
}

// --- 存档与初始化 ---
function saveGame() {
    localStorage.setItem('CyberMinerSave_v2', JSON.stringify({
        bytes: game.bytes,
        levels: game.levels
    }));
    const status = document.getElementById('save-status');
    if(status) {
        status.innerText = '已自动存档';
        setTimeout(() => status.innerText = '', 1500);
    }
}

function loadGame() {
    const save = localStorage.getItem('CyberMinerSave_v2');
    if (save) {
        const data = JSON.parse(save);
        game.bytes = data.bytes || 0;
        game.levels = data.levels || {};
    }
    recalcPower();
}

window.resetGame = function() {
    if(confirm('确定要清空数据重来吗？')) {
        localStorage.removeItem('CyberMinerSave_v2');
        location.reload();
    }
};

// 启动引擎
function init() {
    renderShop(); // 第一步：生成HTML
    loadGame();   // 第二步：加载数据
    updateUI();   // 第三步：刷新界面

    // 自动挂机循环
    setInterval(() => {
        if(game.autoPower > 0) {
            game.bytes += game.autoPower;
            updateUI();
        }
    }, 1000);

    // 自动存档
    setInterval(saveGame, GameConfig.settings.autoSaveInterval);

    // 大按钮点击
    const mineBtn = document.getElementById('mine-btn');
    mineBtn.addEventListener('click', () => {
        game.bytes += game.clickPower;
        updateUI();
        mineBtn.style.transform = 'scale(0.95)';
        setTimeout(() => mineBtn.style.transform = 'scale(1)', 50);
    });
}

init();