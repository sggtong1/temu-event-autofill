// 后台脚本 - 处理插件生命周期和跨页面通信
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Temu价格填充工具已安装');
  
  // 初始化默认数据
  if (details.reason === 'install') {
    initializeDefaultData();
  }
});

// 初始化默认数据
async function initializeDefaultData() {
  try {
    // 检查是否已有数据
    const result = await chrome.storage.local.get(['priceData']);
    
    if (!result.priceData || result.priceData.length === 0) {
      // 添加示例数据
      const defaultData = [
        {
          itemNumber: "92-BK-15",
          activityPrice: 48.24,
          costPrice: 30.00,
          note: "便携式水冷风扇-黑色",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          itemNumber: "84-GR-54",
          activityPrice: 48.24,
          costPrice: 30.00,
          note: "便携式水冷风扇-灰色",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          itemNumber: "21-PK-56",
          activityPrice: 48.24,
          costPrice: 30.00,
          note: "便携式水冷风扇-粉色",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      await chrome.storage.local.set({ priceData: defaultData });
      console.log('已初始化默认价格数据');
    }


  } catch (error) {
    console.error('初始化默认数据失败:', error);
  }
}

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  switch (request.action) {
    case 'getPriceData':
      handleGetPriceData(sendResponse);
      return true; // 保持消息通道开放

    case 'fillPrices':
      handleFillPrices(request.data, sendResponse);
      return true;


    default:
      console.log('未知消息类型:', request.action);
  }
});

// 处理获取价格数据请求
async function handleGetPriceData(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['priceData']);
    sendResponse({ success: true, data: result.priceData || [] });
  } catch (error) {
    console.error('获取价格数据失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理填充价格请求
async function handleFillPrices(data, sendResponse) {
  try {
    // 这里可以添加额外的验证逻辑
    console.log('处理价格填充请求:', data);
    sendResponse({ success: true });
  } catch (error) {
    console.error('处理价格填充失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}


// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成且是Temu活动页面时
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('agentseller.temu.com') && 
      tab.url.includes('marketing-activity')) {
    
    console.log('检测到Temu活动页面:', tab.url);
    
    // 可以在这里添加自动注入逻辑
    // 但由于我们使用content_scripts，这里主要是记录日志
  }
});

// 处理插件图标点击
chrome.action.onClicked.addListener((tab) => {
  // 如果当前标签页是Temu活动页面，可以执行特殊操作
  if (tab.url && 
      tab.url.includes('agentseller.temu.com') && 
      tab.url.includes('marketing-activity')) {
    
    // 向内容脚本发送消息，触发价格填充
    chrome.tabs.sendMessage(tab.id, { action: 'triggerFillPrices' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('无法向内容脚本发送消息:', chrome.runtime.lastError);
      } else {
        console.log('价格填充触发响应:', response);
      }
    });
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    console.log('存储数据发生变化:', changes);
    
    // 如果价格数据发生变化，通知所有相关标签页
    if (changes.priceData) {
      notifyContentScripts('priceDataUpdated', changes.priceData.newValue);
    }
  }
});

// 通知所有内容脚本
async function notifyContentScripts(action, data) {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        'https://agentseller.temu.com/*',
        'https://*.temu.com/*'
      ]
    });

    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action, data }, (response) => {
        if (chrome.runtime.lastError) {
          // 忽略无法发送消息的错误（可能是页面未加载content script）
        }
      });
    });
  } catch (error) {
    console.error('通知内容脚本失败:', error);
  }
}

// 处理快捷键
chrome.commands.onCommand.addListener((command) => {
  console.log('快捷键触发:', command);
  
  switch (command) {
    case 'fill-prices':
      // 获取当前活动标签页并触发价格填充
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && 
            tabs[0].url && 
            tabs[0].url.includes('agentseller.temu.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'triggerFillPrices' });
        }
      });
      break;
  }
});
