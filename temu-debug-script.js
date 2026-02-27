// Temu页面调试脚本 - 直接在Temu页面中运行
(function() {
    'use strict';
    
    // 检查是否已经注入
    if (window.temuDebugPanel) {
        console.log('调试面板已存在');
        return;
    }
    
    // 创建调试面板
    function createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'temu-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        
        panel.innerHTML = `
            <div style="background: #007bff; color: white; padding: 10px; margin: -15px -15px 15px -15px; border-radius: 6px 6px 0 0; font-weight: bold;">
                🔧 Temu插件调试工具
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0;">插件状态</h4>
                <div id="plugin-status">检查中...</div>
                <button onclick="checkPluginStatus()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">重新检查</button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0;">页面元素检测</h4>
                <button onclick="findContainers()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">查找容器</button>
                <button onclick="findInputs()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">查找输入框</button>
                <button onclick="findButtons()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">查找按钮</button>
                <div id="element-status" style="margin-top: 10px;">点击按钮开始检测</div>
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0;">手动操作</h4>
                <button onclick="addButtonManually()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">手动添加按钮</button>
                <button onclick="testFillPrices()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">测试填充</button>
                <button onclick="clearLog()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">清空日志</button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0;">调试日志</h4>
                <div id="debug-log" style="background: #000; color: #0f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; max-height: 200px; overflow-y: auto; white-space: pre-wrap;">等待操作...</div>
            </div>
        `;
        
        document.body.appendChild(panel);
        window.temuDebugPanel = panel;
        
        // 添加调试函数到全局
        window.checkPluginStatus = checkPluginStatus;
        window.findContainers = findContainers;
        window.findInputs = findInputs;
        window.findButtons = findButtons;
        window.addButtonManually = addButtonManually;
        window.testFillPrices = testFillPrices;
        window.clearLog = clearLog;
        
        console.log('调试面板已创建');
    }
    
    // 调试函数
    function log(message, type = 'info') {
        const logEl = document.getElementById('debug-log');
        if (!logEl) return;
        
        const time = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        logEl.textContent += `[${time}] ${prefix} ${message}\n`;
        logEl.scrollTop = logEl.scrollHeight;
        console.log(`[TemuDebug] ${message}`);
    }
    
    function checkPluginStatus() {
        log('=== 检查插件状态 ===');
        
        const statusEl = document.getElementById('plugin-status');
        if (!statusEl) return;
        
        // 检查插件是否加载
        if (window.temuPriceFiller) {
            statusEl.innerHTML = '<span style="color: #28a745; font-weight: bold;">✅ 插件已加载</span>';
            log('插件已初始化');
            
            // 检查价格数据
            const priceCount = window.temuPriceFiller.priceData ? window.temuPriceFiller.priceData.length : 0;
            log(`价格数据: ${priceCount} 条`);
            
            // 检查按钮是否存在
            const button = document.getElementById('temu-price-fill-btn');
            if (button) {
                log('填充按钮: 已存在');
            } else {
                log('填充按钮: 不存在', 'warning');
            }
            
        } else {
            statusEl.innerHTML = '<span style="color: #dc3545; font-weight: bold;">❌ 插件未加载</span>';
            log('插件未初始化', 'error');
            log('可能原因: 1) 插件未安装 2) 页面不匹配 3) 初始化失败', 'error');
        }
    }
    
    function findContainers() {
        log('=== 查找容器 ===');
        
        const containers = [
            '.search-container',
            '.filter-container', 
            '.operation-container',
            '.search-box',
            '.filter-box',
            'table',
            '.table-container',
            '.product-list',
            '.ant-table',
            '.el-table',
            '.main-content',
            '.content',
            '.page-content',
            '.container',
            '.wrapper'
        ];
        
        containers.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                log(`找到容器: ${selector} (${elements.length}个)`);
            }
        });
    }
    
    function findInputs() {
        log('=== 查找输入框 ===');
        
        const inputSelectors = [
            'input[type="text"]',
            'input[type="number"]',
            '.ant-input',
            '.el-input__inner',
            'input[data-item-number]'
        ];
        
        let totalInputs = 0;
        inputSelectors.forEach(selector => {
            const inputs = document.querySelectorAll(selector);
            if (inputs.length > 0) {
                log(`找到输入框: ${selector} (${inputs.length}个)`);
                totalInputs += inputs.length;
            }
        });
        
        log(`总输入框数量: ${totalInputs}`);
        
        // 查找价格相关的输入框
        const allInputs = document.querySelectorAll('input');
        let priceInputs = 0;
        allInputs.forEach(input => {
            const placeholder = (input.placeholder || '').toLowerCase();
            const name = (input.name || '').toLowerCase();
            if (placeholder.includes('价格') || placeholder.includes('price') || 
                name.includes('price') || name.includes('activity')) {
                priceInputs++;
                log(`价格输入框: ${placeholder || name || 'unnamed'}`);
            }
        });
        
        log(`价格相关输入框: ${priceInputs}个`);
    }
    
    function findButtons() {
        log('=== 查找按钮 ===');
        
        const buttons = document.querySelectorAll('button');
        let queryButtons = 0;
        
        buttons.forEach(button => {
            const text = button.textContent.toLowerCase();
            if (text.includes('查询') || text.includes('search') || 
                text.includes('搜索') || text.includes('筛选')) {
                queryButtons++;
                log(`查询按钮: ${button.textContent}`);
            }
        });
        
        log(`查询按钮数量: ${queryButtons}`);
    }
    
    function addButtonManually() {
        log('=== 手动添加按钮 ===');
        
        // 检查是否已存在
        const existingButton = document.getElementById('temu-price-fill-btn');
        if (existingButton) {
            log('按钮已存在，移除旧按钮');
            existingButton.remove();
        }
        
        // 创建按钮
        const button = document.createElement('button');
        button.id = 'temu-price-fill-btn';
        button.innerHTML = '💰 自动填充活动价格';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10001;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
        `;
        
        button.onclick = () => {
            log('手动按钮被点击');
            if (window.temuPriceFiller) {
                window.temuPriceFiller.fillPrices();
            } else {
                log('插件未初始化，无法填充', 'error');
            }
        };
        
        document.body.appendChild(button);
        log('手动按钮已添加');
    }
    
    function testFillPrices() {
        log('=== 测试填充价格 ===');
        
        if (!window.temuPriceFiller) {
            log('插件未初始化', 'error');
            return;
        }
        
        if (!window.temuPriceFiller.priceData || window.temuPriceFiller.priceData.length === 0) {
            log('没有价格数据', 'warning');
            return;
        }
        
        log(`价格数据: ${window.temuPriceFiller.priceData.length} 条`);
        window.temuPriceFiller.priceData.forEach((item, index) => {
            log(`${index + 1}. ${item.itemNumber} -> ${item.activityPrice}`);
        });
        
        // 执行填充
        window.temuPriceFiller.fillPrices();
    }
    
    function clearLog() {
        const logEl = document.getElementById('debug-log');
        if (logEl) {
            logEl.textContent = '';
        }
    }
    
    // 创建调试面板
    createDebugPanel();
    
    // 自动检查
    setTimeout(() => {
        checkPluginStatus();
        findContainers();
        findInputs();
    }, 1000);
    
})();

