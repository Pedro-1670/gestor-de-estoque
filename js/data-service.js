/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * data-service.js - Camada de Dados Centralizada
 *
 * Carrega e mescla planilhas do Google Sheets (Inventory Base + Barcode Base)
 */

const DataService = {
    inventory: [],
    barcodeDatabase: [],
    mergedProducts: [],
    inventoryCache: null,
    barcodeCache: null,
    isLoaded: false,

    // Base de Estoque importada (Tarefa 1) - armazenamento independente do fluxo de merge acima
    stockBase: [],

    KEYS: {
        INVENTORY_URL: 'inventory_gsheet_url',
        BARCODE_URL: 'barcode_gsheet_url'
    },

    createProductModel(inventoryItem, barcodeItem) {
        return {
            code: this.normalizeValue(inventoryItem.Codigo || inventoryItem.Código || inventoryItem.Code || ''),
            description: this.normalizeValue(inventoryItem.Produto || inventoryItem.Nome || inventoryItem.Description || ''),
            brand: this.normalizeValue(inventoryItem.Marca || inventoryItem.Brand || ''),
            group: this.normalizeValue(inventoryItem.Grupo || inventoryItem.Group || ''),
            subgroup: this.normalizeValue(inventoryItem.Subgrupo || inventoryItem.Subgroup || ''),
            currentStock: this.normalizeStock(inventoryItem.Estoque || inventoryItem.Stock || inventoryItem.CurrentQuantity || 0),
            store: this.normalizeValue(inventoryItem.Loja || inventoryItem.Store || ''),
            prices: this.normalizeValue(inventoryItem.Preços || inventoryItem.Prices || ''),

            unitBarcode: this.normalizeValue(barcodeItem ? (barcodeItem['Unit Barcode'] || barcodeItem.CodigoBarrasUnidade || barcodeItem.BarcodeUnidade || '') : ''),
            boxBarcode: this.normalizeValue(barcodeItem ? (barcodeItem['Box Barcode'] || barcodeItem.CodigoBarrasCaixa || barcodeItem.BarcodeCaixa || '') : ''),
            multiplier: barcodeItem ? Number(barcodeItem['Multiplication Quantity'] || barcodeItem.Multiplicidade || barcodeItem.QtdPorCaixa || 1) : 1,

            location: this.normalizeValue(barcodeItem ? (barcodeItem.Location || barcodeItem.Localizacao || '') : ''),

            countedQuantity: 0,
            difference: 0,
            status: 'OK'
        };
    },

    normalizeValue(value) {
        return value === undefined || value === null ? '' : String(value).trim();
    },

    normalizeStock(value) {
        if (value === undefined || value === null || value === '') {
            return 0;
        }
        let normalized = String(value).trim().replace(/\s+/g, '');
        const hasComma = normalized.includes(',');
        const hasDot = normalized.includes('.');

        if (hasComma && hasDot) {
            const lastSeparatorIndex = Math.max(normalized.lastIndexOf(','), normalized.lastIndexOf('.'));
            const decimalSeparator = normalized[lastSeparatorIndex];
            const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
            normalized = normalized.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
        } else if (hasComma) {
            normalized = normalized.replace(',', '.');
        } else if (hasDot && normalized.split('.').length > 2) {
            normalized = normalized.replace(/\./g, '');
        }

        const stock = Number(normalized);
        return Number.isFinite(stock) ? stock : 0;
    },

    getProductCode(item) {
        return this.normalizeValue(
            item.Codigo || item.Código || item.Code || item.ProductCode || item['Product Code'] || item.SKU || item.EAN
        ).toLowerCase();
    },

    saveInventoryUrl(url) {
        localStorage.setItem(this.KEYS.INVENTORY_URL, url);
    },

    saveBarcodeUrl(url) {
        localStorage.setItem(this.KEYS.BARCODE_URL, url);
    },

    getInventoryUrl() {
        return localStorage.getItem(this.KEYS.INVENTORY_URL) || '';
    },

    getBarcodeUrl() {
        return localStorage.getItem(this.KEYS.BARCODE_URL) || '';
    },

    async loadInventory(url) {
        const inventoryUrl = url || this.getInventoryUrl();
        if (!inventoryUrl) {
            console.warn('DataService: URL da planilha de inventário não configurada');
            return [];
        }

        try {
            const response = await fetch(inventoryUrl);
            if (!response.ok) {
                throw new Error('Falha ao carregar planilha de inventário');
            }

            const csvText = await response.text();
            const parsed = this.parseCSV(csvText);
            this.inventory = parsed;
            this.inventoryCache = parsed;
            console.log(`DataService: ${parsed.length} produtos carregados da planilha de inventário`);
            return parsed;
        } catch (error) {
            console.error('DataService: Erro ao carregar inventário:', error.message);
            this.inventory = [];
            this.inventoryCache = [];
            return [];
        }
    },

    async loadBarcodeDatabase(url) {
        const barcodeUrl = url || this.getBarcodeUrl();
        if (!barcodeUrl) {
            console.warn('DataService: URL da planilha de código de barras não configurada');
            return [];
        }

        try {
            const response = await fetch(barcodeUrl);
            if (!response.ok) {
                throw new Error('Falha ao carregar planilha de código de barras');
            }

            const csvText = await response.text();
            const parsed = this.parseCSV(csvText);
            this.barcodeDatabase = parsed;
            this.barcodeCache = parsed;
            console.log(`DataService: ${parsed.length} registros carregados da planilha de código de barras`);
            return parsed;
        } catch (error) {
            console.error('DataService: Erro ao carregar base de código de barras:', error.message);
            this.barcodeDatabase = [];
            this.barcodeCache = [];
            return [];
        }
    },

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]);
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = this.parseCSVLine(lines[i]);
            const row = {};

            headers.forEach((header, idx) => {
                row[header.trim()] = values[idx] || '';
            });

            if (Object.values(row).some(v => v && String(v).trim())) {
                rows.push(row);
            }
        }

        return rows;
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    },

    /**
     * Maps a raw CSV row from the Base de Estoque spreadsheet into the
     * standard internal product shape used by the stock base import.
     * Accepts common PT/EN header variations, since the ERP export
     * may use different column names depending on the store.
     * @param {Object} row - Raw row parsed from the CSV (keys = headers)
     * @returns {Object} { codigo, descricao, marca, grupo, subGrupo, quantidade, loja }
     */
    mapStockBaseRow(row) {
        return {
            codigo: this.normalizeValue(row['Código do Produto'] || row['Codigo'] || row['Código'] || row['Code'] || ''),
            descricao: this.normalizeValue(row['Descrição'] || row['Descricao'] || row['Produto'] || row['Description'] || ''),
            marca: this.normalizeValue(row['Marca'] || row['Brand'] || ''),
            grupo: this.normalizeValue(row['Grupo'] || row['Group'] || ''),
            subGrupo: this.normalizeValue(row['Subgrupo'] || row['Sub Grupo'] || row['SubGrupo'] || row['Subgroup'] || ''),
            quantidade: this.normalizeStock(row['Quantidade Atual'] || row['Quantidade'] || row['Qtde'] || row['Estoque'] || row['Stock'] || 0),
            loja: this.normalizeValue(row['Loja'] || row['Store'] || '')
        };
    },

    /**
     * Importa a Base de Estoque (Planilha 1) a partir do Google Sheets.
     * Lê a aba informada, usa a primeira linha como cabeçalho e converte
     * as demais linhas em objetos JavaScript padronizados.
     *
     * Esta função NUNCA lança exceção: qualquer erro é retornado de forma
     * estruturada para que a interface (em uma tarefa futura) possa exibi-lo
     * sem travar a aplicação.
     *
     * @param {string} spreadsheetId - ID da planilha do Google Sheets
     * @param {string} sheetName - Nome da aba a ser importada
     * @returns {Promise<{success: boolean, message: string, count: number, products: Array}>}
     */
    /**
     * Extrai o ID puro da planilha, aceitando tanto o ID em si quanto a
     * URL completa do Google Sheets (ex: colada direto da barra de endereço).
     * @param {string} input
     * @returns {string}
     */
    extractSpreadsheetId(input) {
        const value = String(input).trim();
        const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : value;
    },

    /**
     * Extrai o gid (identificador da aba) de uma URL colada do Google Sheets
     * (ex: .../edit#gid=123456789). Permite importar direto da URL sem
     * precisar digitar o nome da aba separadamente.
     * @param {string} input
     * @returns {string}
     */
    extractSheetGid(input) {
        const value = String(input).trim();
        const match = value.match(/[?#&]gid=(\d+)/);
        return match ? match[1] : '';
    },

    /**
     * Conector único de Google Sheets: busca a planilha (via endpoint
     * gviz/tq, somente leitura) e devolve as linhas cruas já parseadas
     * (chave = cabeçalho da planilha). Reaproveitado por importStockBase,
     * importProductCatalogFromSheet e importInventoryQuantitiesFromSheet -
     * nenhum deles lança exceção.
     *
     * O nome da aba é opcional: se não for informado, tenta usar o gid
     * extraído da própria URL colada no campo do ID; se nenhum dos dois
     * estiver disponível, o endpoint usa a primeira aba da planilha.
     * @param {string} spreadsheetId
     * @param {string} [sheetName]
     * @returns {Promise<{success: boolean, message: string, rows: Array}>}
     */
    async _fetchSheetRows(spreadsheetId, sheetName) {
        const fail = (message) => ({ success: false, message, rows: [] });

        if (!spreadsheetId || !String(spreadsheetId).trim()) {
            return fail('ID da planilha inválido ou não informado.');
        }

        const rawInput = String(spreadsheetId).trim();
        const cleanSpreadsheetId = this.extractSpreadsheetId(rawInput);
        const cleanSheetName = sheetName ? String(sheetName).trim() : '';
        const gid = this.extractSheetGid(rawInput);

        try {
            // Planilha do Google Sheets exportada como CSV (somente leitura, nunca altera o arquivo original)
            let url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cleanSpreadsheetId)}/gviz/tq?tqx=out:csv`;
            if (cleanSheetName) {
                url += `&sheet=${encodeURIComponent(cleanSheetName)}`;
            } else if (gid) {
                url += `&gid=${encodeURIComponent(gid)}`;
            }

            let response;
            try {
                response = await fetch(url);
            } catch (networkError) {
                return fail('Não foi possível conectar à planilha. Verifique sua conexão com a internet e tente novamente.');
            }

            if (!response.ok) {
                if (response.status === 404) {
                    return fail('Planilha não encontrada. Verifique se o ID da planilha está correto e se ela está compartilhada (qualquer pessoa com o link pode visualizar).');
                }
                if (response.status === 400) {
                    return fail(cleanSheetName
                        ? `A aba "${cleanSheetName}" não foi encontrada nesta planilha. Verifique o nome da aba.`
                        : 'Não foi possível localizar a aba da planilha. Informe o nome da aba ou cole a URL completa (com "gid=" no final).');
                }
                return fail(`Não foi possível acessar a planilha (erro ${response.status}).`);
            }

            const csvText = await response.text();
            const rawRows = this.parseCSV(csvText);

            if (rawRows.length === 0) {
                return fail(cleanSheetName
                    ? `A planilha (aba "${cleanSheetName}") está vazia. Não há dados para importar.`
                    : 'A planilha está vazia. Não há dados para importar.');
            }

            return { success: true, message: 'Importação concluída.', rows: rawRows };
        } catch (error) {
            return fail(`Erro inesperado ao importar a planilha: ${error.message}`);
        }
    },

    async importStockBase(spreadsheetId, sheetName) {
        const result = await this._fetchSheetRows(spreadsheetId, sheetName);

        if (!result.success) {
            console.error(`DataService: ${result.message}`);
            return { success: false, message: result.message, count: 0, products: [] };
        }

        const products = result.rows.map(row => this.mapStockBaseRow(row));

        // Armazena em memória de forma isolada (não interfere no fluxo de cruzamento/merge já existente)
        this.stockBase = products;

        console.log(result.message);
        console.log(`${products.length.toLocaleString('pt-BR')} produtos carregados.`);

        return { success: true, message: result.message, count: products.length, products };
    },

    /**
     * Mapeia uma linha crua da planilha de Catálogo para o shape usado por
     * Storage.saveProductCatalog (aceita variações PT/EN de cabeçalho).
     */
    mapCatalogRow(row) {
        return {
            SKU: this.normalizeValue(row['SKU'] || row['Codigo'] || row['Código'] || ''),
            EAN: this.normalizeValue(row['EAN'] || ''),
            Produto: this.normalizeValue(row['Produto'] || row['Description'] || row['Descrição'] || row['Descricao'] || ''),
            Brand: this.normalizeValue(row['Brand'] || row['Marca'] || ''),
            Group: this.normalizeValue(row['Group'] || row['Grupo'] || ''),
            Subgroup: this.normalizeValue(row['Subgroup'] || row['Subgrupo'] || ''),
            Store: this.normalizeValue(row['Store'] || row['Loja'] || '')
        };
    },

    async importProductCatalogFromSheet(spreadsheetId, sheetName) {
        const result = await this._fetchSheetRows(spreadsheetId, sheetName);

        if (!result.success) {
            console.error(`DataService: ${result.message}`);
            return { success: false, message: result.message, count: 0, products: [] };
        }

        const products = result.rows.map(row => this.mapCatalogRow(row));
        return { success: true, message: result.message, count: products.length, products };
    },

    /**
     * Mapeia uma linha crua da planilha de Quantidades para o shape usado por
     * Storage.saveInventoryQuantities.
     */
    mapQuantityRow(row) {
        return {
            ean: this.normalizeValue(row['EAN'] || ''),
            sku: this.normalizeValue(row['SKU'] || ''),
            expectedQuantity: this.normalizeStock(row['ExpectedQuantity'] || row['Expected Quantity'] || row['Quantidade Esperada'] || row['Quantidade'] || 0)
        };
    },

    async importInventoryQuantitiesFromSheet(spreadsheetId, sheetName) {
        const result = await this._fetchSheetRows(spreadsheetId, sheetName);

        if (!result.success) {
            console.error(`DataService: ${result.message}`);
            return { success: false, message: result.message, count: 0, quantities: [] };
        }

        const quantities = result.rows
            .map(row => this.mapQuantityRow(row))
            .filter(q => q.ean || q.sku);

        return { success: true, message: result.message, count: quantities.length, quantities };
    },

    /**
     * Retorna os produtos da Base de Estoque carregados em memória.
     * @returns {Array}
     */
    getStockBase() {
        return this.stockBase || [];
    },

    mergeDatabases() {
        const barcodeMap = new Map();

        this.barcodeDatabase.forEach(barcodeItem => {
            const code = this.getProductCode(barcodeItem);
            if (code) {
                barcodeMap.set(code, barcodeItem);
            }
        });

        const merged = [];
        const processedCodes = new Set();

        this.inventory.forEach(inventoryItem => {
            const code = this.getProductCode(inventoryItem);

            if (!code) {
                console.warn('DataService: Produto sem código na planilha de inventário ignorado:', inventoryItem);
                return;
            }

            if (processedCodes.has(code)) {
                return;
            }
            processedCodes.add(code);

            const barcodeItem = barcodeMap.get(code);
            merged.push(this.createProductModel(inventoryItem, barcodeItem));
        });

        this.mergedProducts = merged;
        this.isLoaded = true;

        console.log(`DataService: ${merged.length} produtos mesclados com sucesso`);
        return merged;
    },

    async initialize(inventoryUrl, barcodeUrl) {
        if (inventoryUrl) this.saveInventoryUrl(inventoryUrl);
        if (barcodeUrl) this.saveBarcodeUrl(barcodeUrl);

        await this.loadInventory();
        await this.loadBarcodeDatabase();
        this.mergeDatabases();

        return this.mergedProducts;
    },

    getProducts() {
        return this.mergedProducts;
    },

    getInventory() {
        return this.inventoryCache || this.inventory || [];
    },

    findByCode(code) {
        const normalizedCode = this.normalizeValue(code).toLowerCase();

        return this.mergedProducts.find(product => {
            const productCode = String(product.code || '').toLowerCase();
            return productCode === normalizedCode;
        }) || null;
    },

    findByBarcode(barcode) {
        const normalizedBarcode = this.normalizeValue(barcode).toLowerCase();

        return this.mergedProducts.find(product => {
            const unitBarcode = String(product.unitBarcode || '').toLowerCase();
            const boxBarcode = String(product.boxBarcode || '').toLowerCase();
            return unitBarcode === normalizedBarcode || boxBarcode === normalizedBarcode;
        }) || null;
    },

    findByDescription(description) {
        const normalizedDesc = this.normalizeValue(description).toLowerCase();

        return this.mergedProducts.find(product => {
            const productDesc = String(product.description || '').toLowerCase();
            return productDesc.includes(normalizedDesc);
        }) || null;
    },

    findByGroup(group) {
        const normalizedGroup = this.normalizeValue(group).toLowerCase();

        return this.mergedProducts.filter(product => {
            const productGroup = String(product.group || '').toLowerCase();
            return productGroup.includes(normalizedGroup);
        });
    },

    findBySubgroup(subgroup) {
        const normalizedSubgroup = this.normalizeValue(subgroup).toLowerCase();

        return this.mergedProducts.filter(product => {
            const productSubgroup = String(product.subgroup || '').toLowerCase();
            return productSubgroup.includes(normalizedSubgroup);
        });
    },

    findByBrand(brand) {
        const normalizedBrand = this.normalizeValue(brand).toLowerCase();

        return this.mergedProducts.filter(product => {
            const productBrand = String(product.brand || '').toLowerCase();
            return productBrand.includes(normalizedBrand);
        });
    },

    updateProductRuntime(productCode, updates) {
        const product = this.findByCode(productCode);
        if (product) {
            Object.assign(product, updates);
        }
        return product;
    },

    incrementCount(productCode) {
        const product = this.findByCode(productCode);
        if (product) {
            product.countedQuantity++;
            product.difference = product.countedQuantity - product.currentStock;
            product.status = product.difference === 0 ? 'OK' : product.difference > 0 ? 'EXCESS' : 'SHORTAGE';
        }
        return product;
    },

    resetRuntimeData() {
        this.mergedProducts.forEach(product => {
            product.countedQuantity = 0;
            product.difference = 0;
            product.status = 'OK';
        });
    },

    clearCache() {
        this.inventory = [];
        this.barcodeDatabase = [];
        this.mergedProducts = [];
        this.inventoryCache = null;
        this.barcodeCache = null;
        this.isLoaded = false;
        localStorage.removeItem(this.KEYS.INVENTORY_URL);
        localStorage.removeItem(this.KEYS.BARCODE_URL);
    }
};

window.DataService = DataService;