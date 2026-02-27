# 🔧 Manifest.json 修复说明

## 🐛 问题描述

用户在上传Chrome插件时遇到错误：
```
上传失败
无法读取插件版本号
```

## 🔍 问题分析

### 根本原因
`manifest.json` 文件为空，导致Chrome无法读取插件的基本信息，包括版本号。

### 文件状态检查
```bash
# 检查文件内容
Get-Content manifest.json
# 结果：文件完全为空
```

## ✅ 修复方案

### 1. 重新创建 manifest.json
使用英文内容避免编码问题：

```json
{
  "manifest_version": 3,
  "name": "Temu Price Filler",
  "version": "1.0.0",
  "description": "Auto fill preset prices for Temu activity pages",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "https://*.temu.com/*",
    "https://*.pftk.temu.com/*",
    "https://*.thtk.temu.com/*",
    "file://*/*test-page.html",
    "http://localhost/*test-page.html",
    "http://127.0.0.1/*test-page.html",
    "http://localhost:8000/*",
    "http://127.0.0.1:8000/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://*.temu.com/*",
        "https://*.pftk.temu.com/*",
        "https://*.thtk.temu.com/*",
        "file://*/*test-page.html",
        "http://localhost/*test-page.html",
        "http://127.0.0.1/*test-page.html",
        "http://localhost:8000/*",
        "http://127.0.0.1:8000/*"
      ],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Temu Price Filler"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### 2. 验证文件有效性
使用PowerShell验证JSON格式：

```powershell
Get-Content manifest.json | ConvertFrom-Json
```

**验证结果**：✅ 成功，文件格式正确

## 📋 文件结构确认

### 必需文件列表
- ✅ `manifest.json` - 插件配置文件
- ✅ `content.js` - 内容脚本
- ✅ `content.css` - 内容样式
- ✅ `popup.html` - 弹窗界面
- ✅ `popup.js` - 弹窗逻辑
- ✅ `popup.css` - 弹窗样式
- ✅ `background.js` - 后台脚本

### 文件权限配置
- **storage**: 本地存储权限
- **activeTab**: 当前标签页访问权限
- **scripting**: 脚本注入权限
- **tabs**: 标签页管理权限

### 域名匹配规则
- `https://*.temu.com/*` - Temu主域名
- `https://*.pftk.temu.com/*` - Temu子域名
- `https://*.thtk.temu.com/*` - Temu子域名
- `file://*/*test-page.html` - 本地测试页面
- `http://localhost/*` - 本地开发服务器
- `http://127.0.0.1/*` - 本地开发服务器

## 🚀 安装步骤

### 1. 打包插件
1. 选择所有必需文件
2. 压缩为ZIP文件
3. 确保 `manifest.json` 在根目录

### 2. 安装到Chrome
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择插件文件夹

### 3. 验证安装
1. 检查插件是否出现在扩展程序列表中
2. 确认版本号显示为 "1.0.0"
3. 测试弹窗是否正常打开

## ⚠️ 注意事项

### 1. 文件编码
- 使用UTF-8编码保存文件
- 避免中文字符在manifest.json中
- 确保JSON格式正确

### 2. 文件完整性
- 确保所有必需文件都存在
- 检查文件路径是否正确
- 验证文件内容是否完整

### 3. 权限配置
- 只申请必要的权限
- 确保host_permissions包含目标域名
- 验证content_scripts配置正确

## 🔍 故障排除

### 问题1：仍然无法读取版本号
**解决方案**：
1. 检查文件是否保存成功
2. 验证JSON格式是否正确
3. 确保文件编码为UTF-8

### 问题2：插件加载失败
**解决方案**：
1. 检查所有必需文件是否存在
2. 验证文件路径配置
3. 查看Chrome控制台错误信息

### 问题3：权限被拒绝
**解决方案**：
1. 检查host_permissions配置
2. 确保目标域名在允许列表中
3. 验证manifest_version是否为3

## 📊 修复效果

### 修复前
```
上传失败
无法读取插件版本号
```

### 修复后
```
✅ 插件版本号: 1.0.0
✅ 插件名称: Temu Price Filler
✅ 插件描述: Auto fill preset prices for Temu activity pages
✅ 所有必需文件完整
✅ JSON格式验证通过
```

现在插件应该可以正常上传和安装了！🎉

