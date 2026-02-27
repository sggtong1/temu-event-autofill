// 弹窗脚本 - 管理价格数据
class PriceManager {
  constructor() {
    this.priceData = [];
    this.currentEditIndex = -1;
    this.init();
  }

  async init() {
    await this.loadPriceData();
    this.setupEventListeners();
    this.renderPriceTable();
  }

  async loadPriceData() {
    try {
      const result = await chrome.storage.local.get(['priceData']);
      this.priceData = result.priceData || [];
    } catch (error) {
      console.error('加载价格数据失败:', error);
      this.priceData = [];
    }
  }

  async savePriceData() {
    try {
      await chrome.storage.local.set({ priceData: this.priceData });
    } catch (error) {
      console.error('保存价格数据失败:', error);
    }
  }

  setupEventListeners() {
    // 标签页切换
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 添加价格按钮
    document.getElementById('add-price-btn').addEventListener('click', () => {
      this.showPriceModal();
    });

    // 搜索功能
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.filterPrices(e.target.value);
    });

    document.getElementById('search-btn').addEventListener('click', () => {
      this.filterPrices(document.getElementById('search-input').value);
    });

    // 导入导出
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('download-template-btn').addEventListener('click', () => {
      this.downloadImportTemplate();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      this.handleFileImport(e.target.files[0]);
      e.target.value = '';
    });

    document.getElementById('export-json-btn').addEventListener('click', () => {
      this.exportData('json');
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
      this.exportData('csv');
    });

    // 模态框
    document.getElementById('close-modal').addEventListener('click', () => {
      this.hidePriceModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      this.hidePriceModal();
    });

    document.getElementById('save-btn').addEventListener('click', () => {
      this.savePrice();
    });

    // 设置
    document.getElementById('clear-all-btn').addEventListener('click', () => {
      this.clearAllData();
    });

    // 填充按钮
    document.getElementById('fill-prices-btn').addEventListener('click', () => {
      this.fillPrices();
    });

    // 缩放按钮
    document.getElementById('zoom-btn').addEventListener('click', () => {
      this.toggleZoom();
    });

    // 点击模态框外部关闭
    document.getElementById('price-modal').addEventListener('click', (e) => {
      if (e.target.id === 'price-modal') {
        this.hidePriceModal();
      }
    });

    // 表格按钮事件委托
    document.getElementById('price-table-body').addEventListener('click', (e) => {
      if (e.target.classList.contains('btn')) {
        const row = e.target.closest('tr');
        const index = parseInt(row.dataset.index);
        
        if (e.target.textContent === '编辑') {
          this.editRow(index);
        } else if (e.target.textContent === '删除') {
          this.deletePrice(index);
        } else if (e.target.textContent === '保存') {
          this.saveRowEdit(index);
        } else if (e.target.textContent === '取消') {
          this.cancelRowEdit(index);
        }
      }
    });
  }

  switchTab(tabName) {
    // 移除所有活动状态
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // 激活选中的标签页
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
  }

  renderPriceTable() {
    const tbody = document.getElementById('price-table-body');
    const totalCount = document.getElementById('total-count');
    
    if (this.priceData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #666; padding: 40px;">
            暂无价格数据，点击"添加价格"开始使用
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = this.priceData.map((item, index) => {
        const profit = this.calculateProfit(item.activityPrice, item.costPrice);
        const margin = this.calculateMargin(item.activityPrice, item.costPrice);
        
        return `
          <tr data-index="${index}">
            <td><strong>${item.itemNumber}</strong></td>
            <td>¥${item.activityPrice.toFixed(2)}</td>
            <td>${item.costPrice ? '¥' + item.costPrice.toFixed(2) : '-'}</td>
            <td class="${profit >= 0 ? 'profit-amount' : 'profit-amount negative'}">
              ${item.costPrice ? '¥' + profit.toFixed(2) : '-'}
            </td>
            <td class="${margin >= 0 ? 'profit-margin' : 'profit-margin negative'}">
              ${item.costPrice ? margin.toFixed(1) + '%' : '-'}
            </td>
            <td>${this.escapeHtml(item.note) || '-'}</td>
            <td>
              <button class="btn btn-small btn-secondary">编辑</button>
              <button class="btn btn-small btn-danger">删除</button>
            </td>
          </tr>
        `;
      }).join('');
    }
    
    totalCount.textContent = this.priceData.length;
  }

  filterPrices(searchTerm) {
    const filteredData = this.priceData.filter(item => 
      item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const tbody = document.getElementById('price-table-body');
    if (filteredData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #666; padding: 20px;">
            未找到匹配的数据
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = filteredData.map((item, index) => {
        const originalIndex = this.priceData.indexOf(item);
        const profit = this.calculateProfit(item.activityPrice, item.costPrice);
        const margin = this.calculateMargin(item.activityPrice, item.costPrice);
        
        return `
          <tr data-index="${originalIndex}">
            <td><strong>${item.itemNumber}</strong></td>
            <td>¥${item.activityPrice.toFixed(2)}</td>
            <td>${item.costPrice ? '¥' + item.costPrice.toFixed(2) : '-'}</td>
            <td class="${profit >= 0 ? 'profit-amount' : 'profit-amount negative'}">
              ${item.costPrice ? '¥' + profit.toFixed(2) : '-'}
            </td>
            <td class="${margin >= 0 ? 'profit-margin' : 'profit-margin negative'}">
              ${item.costPrice ? margin.toFixed(1) + '%' : '-'}
            </td>
            <td>${this.escapeHtml(item.note) || '-'}</td>
            <td>
              <button class="btn btn-small btn-secondary">编辑</button>
              <button class="btn btn-small btn-danger">删除</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  showPriceModal(index = -1) {
    this.currentEditIndex = index;
    const modal = document.getElementById('price-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('price-form');

    if (index >= 0) {
      // 编辑模式
      title.textContent = '编辑价格数据';
      const item = this.priceData[index];
      document.getElementById('item-number').value = item.itemNumber;
      document.getElementById('activity-price').value = item.activityPrice;
      document.getElementById('cost-price').value = item.costPrice || '';
      document.getElementById('profit-margin').value = '';
      document.getElementById('note').value = item.note || '';
    } else {
      // 添加模式
      title.textContent = '添加价格数据';
      form.reset();
    }

    // 添加毛利率计算事件监听器
    this.setupMarginCalculation();

    modal.classList.add('show');
    document.getElementById('item-number').focus();
  }

  // 设置毛利率计算
  setupMarginCalculation() {
    const costPriceInput = document.getElementById('cost-price');
    const activityPriceInput = document.getElementById('activity-price');
    const profitMarginInput = document.getElementById('profit-margin');

    // 清除之前的事件监听器
    costPriceInput.removeEventListener('input', this.handleMarginCalculation);
    activityPriceInput.removeEventListener('input', this.handleMarginCalculation);
    profitMarginInput.removeEventListener('input', this.handleMarginCalculation);

    // 绑定新的事件监听器
    this.handleMarginCalculation = () => {
      const costPrice = parseFloat(costPriceInput.value) || 0;
      const profitMargin = parseFloat(profitMarginInput.value) || 0;
      
      if (costPrice > 0 && profitMargin > 0) {
        const calculatedPrice = this.calculateActivityPriceFromMargin(costPrice, profitMargin);
        activityPriceInput.value = calculatedPrice.toFixed(2);
      }
    };

    costPriceInput.addEventListener('input', this.handleMarginCalculation);
    profitMarginInput.addEventListener('input', this.handleMarginCalculation);
  }

  hidePriceModal() {
    document.getElementById('price-modal').classList.remove('show');
    this.currentEditIndex = -1;
  }

  async savePrice() {
    const form = document.getElementById('price-form');
    const formData = new FormData(form);
    
    const itemNumber = document.getElementById('item-number').value.trim();
    const activityPrice = document.getElementById('activity-price').value;
    const costPrice = document.getElementById('cost-price').value;
    const profitMargin = document.getElementById('profit-margin').value;
    const note = document.getElementById('note').value.trim();

    if (!itemNumber || (!activityPrice && !profitMargin)) {
      alert('请填写货号和活动价格或毛利率');
      return;
    }

    // 检查货号是否重复（编辑时排除自己）
    const existingIndex = this.priceData.findIndex((item, index) => 
      item.itemNumber === itemNumber && index !== this.currentEditIndex
    );

    if (existingIndex >= 0) {
      alert('该货号已存在，请使用不同的货号');
      return;
    }

    let finalActivityPrice = parseFloat(activityPrice);
    let finalCostPrice = costPrice ? parseFloat(costPrice) : null;

    // 如果设置了毛利率，根据成本价格计算活动价格
    if (profitMargin && finalCostPrice) {
      finalActivityPrice = this.calculateActivityPriceFromMargin(finalCostPrice, parseFloat(profitMargin));
    }

    const priceItem = {
      itemNumber,
      activityPrice: finalActivityPrice,
      costPrice: finalCostPrice,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.currentEditIndex >= 0) {
      // 更新现有数据
      priceItem.createdAt = this.priceData[this.currentEditIndex].createdAt;
      this.priceData[this.currentEditIndex] = priceItem;
    } else {
      // 添加新数据
      this.priceData.push(priceItem);
    }

    await this.savePriceData();
    this.renderPriceTable();
    this.hidePriceModal();
    
    this.showMessage('保存成功！', 'success');
  }

  editPrice(index) {
    this.showPriceModal(index);
  }

  // 行内编辑功能
  editRow(index) {
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    // 如果已经在编辑状态，先保存
    if (row.classList.contains('editing-row')) {
      this.saveRowEdit(index);
      return;
    }

    // 进入编辑状态
    row.classList.add('editing-row');
    const item = this.priceData[index];
    
    // 将单元格内容替换为输入框
    const cells = row.querySelectorAll('td');
    
    // 货号（不可编辑）
    cells[0].innerHTML = `<strong>${item.itemNumber}</strong>`;
    
    // 活动价格
    cells[1].innerHTML = `<input type="number" value="${item.activityPrice}" step="0.01" data-field="activityPrice">`;
    
    // 成本价格
    cells[2].innerHTML = `<input type="number" value="${item.costPrice || ''}" step="0.01" data-field="costPrice">`;
    
    // 毛利润（只读，自动计算）
    const profit = this.calculateProfit(item.activityPrice, item.costPrice);
    cells[3].innerHTML = `<span class="${profit >= 0 ? 'profit-amount' : 'profit-amount negative'}">${item.costPrice ? '¥' + profit.toFixed(2) : '-'}</span>`;
    
    // 毛利率（可编辑，用于反推活动价格）
    const margin = this.calculateMargin(item.activityPrice, item.costPrice);
    cells[4].innerHTML = `<input type="number" value="${item.costPrice ? margin.toFixed(1) : ''}" step="0.1" min="0" max="100" data-field="profitMargin" placeholder="毛利率%">`;
    
    // 备注
    cells[5].innerHTML = `<input type="text" value="${item.note || ''}" data-field="note">`;
    
    // 操作按钮
    cells[6].innerHTML = `
      <button class="btn btn-small btn-primary">保存</button>
      <button class="btn btn-small btn-secondary">取消</button>
    `;

    // 添加输入事件监听器，实时计算毛利润和毛利率
    const inputs = row.querySelectorAll('input[data-field]');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.updateRowCalculations(index));
    });

    // 聚焦第一个输入框
    inputs[0].focus();
  }

  // 更新行计算（实时计算毛利润和毛利率）
  updateRowCalculations(index) {
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (!row || !row.classList.contains('editing-row')) return;

    const activityPriceInput = row.querySelector('input[data-field="activityPrice"]');
    const costPriceInput = row.querySelector('input[data-field="costPrice"]');
    const profitMarginInput = row.querySelector('input[data-field="profitMargin"]');
    
    const activityPrice = parseFloat(activityPriceInput.value) || 0;
    const costPrice = parseFloat(costPriceInput.value) || null;
    const profitMargin = parseFloat(profitMarginInput.value) || null;
    
    let finalActivityPrice = activityPrice;
    let finalCostPrice = costPrice;
    
    // 如果设置了毛利率和成本价格，根据毛利率反推活动价格
    if (profitMargin !== null && costPrice && costPrice > 0) {
      finalActivityPrice = this.calculateActivityPriceFromMargin(costPrice, profitMargin);
      activityPriceInput.value = finalActivityPrice.toFixed(2);
    }
    
    // 如果设置了活动价格和成本价格，计算毛利率
    if (finalActivityPrice > 0 && finalCostPrice && finalCostPrice > 0) {
      const calculatedMargin = this.calculateMargin(finalActivityPrice, finalCostPrice);
      if (profitMarginInput.value === '' || Math.abs(calculatedMargin - (profitMargin || 0)) > 0.1) {
        profitMarginInput.value = calculatedMargin.toFixed(1);
      }
    }
    
    const profit = this.calculateProfit(finalActivityPrice, finalCostPrice);
    const margin = this.calculateMargin(finalActivityPrice, finalCostPrice);
    
    // 更新毛利润显示
    const profitCell = row.children[3];
    profitCell.innerHTML = `<span class="${profit >= 0 ? 'profit-amount' : 'profit-amount negative'}">${finalCostPrice ? '¥' + profit.toFixed(2) : '-'}</span>`;
  }

  // 保存行编辑
  async saveRowEdit(index) {
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (!row || !row.classList.contains('editing-row')) return;

    const activityPriceInput = row.querySelector('input[data-field="activityPrice"]');
    const costPriceInput = row.querySelector('input[data-field="costPrice"]');
    const profitMarginInput = row.querySelector('input[data-field="profitMargin"]');
    const noteInput = row.querySelector('input[data-field="note"]');
    
    const activityPrice = parseFloat(activityPriceInput.value);
    const costPrice = costPriceInput.value ? parseFloat(costPriceInput.value) : null;
    const profitMargin = profitMarginInput.value ? parseFloat(profitMarginInput.value) : null;
    const note = noteInput.value.trim();

    if (!activityPrice || activityPrice <= 0) {
      alert('活动价格必须大于0');
      return;
    }

    // 如果设置了毛利率和成本价格，重新计算活动价格
    let finalActivityPrice = activityPrice;
    if (profitMargin !== null && costPrice && costPrice > 0) {
      finalActivityPrice = this.calculateActivityPriceFromMargin(costPrice, profitMargin);
    }

    // 更新数据
    this.priceData[index].activityPrice = finalActivityPrice;
    this.priceData[index].costPrice = costPrice;
    this.priceData[index].note = note;
    this.priceData[index].updatedAt = new Date().toISOString();

    await this.savePriceData();
    this.renderPriceTable();
    this.showMessage('保存成功！', 'success');
  }

  // 取消行编辑
  cancelRowEdit(index) {
    this.renderPriceTable();
  }

  async deletePrice(index) {
    if (confirm('确定要删除这条价格数据吗？')) {
      this.priceData.splice(index, 1);
      await this.savePriceData();
      this.renderPriceTable();
      this.showMessage('删除成功！', 'success');
    }
  }

  // 计算毛利润
  calculateProfit(activityPrice, costPrice) {
    if (!costPrice) return 0;
    return activityPrice - costPrice;
  }

  // 计算毛利率
  calculateMargin(activityPrice, costPrice) {
    if (!costPrice || activityPrice === 0) return 0;
    return ((activityPrice - costPrice) / activityPrice) * 100;
  }

  // 根据毛利率计算活动价格
  calculateActivityPriceFromMargin(costPrice, marginPercent) {
    if (!costPrice || marginPercent < 0) return costPrice;
    return costPrice / (1 - marginPercent / 100);
  }

  // HTML转义，防止XSS和显示问题
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 标准化导入数据项，支持多种字段名称
  normalizeImportItem(item) {
    const normalized = {};

    normalized.itemNumber = this.cleanString(
      item.itemNumber || item.sku_id || item.skuId || item['货号'] || item.item_number || item.sku || ''
    );

    normalized.activityPrice = this.toPositiveNumber(
      item.activityPrice || item.activity_price || item['活动价格'] || item['活动申报价格'] || item.salePrice || 0
    );

    const costPrice = item.costPrice || item.cost_price || item['成本'] || item['成本价格'] || item.cost || null;
    normalized.costPrice = this.toNullableNumber(costPrice);

    const noteValue = item.note || item.sku_name || item.skuName || item['产品名称'] || item['商品名称'] ||
                      item.product_name || item['备注'] || item.description || item.desc || null;
    normalized.note = noteValue ? this.cleanString(noteValue) : '';

    return normalized;
  }

  cleanString(value) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '').trim();
  }

  toPositiveNumber(value) {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(String(value).replace(/[,%，\s]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  toNullableNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(String(value).replace(/[,%，\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  isValidImportItem(item) {
    return Boolean(item.itemNumber) && Number.isFinite(item.activityPrice) && item.activityPrice > 0;
  }

  async handleFileImport(file) {
    if (!file) return;

    const fileInfo = document.getElementById('file-info');
    fileInfo.textContent = `已选择: ${file.name}`;

    try {
      const extension = (file.name.split('.').pop() || '').toLowerCase();
      let importedData = [];

      if (extension === 'json') {
        let text = await file.text();
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        importedData = JSON.parse(text).map(item => this.normalizeImportItem(item));
      } else if (extension === 'csv') {
        let text = await file.text();
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        importedData = this.parseCSV(text);
      } else if (extension === 'xlsx') {
        importedData = await this.parseXLSX(file);
      } else {
        throw new Error('不支持的文件格式，仅支持 .json/.csv/.xlsx');
      }

      const validData = importedData.filter(item => this.isValidImportItem(item));
      if (!validData.length) {
        throw new Error('没有找到有效的数据（请确保包含货号和活动价格）');
      }

      const existingNumbers = new Set(this.priceData.map(item => item.itemNumber));
      const newData = validData.filter(item => !existingNumbers.has(item.itemNumber));

      this.priceData = [...this.priceData, ...newData];
      await this.savePriceData();
      this.renderPriceTable();
      this.showMessage(`成功导入 ${newData.length} 条数据`, 'success');

      const skippedCount = validData.length - newData.length;
      if (skippedCount > 0) {
        this.showMessage(`${skippedCount} 条数据因货号重复被跳过`, 'warning');
      }
    } catch (error) {
      console.error('导入失败:', error);
      this.showMessage(`导入失败: ${error.message}`, 'error');
    }
  }

  async parseXLSX(file) {
    const entries = await this.readZipEntries(await file.arrayBuffer());
    const decoder = new TextDecoder('utf-8');

    const sheetData = entries.get('xl/worksheets/sheet1.xml');
    if (!sheetData) throw new Error('XLSX缺少sheet1.xml，暂不支持该文件');

    const sharedStringsData = entries.get('xl/sharedStrings.xml');
    const sharedStrings = sharedStringsData ? this.parseSharedStrings(decoder.decode(sharedStringsData)) : [];
    const rows = this.parseSheetRows(decoder.decode(sheetData), sharedStrings);
    if (!rows.length) return [];

    const headers = rows[0].map(v => this.cleanString(v).toLowerCase());
    return rows.slice(1).map(values => {
      const rowObject = {};
      headers.forEach((header, index) => {
        if (header) rowObject[header] = values[index] ?? '';
      });
      return this.normalizeImportItem(rowObject);
    });
  }

  async readZipEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const entries = new Map();

    let offset = 0;
    while (offset + 30 <= bytes.length) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x04034b50) break;

      const compression = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const dataStart = nameStart + fileNameLength + extraLength;
      const fileName = new TextDecoder('utf-8').decode(bytes.slice(nameStart, nameStart + fileNameLength));
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

      if (!fileName.endsWith('/')) {
        if (compression === 0) {
          entries.set(fileName, compressedData);
        } else if (compression === 8) {
          const decompressed = await this.inflateRaw(compressedData);
          entries.set(fileName, decompressed);
        }
      }

      offset = dataStart + compressedSize;
    }

    return entries;
  }

  async inflateRaw(data) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持XLSX解压，请升级浏览器');
    }

    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }

  parseSharedStrings(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    return [...doc.querySelectorAll('si')].map(node => [...node.querySelectorAll('t')].map(t => t.textContent || '').join(''));
  }

  parseSheetRows(xmlText, sharedStrings) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const rows = [];

    doc.querySelectorAll('sheetData > row').forEach(row => {
      const values = [];
      row.querySelectorAll('c').forEach(cell => {
        const ref = cell.getAttribute('r') || '';
        const colLetters = ref.replace(/[0-9]/g, '');
        const colIndex = this.columnLettersToIndex(colLetters);
        const type = cell.getAttribute('t');
        const raw = cell.querySelector('v')?.textContent ?? '';

        let value = raw;
        if (type === 's') {
          value = sharedStrings[Number(raw)] ?? '';
        }
        values[colIndex] = value;
      });
      rows.push(values.map(v => (v === undefined ? '' : v)));
    });

    return rows;
  }

  columnLettersToIndex(letters) {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 64);
    }
    return Math.max(0, result - 1);
  }

  parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV文件至少需要包含表头和数据行');

    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    const fieldMapping = {
      itemNumber: ['sku_id', '货号', 'itemnumber', 'item_number', 'sku', '商品编号', '产品编号'],
      activityPrice: ['activity_price', '活动价格', 'activityprice', '活动申报价格', '申报价格', '售价'],
      costPrice: ['cost_price', '成本', '成本价格', 'costprice', '成本价', '进价'],
      note: ['sku_name', '产品名称', '商品名称', 'product_name', 'note', '备注', '描述', '产品名']
    };

    const fieldIndexMap = {};
    Object.keys(fieldMapping).forEach(field => {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim();
        const aliases = fieldMapping[field].map(a => a.toLowerCase());
        if (aliases.includes(header) || aliases.some(alias => alias.length >= 2 && header.includes(alias))) {
          fieldIndexMap[field] = i;
          break;
        }
      }
    });

    if (fieldIndexMap.itemNumber === undefined) throw new Error('未找到货号字段（支持: sku_id, 货号, itemNumber等）');
    if (fieldIndexMap.activityPrice === undefined) throw new Error('未找到活动价格字段（支持: activity_price, 活动价格等）');

    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      return {
        itemNumber: this.cleanString(values[fieldIndexMap.itemNumber] || ''),
        activityPrice: this.toPositiveNumber(values[fieldIndexMap.activityPrice]),
        costPrice: this.toNullableNumber(values[fieldIndexMap.costPrice]),
        note: this.cleanString(values[fieldIndexMap.note] || '')
      };
    }).filter(item => this.isValidImportItem(item));
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  escapeCSVCell(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
  }

  triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  buildStoredZip(entries) {
    const encoder = new TextEncoder();
    const fileRecords = [];
    const centralRecords = [];
    let offset = 0;

    entries.forEach(({ name, data }) => {
      const fileName = encoder.encode(name);
      const fileData = typeof data === 'string' ? encoder.encode(data) : data;
      const localHeader = new Uint8Array(30 + fileName.length + fileData.length);
      const localView = new DataView(localHeader.buffer);

      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(8, 0, true);
      localView.setUint32(14, 0, true);
      localView.setUint32(18, fileData.length, true);
      localView.setUint32(22, fileData.length, true);
      localView.setUint16(26, fileName.length, true);
      localHeader.set(fileName, 30);
      localHeader.set(fileData, 30 + fileName.length);

      const centralHeader = new Uint8Array(46 + fileName.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint32(16, 0, true);
      centralView.setUint32(20, fileData.length, true);
      centralView.setUint32(24, fileData.length, true);
      centralView.setUint16(28, fileName.length, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(fileName, 46);

      fileRecords.push(localHeader);
      centralRecords.push(centralHeader);
      offset += localHeader.length;
    });

    const centralSize = centralRecords.reduce((sum, r) => sum + r.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);

    return new Blob([...fileRecords, ...centralRecords, endRecord], { type: 'application/zip' });
  }

  downloadImportTemplate() {
    const rows = [
      ['sku_id', 'sku_name', 'activity_price', 'cost_price', 'note'],
      ['92-BK-15', '便携风扇', '48.24', '30', '示例数据']
    ];

    const sheetXmlRows = rows.map((cols, r) => `<row r="${r + 1}">${cols.map((v, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${this.escapeHtml(v)}</t></is></c>`).join('')}</row>`).join('');

    const entries = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="导入模板" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
      { name: 'xl/worksheets/sheet1.xml', data: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetXmlRows}</sheetData></worksheet>` }
    ];

    const zipBlob = this.buildStoredZip(entries);
    this.triggerDownload(zipBlob, 'temu-price-import-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    this.showMessage('模板下载成功', 'success');
  }

  exportData(format) {
    if (this.priceData.length === 0) {
      this.showMessage('没有数据可导出', 'warning');
      return;
    }

    let content;
    let filename;
    let mimeType;

    if (format === 'json') {
      content = JSON.stringify(this.priceData, null, 2);
      filename = `temu-prices-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const headers = ['货号', '活动价格', '成本价格', '毛利润', '毛利率(%)', '备注'];
      content = [
        headers.join(','),
        ...this.priceData.map(item => {
          const profit = this.calculateProfit(item.activityPrice, item.costPrice);
          const margin = this.calculateMargin(item.activityPrice, item.costPrice);
          return [
            this.escapeCSVCell(item.itemNumber),
            this.escapeCSVCell(item.activityPrice),
            this.escapeCSVCell(item.costPrice || ''),
            this.escapeCSVCell(item.costPrice ? profit.toFixed(2) : ''),
            this.escapeCSVCell(item.costPrice ? margin.toFixed(1) : ''),
            this.escapeCSVCell(item.note || '')
          ].join(',');
        })
      ].join('\n');
      filename = `temu-prices-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    this.triggerDownload(content, filename, mimeType);
    this.showMessage(`导出成功: ${filename}`, 'success');
  }

  async clearAllData() {
    if (confirm('确定要清空所有价格数据吗？此操作不可恢复！')) {
      this.priceData = [];
      await this.savePriceData();
      this.renderPriceTable();
      this.showMessage('已清空所有数据', 'success');
    }
  }

  async fillPrices() {
    const fillBtn = document.getElementById('fill-prices-btn');
    const statusEl = document.getElementById('fill-status');
    
    if (this.priceData.length === 0) {
      this.showMessage('没有价格数据可填充，请先添加数据', 'warning');
      return;
    }

    try {
      // 更新按钮状态
      fillBtn.disabled = true;
      fillBtn.textContent = '🔄 填充中...';
      statusEl.textContent = '正在填充价格...';

      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }

      // 检查是否是Temu页面
      const currentUrl = tab.url || '';
      const isTemuPage = currentUrl.includes('agentseller.temu.com') &&
                         currentUrl.includes('marketing-activity');
      
      if (!isTemuPage) {
        throw new Error('请在Temu活动页面使用此功能');
      }

      // 向content script发送填充消息
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillPrices',
        priceData: this.priceData
      });

      if (response && response.success) {
        const message = response.skippedCount > 0 
          ? `✅ 成功填充 ${response.filledCount} 个价格，跳过 ${response.skippedCount} 个`
          : `✅ 成功填充 ${response.filledCount} 个价格`;
        statusEl.textContent = message;
        this.showMessage(message, 'success');
        
        // 如果有跳过的项目，显示详细信息
        if (response.skippedItems && response.skippedItems.length > 0) {
          setTimeout(() => {
            this.showMessage(`跳过的项目: ${response.skippedItems.join(', ')}`, 'warning');
          }, 1000);
        }
      } else {
        throw new Error(response?.error || '填充失败');
      }

    } catch (error) {
      console.error('填充价格失败:', error);
      statusEl.textContent = `❌ 填充失败: ${error.message}`;
      this.showMessage(`填充失败: ${error.message}`, 'error');
    } finally {
      // 恢复按钮状态
      fillBtn.disabled = false;
      fillBtn.textContent = '🚀 填充活动价格';
      
      // 3秒后恢复状态文本
      setTimeout(() => {
        statusEl.textContent = '准备就绪';
      }, 3000);
    }
  }

  toggleZoom() {
    const body = document.body;
    const zoomBtn = document.getElementById('zoom-btn');
    
    if (body.style.width === '100vw') {
      // 切换到小窗口模式
      body.style.width = '500px';
      body.style.height = '600px';
      body.style.position = 'fixed';
      body.style.top = '50%';
      body.style.left = '50%';
      body.style.transform = 'translate(-50%, -50%)';
      body.style.borderRadius = '12px';
      body.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      zoomBtn.textContent = '⛶';
      zoomBtn.title = '放大窗口';
    } else {
      // 切换到全屏模式
      body.style.width = '100vw';
      body.style.height = '600px';
      body.style.position = 'relative';
      body.style.top = 'auto';
      body.style.left = 'auto';
      body.style.transform = 'none';
      body.style.borderRadius = '0';
      body.style.boxShadow = 'none';
      zoomBtn.textContent = '⊡';
      zoomBtn.title = '缩小窗口';
    }
  }


  showMessage(message, type = 'info') {
    // 创建消息提示元素
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease;
    `;

    // 根据类型设置样式
    const styles = {
      success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
      warning: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
      error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
      info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
    };

    messageEl.style.cssText += styles[type] || styles.info;

    document.body.appendChild(messageEl);

    // 3秒后移除
    setTimeout(() => {
      messageEl.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => messageEl.remove(), 300);
    }, 3000);
  }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// 初始化价格管理器
const priceManager = new PriceManager();
