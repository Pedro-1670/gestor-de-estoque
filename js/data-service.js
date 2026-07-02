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

    // ========================================================================
    // MOTOR DE DETECÇÃO DE CABEÇALHO (usado por TODOS os importadores: Excel
    // e Google Sheets, catálogo, quantidades e base de estoque). Em vez de
    // comparar o cabeçalho contra uma lista fixa de frases exatas, cada
    // coluna é dividida em palavras normalizadas e classificada por PALAVRAS-
    // CHAVE que aparecem nela. Isso reconhece variações que uma lista de
    // apelidos nunca cobriria (ex: "Cadastro", "Qtd.Mult"), sem depender da
    // posição da coluna nem de um cabeçalho exato pré-cadastrado.
    // ========================================================================

    FIELD_TOKENS: {
        barcode: ['ean', 'gtin', 'barras', 'barcode', 'codbarras'],
        unitQualifier: ['und', 'un', 'unidade', 'unitario', 'unitaria', 'unit'],
        boxQualifier: ['caixa', 'cx', 'box', 'fardo', 'pacote', 'embalagem'],
        productCode: ['codigo', 'cod', 'code', 'sku', 'cadastro', 'referencia', 'ref', 'id'],
        productName: ['descricao', 'desc', 'produto', 'product', 'nome', 'name', 'description'],
        quantity: ['qtd', 'qde', 'quantidade', 'quantity', 'estoque', 'saldo', 'mult', 'multiplicador', 'stock', 'qty'],
        location: ['localizacao', 'local', 'endereco', 'rua', 'posicao', 'location', 'address', 'deposito'],
        brand: ['marca', 'brand'],
        group: ['grupo', 'group', 'categoria', 'category'],
        subgroup: ['subgrupo', 'subgroup'],
        store: ['loja', 'store', 'filial']
    },

    /**
     * Quebra um cabeçalho em palavras normalizadas (sem acento, minúsculas,
     * separadas por qualquer caractere não alfanumérico). Comparar por
     * PALAVRA inteira evita falso-positivo de substring (ex: "id" não bate
     * dentro de "unidade" porque são comparadas como tokens completos, não
     * como texto colado).
     */
    normalizeHeaderWords(header) {
        return String(header || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .split(/[^a-z0-9]+/)
            .filter(Boolean);
    },

    normalizeHeaderKey(header) {
        return this.normalizeHeaderWords(header).join('');
    },

    /**
     * Classifica um único cabeçalho de coluna no campo interno
     * correspondente ('productCode', 'productName', 'unitBarcode',
     * 'boxBarcode', 'barcode' genérico, 'quantity', 'location', 'brand',
     * 'group', 'subgroup', 'store') ou null se não reconhecer nada.
     */
    classifyHeader(header) {
        const words = this.normalizeHeaderWords(header);
        if (words.length === 0) return null;

        const has = (tokens) => tokens.some(token => words.includes(token));

        const isBarcode = has(this.FIELD_TOKENS.barcode);
        const isUnitQualified = has(this.FIELD_TOKENS.unitQualifier);
        const isBoxQualified = has(this.FIELD_TOKENS.boxQualifier);

        // Um código de barras só é "de unidade" ou "de caixa" quando o
        // cabeçalho combina a palavra de código de barras com o
        // qualificador (ex: "Cód. de Barras UND" / "Cód. de Barras Caixa").
        if (isBarcode && isBoxQualified) return 'boxBarcode';
        if (isBarcode && isUnitQualified) return 'unitBarcode';
        if (isBarcode) return 'barcode';

        if (has(this.FIELD_TOKENS.quantity)) return 'quantity';
        if (has(this.FIELD_TOKENS.location)) return 'location';
        if (has(this.FIELD_TOKENS.subgroup)) return 'subgroup';
        if (has(this.FIELD_TOKENS.group)) return 'group';
        if (has(this.FIELD_TOKENS.brand)) return 'brand';
        if (has(this.FIELD_TOKENS.store)) return 'store';
        if (has(this.FIELD_TOKENS.productCode)) return 'productCode';
        if (has(this.FIELD_TOKENS.productName)) return 'productName';

        return null;
    },

    /**
     * Inspeciona o cabeçalho (chaves de uma linha) UMA VEZ e devolve o mapa
     * campo-interno -> nome-da-coluna-original. Detecta a estrutura da
     * planilha automaticamente; não depende da ordem das colunas.
     */
    detectHeaderMap(row) {
        const map = {};
        if (!row) return map;

        Object.keys(row).forEach(key => {
            const field = this.classifyHeader(key);
            if (field && map[field] === undefined) {
                map[field] = key;
            }
        });

        return map;
    },

    rowHasProductCode(row) {
        const map = this.detectHeaderMap(row);
        return Boolean(map.productCode || map.unitBarcode || map.boxBarcode || map.barcode);
    },

    /**
     * Converte uma linha crua (Excel ou Google Sheets) no modelo padrão de
     * produto, usando o mapa de cabeçalho já detectado. Se nenhuma coluna de
     * código/código de barras for encontrada, gera um código sequencial só
     * para o produto não ficar de fora da importação (não vai casar com
     * nenhum código de barras real).
     */
    buildStandardProduct(row, headerMap, index = 0) {
        const get = (field) => {
            const key = headerMap[field];
            return key !== undefined ? this.normalizeValue(row[key]) : '';
        };

        const productCode = get('productCode');
        const unitBarcode = get('unitBarcode');
        const boxBarcode = get('boxBarcode');
        const genericBarcode = get('barcode');

        const hasAnyCode = productCode || unitBarcode || boxBarcode || genericBarcode;
        const generatedCode = hasAnyCode ? '' : `AUTO-${index + 1}`;

        return {
            productCode: productCode || generatedCode,
            description: get('productName'),
            quantity: this.normalizeStock(get('quantity')),
            unitBarcode,
            boxBarcode,
            ean: genericBarcode,
            location: get('location'),
            brand: get('brand'),
            group: get('group'),
            subgroup: get('subgroup'),
            store: get('store')
        };
    },

    /**
     * Adapta o modelo padrão de produto para o shape que o restante da
     * aplicação (Storage, telas do Operador/Supervisor, relatórios) já
     * espera - assim só o motor de importação muda, nada mais precisa ser
     * alterado.
     */
    toStorageProduct(standard) {
        return {
            SKU: standard.productCode,
            EAN: standard.ean,
            Codigo: standard.productCode,
            Código: standard.productCode,
            Produto: standard.description,
            Nome: standard.description,
            BarcodeUnd: standard.unitBarcode,
            BarcodeBox: standard.boxBarcode,
            Brand: standard.brand,
            Group: standard.group,
            Subgroup: standard.subgroup,
            Localizacao: standard.location,
            Localização: standard.location,
            Store: standard.store,
            Estoque: standard.quantity,
            Stock: standard.quantity
        };
    },

    /**
     * Ponto de entrada único usado por TODOS os importadores (Excel e Google
     * Sheets, catálogo e base de estoque). Detecta a estrutura da planilha
     * pelo NOME das colunas (nunca pela posição) e devolve o produto já no
     * shape usado pelo Storage.
     */
    mapProductRow(row, index = 0, headerMap = null) {
        const map = headerMap || this.detectHeaderMap(row);
        const standard = this.buildStandardProduct(row, map, index);
        return this.toStorageProduct(standard);
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
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const rawRows = lines.map(line => this.parseCSVLine(line));
        const headerRowIndex = this.detectHeaderRowIndex(rawRows);
        const headers = rawRows[headerRowIndex];

        const rows = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const values = rawRows[i];
            const row = {};

            headers.forEach((header, idx) => {
                const key = String(header || '').trim();
                if (!key) return;
                row[key] = values[idx] !== undefined ? values[idx] : '';
            });

            if (Object.values(row).some(v => v && String(v).trim())) {
                rows.push(row);
            }
        }

        return rows;
    },

    /**
     * Encontra, dentro das primeiras linhas de uma planilha (cada linha já
     * como array de células), qual delas é de fato a linha de cabeçalho.
     * Algumas planilhas têm um título/banner acima do cabeçalho de verdade
     * (ex: uma célula mesclada "PLANILHA DE CONTAGEM" na linha 1) - por isso
     * não dá pra simplesmente assumir que a primeira linha é o cabeçalho.
     * Escolhe a linha, entre as 10 primeiras, cujas células mais reconhecem
     * um campo conhecido (classifyHeader).
     * @param {Array<Array<string>>} rawRows
     * @returns {number} índice da linha de cabeçalho (0 se nada for reconhecido)
     */
    detectHeaderRowIndex(rawRows) {
        const candidateLimit = Math.min(rawRows.length, 20);
        let bestIndex = 0;
        let bestScore = 0;
        let bestRatio = 0;

        for (let i = 0; i < candidateLimit; i++) {
            const cells = (rawRows[i] || []).filter(cell => String(cell || '').trim() !== '');
            if (cells.length === 0) continue;

            const matched = cells.filter(cell => this.classifyHeader(cell) !== null).length;
            // Exige pelo menos 2 campos reconhecidos na linha - evita que uma
            // linha de DADO que por acaso contenha uma palavra parecida (ex:
            // uma descrição de produto com a palavra "estoque") seja confundida
            // com o cabeçalho de verdade.
            if (matched < 2) continue;

            const ratio = matched / cells.length;

            if (matched > bestScore || (matched === bestScore && ratio > bestRatio)) {
                bestScore = matched;
                bestRatio = ratio;
                bestIndex = i;
            }
        }

        return bestIndex;
    },

    /**
     * Descreve, em texto legível, o mapa de cabeçalho detectado - usado
     * para mostrar ao usuário exatamente quais colunas foram reconhecidas
     * (e quais não), em vez de deixar a importação como uma caixa-preta.
     */
    describeHeaderMap(headerMap) {
        const labels = {
            productCode: 'Código do Produto',
            productName: 'Descrição',
            quantity: 'Quantidade',
            unitBarcode: 'Cód. de Barras (Unidade)',
            boxBarcode: 'Cód. de Barras (Caixa)',
            barcode: 'Cód. de Barras',
            location: 'Localização',
            brand: 'Marca',
            group: 'Grupo',
            subgroup: 'Subgrupo',
            store: 'Loja'
        };

        const parts = Object.entries(headerMap || {}).map(([field, column]) => `"${column}"→${labels[field] || field}`);
        return parts.length > 0 ? parts.join(', ') : 'nenhuma coluna reconhecida';
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
     * (chave = cabeçalho da planilha). Reaproveitado por
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

    async importProductCatalogFromSheet(spreadsheetId, sheetName) {
        const result = await this._fetchSheetRows(spreadsheetId, sheetName);

        if (!result.success) {
            console.error(`DataService: ${result.message}`);
            return { success: false, message: result.message, count: 0, products: [] };
        }

        const headerMap = this.detectHeaderMap(result.rows[0]);
        const products = result.rows.map((row, index) => this.mapProductRow(row, index, headerMap));
        const autoGeneratedCount = products.filter(p => String(p.SKU).startsWith('AUTO-')).length;

        return {
            success: true,
            message: result.message,
            count: products.length,
            products,
            headerMap,
            columnsDetected: this.describeHeaderMap(headerMap),
            autoGeneratedCount
        };
    },

    /**
     * Mapeia uma linha crua da planilha de Quantidades para o shape usado por
     * Storage.saveInventoryQuantities, usando o mesmo motor de detecção de
     * cabeçalho por palavra-chave do catálogo (nunca por posição).
     */
    mapQuantityRow(row, headerMap = null) {
        const map = headerMap || this.detectHeaderMap(row);
        const get = (field) => {
            const key = map[field];
            return key !== undefined ? this.normalizeValue(row[key]) : '';
        };

        return {
            ean: get('barcode') || get('unitBarcode') || get('boxBarcode'),
            sku: get('productCode'),
            expectedQuantity: this.normalizeStock(get('quantity'))
        };
    },

    async importInventoryQuantitiesFromSheet(spreadsheetId, sheetName) {
        const result = await this._fetchSheetRows(spreadsheetId, sheetName);

        if (!result.success) {
            console.error(`DataService: ${result.message}`);
            return { success: false, message: result.message, count: 0, quantities: [] };
        }

        const headerMap = this.detectHeaderMap(result.rows[0]);
        const quantities = result.rows
            .map(row => this.mapQuantityRow(row, headerMap))
            .filter(q => q.ean || q.sku);

        return { success: true, message: result.message, count: quantities.length, quantities };
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