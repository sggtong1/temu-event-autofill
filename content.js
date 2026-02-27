// 内容脚本 - 在活动页面注入价格填充功能
class TemuPriceFiller {
  constructor() {
    this.priceData = [];
    this.settings = {};
    this.debugMode = true; // 开启调试模式
    this.init();
  }

  async init() {
    this.debugLog('TemuPriceFiller 初始化开始');
    
    // 等待页面加载完成
    await this.waitForPageLoad();
    
    // 加载预设价格数据
    await this.loadPriceData();
    
    // 添加价格填充按钮
    this.addPriceFillButton();
    
    // 监听页面变化（动态加载的内容）
    this.observePageChanges();
    
    // 设置消息监听器
    this.setupMessageListener();
    
    // 暴露到全局，方便调试
    window.temuPriceFiller = this;
    
    this.debugLog('TemuPriceFiller 初始化完成');
  }

  debugLog(message) {
    if (this.debugMode) {
      console.log(`[TemuPriceFiller] ${message}`);
      
      // 在页面上显示调试信息
      const debugEl = document.getElementById('debug-log');
      if (debugEl) {
        const time = new Date().toLocaleTimeString();
        debugEl.innerHTML += `[${time}] ${message}<br>`;
      }
    }
  }

  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  async loadPriceData() {
    try {
      const result = await chrome.storage.local.get(['priceData']);
      this.priceData = result.priceData || [];
      this.debugLog(`加载价格数据: ${this.priceData.length} 条记录`);
      this.debugLog('价格数据详情: ' + JSON.stringify(this.priceData, null, 2));
    } catch (error) {
      this.debugLog('加载价格数据失败: ' + error.message);
    }
  }


  addPriceFillButton() {
    this.debugLog('开始添加价格填充按钮...');
    
    // 检查是否已经添加了按钮
    const existingButton = document.getElementById('temu-price-fill-btn');
    if (existingButton) {
      this.debugLog('按钮已存在，跳过添加');
      return;
    }

    // 查找合适的位置添加按钮
    const targetContainer = this.findTargetContainer();
    if (!targetContainer) {
      this.debugLog('未找到合适的容器，等待页面加载...');
      setTimeout(() => this.addPriceFillButton(), 1000);
      return;
    }

    // 创建价格填充按钮
    const fillButton = this.createFillButton();
    targetContainer.appendChild(fillButton);
    this.debugLog('价格填充按钮已添加到容器: ' + targetContainer.className);
    
    // 验证按钮是否成功添加
    const addedButton = document.getElementById('temu-price-fill-btn');
    if (addedButton) {
      this.debugLog('按钮添加成功，位置: ' + addedButton.offsetTop + 'px');
    } else {
      this.debugLog('按钮添加失败');
    }
  }

  findTargetContainer() {
    this.debugLog('开始查找目标容器...');
    
    // 方法1: 查找表格上方的操作区域
    const searchContainer = document.querySelector('.search-container, .filter-container, .operation-container, .search-box, .filter-box');
    if (searchContainer) {
      this.debugLog('找到搜索容器');
      return searchContainer;
    }

    // 方法2: 查找查询按钮附近的区域
    const queryButtons = document.querySelectorAll('button');
    for (let button of queryButtons) {
      if (button.textContent.includes('查询') || button.textContent.includes('Search') || 
          button.textContent.includes('搜索') || button.textContent.includes('筛选')) {
        this.debugLog('找到查询按钮容器');
        return button.parentElement;
      }
    }

    // 方法3: 查找表格容器
    const tableContainer = document.querySelector('table, .table-container, .product-list, .ant-table, .el-table');
    if (tableContainer) {
      this.debugLog('找到表格容器，创建包装器');
      const wrapper = document.createElement('div');
      wrapper.className = 'temu-price-filler-wrapper';
      tableContainer.parentElement.insertBefore(wrapper, tableContainer);
      return wrapper;
    }

    // 方法4: 查找页面主要内容区域
    const mainContent = document.querySelector('.main-content, .content, .page-content, .container, .wrapper');
    if (mainContent) {
      this.debugLog('找到主要内容区域');
      return mainContent;
    }

    // 方法5: 在body开头添加
    this.debugLog('未找到合适容器，在body开头添加');
    const wrapper = document.createElement('div');
    wrapper.className = 'temu-price-filler-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(wrapper);
    return wrapper;
  }

