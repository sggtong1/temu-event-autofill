# 🔧 SKU优先级提取修复说明

## 🐛 问题描述

根据用户提供的真实HTML结构，发现了货号提取的优先级问题：

1. **错误行为**：在找到SKC信息列中的货号 `C-HY100` 后直接返回
2. **遗漏问题**：没有继续查找SKU属性集列中的更具体货号 `C-HY100-PU22`
3. **优先级错误**：SKC信息列优先级高于SKU属性集列

## 🔍 真实页面结构分析

### 表格行结构
```html
<tr data-testid="beast-core-table-body-tr">
  <!-- 列1: 商品信息 -->
  <td rowspan="4">商品信息...</td>
  
  <!-- 列2: SKC信息 -->
  <td rowspan="4">
    <div>79984407319</div>
    <div><span style="color: rgba(0, 0, 0, 0.4);">货号:</span>C-HY100</div>
  </td>
  
  <!-- 列3: SKU属性集 -->
  <td>
    <div>紫色-22mm</div>
    <div><span style="color: rgba(0, 0, 0, 0.4);">货号:</span>C-HY100-PU22</div>
  </td>
  
  <!-- 其他列... -->
</tr>
```

### 问题分析
- **SKC信息列**：包含基础货号 `C-HY100`
- **SKU属性集列**：包含具体规格货号 `C-HY100-PU22`
- **优先级错误**：应该优先提取SKU属性集列的货号

## ✅ 修复方案

### 1. 智能列识别
```javascript
// 遍历所有单元格，识别不同类型的货号列
for (let i = 0; i < cells.length; i++) {
  const cell = cells[i];
  const cellText = cell.textContent;
  
  if (cellText.includes('货号:')) {
    // 检查是否是SKU属性集列（包含具体规格的货号）
    if (cellText.includes('-') && (cellText.includes('mm') || cellText.includes('PU') || cellText.includes('BK') || cellText.includes('GR') || cellText.includes('PK'))) {
      skuAttributeCell = cell;
      this.debugLog(`识别为SKU属性集列（第 ${i + 1} 列）`);
    } else {
      skcInfoCell = cell;
      this.debugLog(`识别为SKC信息列（第 ${i + 1} 列）`);
    }
  }
}
```

### 2. 优先级提取逻辑
```javascript
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
```

### 3. SKU属性集列识别特征
- 包含 `-` 符号（如 `C-HY100-PU22`）
- 包含规格信息（如 `mm`、`PU`、`BK`、`GR`、`PK`）
- 包含颜色和尺寸信息

## 🧪 测试验证

### 测试页面
创建了 `test-sku-priority.html` 测试页面：

1. **SKU优先级测试**：
   - SKC信息列：`货号:C-HY100`
   - SKU属性集列：`货号:C-HY100-PU22`、`货号:C-HY100-PU28`、`货号:C-HY100-BK22`、`货号:C-HY100-BK28`
   - 期望结果：应该提取到 `C-HY100-PU22`（SKU属性集列的第一个）

2. **只有SKC信息列测试**：
   - SKC信息列：`货号:SP-001`
   - 期望结果：应该提取到 `SP-001`

### 预期结果
- 优先从SKU属性集列提取货号
- 如果SKU属性集列没有货号，则从SKC信息列提取
- 调试日志显示正确的列识别和提取过程

## 🔄 修复后的逻辑流程

### 1. 遍历所有单元格
```javascript
const cells = row.querySelectorAll('td');
for (let i = 0; i < cells.length; i++) {
  const cell = cells[i];
  const cellText = cell.textContent;
```

### 2. 识别列类型
```javascript
if (cellText.includes('货号:')) {
  // 检查是否是SKU属性集列
  if (cellText.includes('-') && (cellText.includes('mm') || cellText.includes('PU') || ...)) {
    skuAttributeCell = cell;  // SKU属性集列
  } else {
    skcInfoCell = cell;       // SKC信息列
  }
}
```

### 3. 优先级提取
```javascript
// 1. 优先从SKU属性集列提取
if (skuAttributeCell) { ... }

// 2. 如果SKU属性集列没有，从SKC信息列提取
if (skcInfoCell) { ... }

// 3. 备用方法：从所有单元格查找
for (let cell of cells) { ... }
```

## 📊 修复效果对比

### 修复前
```
[TemuPriceFiller] 在第 3 列找到包含货号的单元格: 79984407319货号:C-HY100...
[TemuPriceFiller] 从SKU属性集列获取货号: C-HY100  // 错误：从SKC信息列获取
```

### 修复后
```
[TemuPriceFiller] 在第 3 列找到包含货号的单元格: 79984407319货号:C-HY100...
[TemuPriceFiller] 识别为SKC信息列（第 3 列）
[TemuPriceFiller] 在第 4 列找到包含货号的单元格: 紫色-22mm货号:C-HY100-PU22...
[TemuPriceFiller] 识别为SKU属性集列（第 4 列）
[TemuPriceFiller] 从SKU属性集列获取货号: C-HY100-PU22  // 正确：从SKU属性集列获取
```

## 🚀 使用方法

### 1. 测试修复效果
1. 打开 `test-sku-priority.html` 页面
2. 点击"测试SKU优先级提取"按钮
3. 查看提取结果是否正确

### 2. 在Temu页面测试
1. 打开Temu活动页面
2. 打开Chrome开发者工具
3. 查看控制台日志
4. 验证是否优先从SKU属性集列提取货号

## ⚠️ 注意事项

### 1. 列识别规则
- SKU属性集列：包含 `-` 和规格信息
- SKC信息列：只包含基础货号
- 识别规则可能需要根据页面变化调整

### 2. 优先级顺序
1. SKU属性集列（最高优先级）
2. SKC信息列（备用）
3. 其他包含货号的列（最后备用）

### 3. 调试信息
- 显示列识别过程
- 显示提取的货号来源
- 便于问题排查

## 🎯 预期结果

修复后，插件应该能够：

1. ✅ **正确识别列类型**：区分SKU属性集列和SKC信息列
2. ✅ **优先提取SKU货号**：从SKU属性集列提取具体规格货号
3. ✅ **备用提取机制**：如果SKU属性集列没有货号，从SKC信息列提取
4. ✅ **详细调试日志**：显示列识别和提取过程

现在插件应该能够正确优先从SKU属性集列提取货号，不会再跳过更具体的货号！🎉