  createFillButton() {
    this.debugLog('创建价格填充按钮...');
    
    const button = document.createElement('button');
    button.id = 'temu-price-fill-btn';
    button.className = 'temu-price-fill-button';
    button.innerHTML = `
      <span class="icon">💰</span>
      <span class="text">自动填充活动价格</span>
    `;
    
    // 添加点击事件
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.debugLog('按钮被点击，开始填充价格...');
      this.fillPrices();
    });
    
    // 添加样式确保按钮可见
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #ff6b35, #f7931e);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin: 10px 0;
      box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
    `;
    
    this.debugLog('按钮创建完成');
    return button;
  }

  async fillPrices() {
    this.debugLog('开始填充价格...');
    
    if (this.priceData.length === 0) {
      this.debugLog('没有价格数据');
      return { filledCount: 0, message: '没有价格数据' };
    }

    const priceInputs = this.findPriceInputs();
    this.debugLog(`找到 ${priceInputs.length} 个价格输入框`);
    
    let filledCount = 0;
    let skippedCount = 0;
    let matchedItems = [];
    let skippedItems = [];

    for (let input of priceInputs) {
      try {
        const itemNumber = this.extractItemNumber(input);
        this.debugLog(`检查输入框，货号: ${itemNumber}`);
        
        if (itemNumber) {
          const priceData = this.findPriceData(itemNumber);
          if (priceData) {
            this.debugLog(`匹配到价格数据: ${itemNumber} -> ${priceData.activityPrice}`);
            
            // 检查是否超过参考价格
            const referencePrice = this.getReferencePrice(input);
            if (referencePrice && priceData.activityPrice > referencePrice) {
              this.debugLog(`跳过 ${itemNumber}: 价格 ${priceData.activityPrice} 超过参考价格 ${referencePrice}`);
              skippedCount++;
              skippedItems.push(`${itemNumber}(${priceData.activityPrice}>${referencePrice})`);
              continue;
            }
            
            // 填充价格
            input.value = priceData.activityPrice;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 等待一下，检查是否有验证错误
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 检查是否有验证错误
            if (this.hasValidationError(input)) {
              this.debugLog(`跳过 ${itemNumber}: 验证失败`);
              input.value = ''; // 清空输入
              skippedCount++;
              skippedItems.push(`${itemNumber}(验证失败)`);
              continue;
            }
            
            filledCount++;
            matchedItems.push(itemNumber);
            
            // 高亮显示填充的输入框
            input.classList.add('temu-filled');
            setTimeout(() => input.classList.remove('temu-filled'), 2000);
          } else {
            this.debugLog(`未找到货号 ${itemNumber} 的价格数据`);
          }
        }
      } catch (error) {
        this.debugLog(`处理输入框时出错: ${error.message}`);
        skippedCount++;
        skippedItems.push(`错误: ${error.message}`);
      }
    }

    const message = `填充完成: ${filledCount} 个成功，${skippedCount} 个跳过`;
    this.debugLog(`${message}，匹配的货号: ${matchedItems.join(', ')}，跳过的: ${skippedItems.join(', ')}`);
    
    return { 
      filledCount, 
      skippedCount, 
      matchedItems, 
      skippedItems, 
      message 
    };
  }

  findPriceInputs() {
    this.debugLog('开始查找价格输入框...');
    const inputs = [];
    
    // 方法1: 通过data-item-number属性查找（测试页面专用）
    const dataInputs = document.querySelectorAll('input[data-item-number]');
    this.debugLog(`找到 ${dataInputs.length} 个带data-item-number的输入框`);
    dataInputs.forEach(input => inputs.push(input));
    
    // 方法2: 专门针对Temu活动页面的输入框查找
    // 查找所有活动申报价格列的输入框
    const activityPriceInputs = document.querySelectorAll('input[data-testid="beast-core-inputNumber-htmlInput"]');
    this.debugLog(`找到 ${activityPriceInputs.length} 个活动申报价格输入框`);
    
    activityPriceInputs.forEach(input => {
      // 检查输入框是否在活动申报价格列中
      const formItem = input.closest('[data-testid="beast-core-form-item"]');
      if (formItem && formItem.id && formItem.id.includes('_activityPrice')) {
        inputs.push(input);
        this.debugLog(`确认活动申报价格输入框: ${formItem.id}`);
      }
    });
    
    // 方法3: 通过表格结构查找
    const tableRows = document.querySelectorAll('tbody tr[data-testid="beast-core-table-body-tr"]');
    this.debugLog(`找到 ${tableRows.length} 个表格行`);
    
    tableRows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, cellIndex) => {
        // 查找包含活动申报价格输入框的单元格
        const priceInputs = cell.querySelectorAll('input[data-testid="beast-core-inputNumber-htmlInput"]');
        priceInputs.forEach(input => {
          // 检查输入框的父级form-item是否包含activityPrice
          const formItem = input.closest('[data-testid="beast-core-form-item"]');
          if (formItem && formItem.id && formItem.id.includes('_activityPrice')) {
            if (!inputs.includes(input)) {
              inputs.push(input);
              this.debugLog(`通过表格结构找到输入框: 行${rowIndex}, 列${cellIndex}, ID: ${formItem.id}`);
            }
          }
        });
      });
    });
    
    // 方法4: 通过列标题查找（备用方法）
    const priceHeaders = document.querySelectorAll('th');
    priceHeaders.forEach(header => {
      const headerText = header.textContent.toLowerCase();
      if (headerText.includes('活动申报价格') || headerText.includes('activity')) {
        this.debugLog(`找到价格列标题: ${headerText}`);
        
        // 查找该列下的所有输入框
        const columnIndex = Array.from(header.parentNode.children).indexOf(header);
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cells = row.children;
          if (cells[columnIndex]) {
            const cellInputs = cells[columnIndex].querySelectorAll('input[data-testid="beast-core-inputNumber-htmlInput"]');
            cellInputs.forEach(input => {
              if (!inputs.includes(input)) {
                inputs.push(input);
              }
            });
          }
        });
      }
    });
    
    // 去重
    const uniqueInputs = [...new Set(inputs)];
    this.debugLog(`总共找到 ${uniqueInputs.length} 个活动申报价格输入框`);
    
    return uniqueInputs;
  }

  extractItemNumber(input) {
    this.debugLog('开始提取货号...');
    
    // 方法1: 直接从data-item-number属性获取（测试页面专用）
    if (input.dataset.itemNumber) {
      this.debugLog(`从data-item-number获取货号: ${input.dataset.itemNumber}`);
      return input.dataset.itemNumber;
    }
    
    // 方法2: 从输入框所在的行中提取货号（Temu页面）
    let currentElement = input;
    
    // 向上查找包含货号的行
    while (currentElement && currentElement !== document.body) {
      const row = currentElement.closest('tr[data-testid="beast-core-table-body-tr"]');
      if (row) {
        this.debugLog(`找到表格行，开始提取货号...`);
        
        // 查找SKU属性集列中的货号（专门针对Temu页面结构）
        const cells = row.querySelectorAll('td');
        this.debugLog(`找到 ${cells.length} 个表格单元格`);
        
        // 首先查找SKU属性集列（通常包含具体的SKU货号）
        // 根据页面结构，SKU属性集列通常包含更具体的货号信息
        let skuAttributeCell = null;
        let skcInfoCell = null;
        
        // 遍历所有单元格，识别不同类型的货号列
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const cellText = cell.textContent;
          
          if (cellText.includes('货号:')) {
            this.debugLog(`在第 ${i + 1} 列找到包含货号的单元格: ${cellText.substring(0, 100)}...`);
            
            // 检查是否是SKU属性集列（包含具体规格的货号）
            // SKU属性集列通常包含更详细的规格信息，如颜色、尺寸等
            if (cellText.includes('-') && (cellText.includes('mm') || cellText.includes('PU') || cellText.includes('BK') || cellText.includes('GR') || cellText.includes('PK'))) {
              skuAttributeCell = cell;
              this.debugLog(`识别为SKU属性集列（第 ${i + 1} 列）`);
            } else {
              skcInfoCell = cell;
              this.debugLog(`识别为SKC信息列（第 ${i + 1} 列）`);
            }
          }
        }
        
        // 优先从SKU属性集列提取货号
        if (skuAttributeCell) {
          const skuText = skuAttributeCell.textContent;
          const itemNumberMatches = skuText.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/g);
          if (itemNumberMatches && itemNumberMatches.length > 0) {
            const firstMatch = itemNumberMatches[0];
            const itemNumber = firstMatch.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/)[1];
            this.debugLog(`从SKU属性集列获取货号: ${itemNumber}`);
            return itemNumber;
          }
        }
        
        // 如果SKU属性集列没有货号，则从SKC信息列提取
        if (skcInfoCell) {
          const skcText = skcInfoCell.textContent;
          const itemNumberMatches = skcText.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/g);
          if (itemNumberMatches && itemNumberMatches.length > 0) {
            const firstMatch = itemNumberMatches[0];
            const itemNumber = firstMatch.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/)[1];
            this.debugLog(`从SKC信息列获取货号: ${itemNumber}`);
            return itemNumber;
          }
        }
        
        // 如果上述方法没找到，尝试从所有单元格中查找
        this.debugLog('未在SKU属性集列找到货号，尝试从所有单元格查找...');
        for (let cell of cells) {
          const cellText = cell.textContent;
          const itemNumberMatch = cellText.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/);
          if (itemNumberMatch) {
            const itemNumber = itemNumberMatch[1];
            this.debugLog(`从其他列获取货号: ${itemNumber}`);
            return itemNumber;
          }
        }
        
        // 备用方法：查找所有包含"货号:"的文本
        const allText = row.textContent;
        const itemNumberMatches = allText.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/g);
        if (itemNumberMatches && itemNumberMatches.length > 0) {
          // 取第一个匹配的货号（优先从SKU属性集列开始）
          const firstMatch = itemNumberMatches[0];
          const itemNumber = firstMatch.match(/货号[：:]\s*([A-Za-z0-9\-_]+)/)[1];
          this.debugLog(`从行文本获取货号: ${itemNumber}`);
          return itemNumber;
        }
        
        // 查找其他可能的货号格式
        const skuMatch = allText.match(/SKU[：:]\s*([A-Za-z0-9\-_]+)/);
        if (skuMatch) {
          this.debugLog(`从SKU匹配获取货号: ${skuMatch[1]}`);
          return skuMatch[1];
        }
        
        // 查找产品编号
        const productMatch = allText.match(/产品编号[：:]\s*([A-Za-z0-9\-_]+)/);
        if (productMatch) {
          this.debugLog(`从产品编号匹配获取货号: ${productMatch[1]}`);
          return productMatch[1];
        }
      }
      currentElement = currentElement.parentElement;
    }
    
    this.debugLog('未找到货号');
    return null;
  }

  findPriceData(itemNumber) {
    return this.priceData.find(item => 
      item.itemNumber === itemNumber || 
      item.itemNumber === itemNumber.replace(/[：:]/g, '')
    );
  }

  getReferencePrice(input) {
    try {
      // 查找同一行中的参考价格
      const row = input.closest('tr');
      if (row) {
        // 查找包含"参考申报价格"或"参考价格"的列
        const cells = row.querySelectorAll('td');
        for (let cell of cells) {
          const text = cell.textContent;
          if (text.includes('¥') && (text.includes('参考') || text.includes('Reference'))) {
            const priceMatch = text.match(/¥\s*(\d+\.?\d*)/);
            if (priceMatch) {
              return parseFloat(priceMatch[1]);
            }
          }
        }
      }
    } catch (error) {
      this.debugLog(`获取参考价格时出错: ${error.message}`);
    }
    return null;
  }

  hasValidationError(input) {
    try {
      // 检查输入框附近是否有错误提示
      const row = input.closest('tr');
      if (row) {
        // 查找错误提示元素
        const errorElements = row.querySelectorAll('[class*="error"], [class*="invalid"], [class*="warn"]');
        for (let errorEl of errorElements) {
          const text = errorEl.textContent;
          if (text.includes('不可大于') || text.includes('大于') || text.includes('超过') || 
              text.includes('Cannot be greater') || text.includes('greater than')) {
            return true;
          }
        }
        
        // 检查输入框本身是否有错误样式
        if (input.classList.contains('error') || input.classList.contains('invalid') || 
            input.style.borderColor === 'red' || input.style.color === 'red') {
          return true;
        }
      }
    } catch (error) {
      this.debugLog(`检查验证错误时出错: ${error.message}`);
    }
    return false;
  }


  observePageChanges() {
    // 监听页面动态变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 检查是否有新的价格输入框
          const hasNewInputs = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return node.querySelector && node.querySelector('input[type="text"], input[type="number"]');
            }
            return false;
          });
          
          if (hasNewInputs) {
            // 延迟重新扫描，确保新内容已完全加载
            setTimeout(() => {
              const existingButton = document.getElementById('temu-price-fill-btn');
              if (!existingButton) {
                this.addPriceFillButton();
              }
            }, 500);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupMessageListener() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.debugLog(`收到消息: ${request.action}`);
      
      if (request.action === 'fillPrices') {
        this.debugLog('开始处理填充请求');
        
        // 更新价格数据
        this.priceData = request.priceData || [];
        
        // 执行填充
        this.fillPrices().then((result) => {
          this.debugLog(`填充完成: ${result.filledCount} 个价格`);
          sendResponse({
            success: true,
            filledCount: result.filledCount,
            message: result.message
          });
        }).catch((error) => {
          this.debugLog(`填充失败: ${error.message}`);
          sendResponse({
            success: false,
            error: error.message
          });
        });
        
        // 返回true表示异步响应
        return true;
      }
    });
  }
}

// 初始化价格填充工具
const isTemuPage = window.location.href.includes('agentseller.temu.com') && 
                   window.location.href.includes('marketing-activity');
const isTestPage = window.location.href.includes('test-page.html') || 
                   window.location.href.includes('localhost') ||
                   window.location.href.includes('127.0.0.1');

console.log('页面URL:', window.location.href);
console.log('是否Temu页面:', isTemuPage);
console.log('是否测试页面:', isTestPage);

if (isTemuPage || isTestPage) {
  console.log('检测到支持的页面，初始化TemuPriceFiller');
  
  // 延迟初始化，确保页面完全加载
  setTimeout(() => {
    try {
      window.temuPriceFiller = new TemuPriceFiller();
      console.log('TemuPriceFiller 初始化成功');
    } catch (error) {
      console.error('TemuPriceFiller 初始化失败:', error);
    }
  }, 100);
} else {
  console.log('当前页面不支持插件功能');
}
