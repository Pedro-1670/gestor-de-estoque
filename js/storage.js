/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * storage.js - Gerenciamento de Dados em LocalStorage
 */

const Storage = {
    KEYS: {
        PRODUCTS: 'inventory_products',
        PRODUCT_CATALOG: 'inventory_product_catalog',
        INVENTORY_QUANTITIES: 'inventory_quantities',
        SCANS: 'inventory_scans',
        SESSIONS: 'inventory_sessions',
        CURRENT_SESSION: 'current_session',
        COLLABORATORS: 'inventory_collaborators',
        MOVEMENTS: 'inventory_movements',
        AUTH_SESSION: 'inventory_auth_session',
        OPERATOR_SESSION: 'inventory_operator_session',
        SETTINGS: 'inventory_settings',
        XML_INVOICES: 'inventory_xml_invoices',
        MANUAL_INVOICES: 'inventory_manual_invoices',
        GOOGLE_SHEETS_CONFIG: 'inventory_gsheets_config',
        NFC_CONFIRMATIONS: 'inventory_nfc_confirmations'
    },

    USERS: {
        admin: {
            username: 'admin',
            password: '123456',
            role: 'supervisor',
            name: 'Admin'
        }
    },

    DEFAULT_CONTEXT: {
        company: 'Empresa Matriz',
        branch: 'Filial 01',
        unit: 'Unidade Principal'
    },

    productCodeCache: new Map(),
    productListCache: null,
    catalogCache: null,

    init() {
        if (!this.getProducts()) {
            this.saveProducts([]);
        }
        if (!this.getScans()) {
            this.saveScans([]);
        }
        if (!this.getCollaborators()) {
            localStorage.setItem(this.KEYS.COLLABORATORS, JSON.stringify([]));
        }
        if (!this.getMovements()) {
            this.saveMovements([]);
        }
        if (!this.getSessions()) {
            this.saveSessions([]);
        }
        if (!this.getSettings()) {
            this.saveSettings({ ...this.DEFAULT_CONTEXT });
        }
        if (!this.getXMLInvoices()) {
            this.saveXMLInvoice({ id: 'init', items: [], nfInfo: {} });
            localStorage.setItem(this.KEYS.XML_INVOICES, JSON.stringify([]));
        }
        if (!this.getManualInvoices()) {
            localStorage.setItem(this.KEYS.MANUAL_INVOICES, JSON.stringify([]));
        }
        if (!this.getInventoryQuantities()) {
            localStorage.setItem(this.KEYS.INVENTORY_QUANTITIES, JSON.stringify([]));
        }
        if (!this.getNFCconferenceReports()) {
            localStorage.setItem(this.KEYS.NFC_CONFIRMATIONS, JSON.stringify([]));
        }
    },

    validateCredentials(username, password) {
        const normalizedUsername = String(username || '').trim().toLowerCase();
        const user = this.USERS[normalizedUsername];

        if (!user || user.password !== String(password || '')) {
            return null;
        }

        return {
            username: user.username,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString()
        };
    },

    saveAuthSession(authSession) {
        localStorage.setItem(this.KEYS.AUTH_SESSION, JSON.stringify(authSession));
    },

    getAuthSession() {
        const data = localStorage.getItem(this.KEYS.AUTH_SESSION);

        if (!data) {
            return null;
        }

        try {
            const parsed = JSON.parse(data);
            const user = this.USERS[parsed?.username];

            if (!user || parsed.role !== user.role) {
                this.clearAuthSession();
                return null;
            }

            return {
                username: user.username,
                name: user.name,
                role: user.role,
                loginAt: parsed.loginAt || new Date().toISOString()
            };
        } catch (error) {
            this.clearAuthSession();
            return null;
        }
    },

    clearAuthSession() {
        localStorage.removeItem(this.KEYS.AUTH_SESSION);
    },

    saveOperatorSession(operatorSession) {
        localStorage.setItem(this.KEYS.OPERATOR_SESSION, JSON.stringify(operatorSession));
    },

    getOperatorSession() {
        const data = localStorage.getItem(this.KEYS.OPERATOR_SESSION);

        if (!data) {
            return null;
        }

        try {
            const parsed = JSON.parse(data);
            if (!parsed?.name) {
                this.clearOperatorSession();
                return null;
            }

            return {
                name: this.normalizeCode(parsed.name),
                role: parsed.role || 'operator',
                date: parsed.date || new Date().toLocaleDateString('pt-BR'),
                time: parsed.time || new Date().toLocaleTimeString('pt-BR'),
                startedAt: parsed.startedAt || parsed.startTime || new Date().toISOString()
            };
        } catch (error) {
            this.clearOperatorSession();
            return null;
        }
    },

    clearOperatorSession() {
        localStorage.removeItem(this.KEYS.OPERATOR_SESSION);
    },

    getProducts() {
        const data = localStorage.getItem(this.KEYS.PRODUCTS);

        if (!data) {
            return [];
        }

        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed.map(product => this.normalizeProduct(product)) : [];
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            return [];
        }
    },

    getProductsCached() {
        if (this.productListCache === null) {
            this.buildProductCache();
        }

        return this.productListCache || [];
    },

    getProductCatalogCached() {
        if (this.catalogCache === null) {
            this.buildCatalogCache();
        }
        return this.catalogCache || [];
    },

    buildCatalogCache() {
        const catalog = this.getProductCatalog();
        const codeMap = new Map();

        catalog.forEach(product => {
            this.getProductCodeFields(product).forEach(code => {
                codeMap.set(this.normalizeCacheKey(code), product);
            });
        });

        this.catalogCache = catalog;
        return catalog;
    },

    saveProducts(products) {
        const normalizedProducts = Array.isArray(products) ? products.map(product => this.normalizeProduct(product)).filter(Boolean) : [];
        localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(normalizedProducts));
        this.invalidateProductCache();
        return normalizedProducts;
    },

    addProduct(product) {
        const products = this.getProductsCached();
        const normalizedProduct = this.normalizeProduct(product);

        if (!normalizedProduct) {
            return products;
        }

        const exists = products.some(existingProduct => this.productSharesCode(existingProduct, normalizedProduct));

        if (!exists) {
            products.push(normalizedProduct);
            this.saveProducts(products);
        } else {
            this.saveProducts(products);
        }

        return products;
    },

    updateProduct(product) {
        const products = this.getProductsCached();
        const normalizedProduct = this.normalizeProduct(product);

        if (!normalizedProduct) {
            return products;
        }

        const index = products.findIndex(existingProduct => this.productSharesCode(existingProduct, normalizedProduct));

        if (index >= 0) {
            products[index] = {
                ...products[index],
                ...normalizedProduct
            };
            this.saveProducts(products);
        } else {
            products.push(normalizedProduct);
            this.saveProducts(products);
        }

        return products;
    },

    invalidateProductCache() {
        this.productCodeCache = new Map();
        this.productListCache = null;
        this.catalogCache = null;
    },

    buildProductCache() {
        const products = this.getProducts();
        const codeMap = new Map();

        products.forEach(product => {
            this.getProductCodeFields(product).forEach(code => {
                codeMap.set(this.normalizeCacheKey(code), product);
            });
        });

        this.productCodeCache = codeMap;
        this.productListCache = products;
        return products;
    },

    getProduct(codigo) {
        const code = this.normalizeCacheKey(codigo);

        if (!code) {
            return undefined;
        }

        if (this.productCodeCache.size === 0 && this.productListCache === null) {
            this.buildProductCache();
        }

        const cachedProduct = this.productCodeCache.get(code);

        if (cachedProduct) {
            return cachedProduct;
        }

        return this.getProducts().find(product => this.productMatchesCode(product, codigo));
    },

    normalizeCacheKey(value) {
        return this.normalizeCode(value).toLowerCase();
    },

    productMatchesCode(product, codigo) {
        const code = this.normalizeCacheKey(codigo);
        return this.getProductCodeFields(product).some(productCode => this.normalizeCacheKey(productCode) === code);
    },

    normalizeCode(value) {
        return value === undefined || value === null ? '' : String(value).trim();
    },

    normalizeProduct(product = {}) {
        const source = product || {};
        const normalized = { ...source };
        const codeKeys = ['EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código', 'CodigoProduto', 'cProd'];
        const textKeys = ['Produto', 'Nome', 'Categoria', 'Category', 'Localizacao', 'Localização', 'Local', 'Location', 'ClasseABC', 'ABC', 'ClassificacaoABC', 'ClassificaçãoABC'];
        const minStockKeys = ['EstoqueMinimo', 'EstoqueMínimo', 'EstoqueMin', 'Minimo', 'Mínimo', 'StockMin'];

        codeKeys.forEach(key => {
            if (normalized[key] !== undefined && normalized[key] !== null) {
                normalized[key] = this.normalizeCode(normalized[key]);
            }
        });

        textKeys.forEach(key => {
            if (normalized[key] !== undefined && normalized[key] !== null) {
                normalized[key] = this.normalizeCode(normalized[key]);
            }
        });

        const stock = this.normalizeStock(normalized.Estoque ?? normalized.Stock);
        const minStock = this.normalizeStock(normalized.EstoqueMinimo ?? normalized.EstoqueMínimo ?? normalized.EstMin ?? normalized.StockMin);
        const abc = this.getField(normalized, 'ClasseABC', 'ABC', 'ClassificacaoABC', 'ClassificaçãoABC') || 'Não informada';

        normalized.Estoque = stock;
        normalized.Stock = stock;
        normalized.EstoqueMinimo = minStock;
        normalized.EstoqueMínimo = minStock;
        normalized.EstoqueMin = minStock;
        normalized.StockMin = minStock;
        normalized.ClasseABC = abc;
        normalized.ABC = abc;
        normalized.ClassificacaoABC = abc;
        normalized.ClassificaçãoABC = abc;

        const codigoProduto = this.getField(normalized, 'CodigoProduto', 'cProd');
        if (codigoProduto) {
            normalized.CodigoProduto = codigoProduto;
            normalized.cProd = codigoProduto;
        }

        return normalized;
    },

    normalizeStock(value) {
        if (value === undefined || value === null || value === '') {
            return 0;
        }

        let normalized = String(value)
            .trim()
            .replace(/\s+/g, '');
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

    getField(object, ...keys) {
        if (!object) {
            return '';
        }

        for (const key of keys) {
            if (object[key] !== undefined && object[key] !== null && String(object[key]).trim() !== '') {
                return String(object[key]).trim();
            }
        }

        return '';
    },

    getProductDisplayName(product) {
        return this.getField(product, 'Produto', 'Nome', 'description') || 'Produto sem nome';
    },

    getProductCategory(product) {
        return this.getField(product, 'Categoria', 'Category') || 'Não informada';
    },

    getProductPrimaryCode(product) {
        return this.getField(product, 'EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código', 'CodigoProduto', 'cProd');
    },

    getProductStock(product) {
        const stock = product?.Estoque ?? product?.Stock;

        if (stock === undefined || stock === null || stock === '') {
            return '0';
        }

        return String(stock).trim();
    },

    getProductMinStock(product) {
        const stock = product?.EstoqueMinimo ?? product?.EstoqueMínimo ?? product?.EstoqueMin ?? product?.Minimo ?? product?.Mínimo ?? product?.StockMin;

        if (stock === undefined || stock === null || stock === '') {
            return '0';
        }

        return String(stock).trim();
    },

    getProductABC(product) {
        return this.getField(product, 'ClasseABC', 'ABC', 'ClassificacaoABC', 'ClassificaçãoABC') || 'Não informada';
    },

    getProductLocation(product) {
        return this.getField(product, 'Localizacao', 'Localização', 'Local', 'Location') || 'Não informada';
    },

    getProductCodeFields(product) {
        return ['EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código', 'CodigoProduto', 'cProd']
            .map(key => this.normalizeCode(product?.[key]))
            .filter(Boolean);
    },

    getProductSearchText(product) {
        return [
            this.getProductDisplayName(product),
            this.normalizeCode(product?.SKU),
            this.normalizeCode(product?.EAN),
            this.normalizeCode(product?.Barcode),
            this.normalizeCode(product?.Codigo),
            this.normalizeCode(product?.Código),
            this.normalizeCode(product?.CodigoProduto),
            this.getProductCategory(product),
            this.getProductLocation(product)
        ].join(' ').toLowerCase();
    },

    productSharesCode(firstProduct, secondProduct) {
        const firstCodes = new Set(this.getProductCodeFields(firstProduct));
        const secondCodes = new Set(this.getProductCodeFields(secondProduct));

        return [...secondCodes].some(code => firstCodes.has(code));
    },

    getScanPrimaryCode(scan = {}) {
        return this.getField(scan, 'ean', 'sku', 'barcode', 'code', 'codigo', 'CodigoProduto', 'QRCode', 'Codigo', 'Código');
    },

    getScans() {
        const data = localStorage.getItem(this.KEYS.SCANS);
        return data ? JSON.parse(data) : null;
    },

    saveScans(scans) {
        localStorage.setItem(this.KEYS.SCANS, JSON.stringify(Array.isArray(scans) ? scans : []));
    },

    addScan(scan) {
        const scans = this.getScans() || [];
        scans.push({
            ...scan,
            timestamp: new Date().toISOString(),
            id: this.generateId()
        });
        this.saveScans(scans);
        return scans;
    },

    removeScan(scanId) {
        const scans = this.getScans() || [];
        const filteredScans = scans.filter(scan => scan.id !== scanId);
        this.saveScans(filteredScans);
        return filteredScans;
    },

    getRecentScans(limit = 5) {
        const scans = this.getScans() || [];
        return [...scans].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
    },

    getMovements() {
        const data = localStorage.getItem(this.KEYS.MOVEMENTS);
        return data ? JSON.parse(data) : [];
    },

    saveMovements(movements) {
        localStorage.setItem(this.KEYS.MOVEMENTS, JSON.stringify(movements));
    },

    addMovement(movement) {
        const movements = this.getMovements();
        movements.push({
            ...movement,
            timestamp: new Date().toISOString(),
            id: this.generateId()
        });
        this.saveMovements(movements);
        return movements;
    },

    getScansByCollaborator(collaborator) {
        const scans = this.getScans() || [];
        return scans.filter(s => s.collaborator === collaborator);
    },

    getScansByLocation(location) {
        const scans = this.getScans() || [];
        return scans.filter(s => s.location === location);
    },

    getScansByDate(date) {
        const scans = this.getScans() || [];
        return scans.filter(s => {
            const scanDate = new Date(s.timestamp).toLocaleDateString();
            return scanDate === date;
        });
    },

    getSessions() {
        const data = localStorage.getItem(this.KEYS.SESSIONS);
        return data ? JSON.parse(data) : null;
    },

    saveSessions(sessions) {
        localStorage.setItem(this.KEYS.SESSIONS, JSON.stringify(sessions));
    },

    createSession(sessionData) {
        const sessions = this.getSessions() || [];
        const settings = this.getSettings();
        const session = {
            id: this.generateId(),
            startTime: new Date().toISOString(),
            endTime: null,
            company: sessionData?.company || settings?.company || this.DEFAULT_CONTEXT.company,
            branch: sessionData?.branch || settings?.branch || this.DEFAULT_CONTEXT.branch,
            unit: sessionData?.unit || settings?.unit || this.DEFAULT_CONTEXT.unit,
            ...sessionData
        };
        sessions.push(session);
        this.saveSessions(sessions);
        localStorage.setItem(this.KEYS.CURRENT_SESSION, JSON.stringify(session));
        return session;
    },

    getCurrentSession() {
        const data = localStorage.getItem(this.KEYS.CURRENT_SESSION);
        return data ? JSON.parse(data) : null;
    },

    endSession(sessionData) {
        const session = this.getCurrentSession();
        if (session) {
            session.endTime = new Date().toISOString();
            session.itemsScanned = sessionData.itemsScanned;
            session.uniqueProducts = sessionData.uniqueProducts;
            session.scans = sessionData.scans;
            session.company = sessionData.company || session.company;
            session.branch = sessionData.branch || session.branch;
            session.unit = sessionData.unit || session.unit;

            const sessions = this.getSessions() || [];
            const index = sessions.findIndex(s => s.id === session.id);
            if (index !== -1) {
                sessions[index] = session;
                this.saveSessions(sessions);
            }

            localStorage.removeItem(this.KEYS.CURRENT_SESSION);
            return session;
        }
        return null;
    },

    clearCurrentSession() {
        localStorage.removeItem(this.KEYS.CURRENT_SESSION);
    },

    getCollaborators() {
        const data = localStorage.getItem(this.KEYS.COLLABORATORS);
        return data ? JSON.parse(data) : [];
    },

    addCollaborator(name) {
        const collaborators = this.getCollaborators();
        const normalizedName = this.normalizeCode(name);

        if (normalizedName && !collaborators.includes(normalizedName)) {
            collaborators.push(normalizedName);
            localStorage.setItem(this.KEYS.COLLABORATORS, JSON.stringify(collaborators));
        }

        return collaborators;
    },

    removeCollaborator(name) {
        const collaborators = this.getCollaborators().filter(collaborator => collaborator !== name);
        localStorage.setItem(this.KEYS.COLLABORATORS, JSON.stringify(collaborators));
        return collaborators;
    },

    getSettings() {
        const data = localStorage.getItem(this.KEYS.SETTINGS);

        if (!data) {
            return null;
        }

        try {
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    },

    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // ========== NF Conference Confirmations ==========
    saveNFCconferenceReport(report) {
        const reports = this.getNFCconferenceReports() || [];
        reports.push({
            id: this.generateId(),
            ...report,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(this.KEYS.NFC_CONFIRMATIONS, JSON.stringify(reports));
        return reports;
    },

    getNFCconferenceReports() {
        const data = localStorage.getItem(this.KEYS.NFC_CONFIRMATIONS);
        return data ? JSON.parse(data) : [];
    },

    // ========== Reconciliation ==========
    getExpectedQuantity(productCode) {
        const quantities = this.getInventoryQuantities();
        const normalizedCode = this.normalizeCacheKey(productCode);
        
        for (const qty of quantities) {
            if (this.normalizeCacheKey(qty.ean) === normalizedCode ||
                this.normalizeCacheKey(qty.sku) === normalizedCode) {
                return qty.expectedQuantity;
            }
        }
        return 0;
    },

    getReconciliationData() {
        const scans = this.getScans() || [];
        const expectedQtys = this.getInventoryQuantities() || [];
        const discrepancies = [];
        
        const scannedCounts = {};
        scans.forEach(scan => {
            const code = this.getScanPrimaryCode(scan);
            if (code) {
                scannedCounts[code] = (scannedCounts[code] || 0) + 1;
            }
        });
        
        expectedQtys.forEach(expected => {
            const code = expected.ean || expected.sku;
            if (!code) return;
            
            const scannedQty = scannedCounts[code] || 0;
            const expectedQty = expected.expectedQuantity;
            const difference = scannedQty - expectedQty;
            
            if (difference !== 0) {
                discrepancies.push({
                    ean: expected.ean,
                    sku: expected.sku,
                    scanned: scannedQty,
                    expected: expectedQty,
                    difference: difference,
                    type: difference > 0 ? 'excess' : 'shortage'
                });
            }
        });
        
        return discrepancies;
    },

    getStatistics() {
        const scans = this.getScans() || [];
        const sessions = this.getSessions() || [];
        const products = this.getProductsCached();
        const movements = this.getMovements() || [];

        const uniqueCollaborators = [...new Set(scans.map(s => this.normalizeCode(s.collaborator)).filter(Boolean))];
        const uniqueProductsScanned = [...new Set(scans.map(s => this.getScanPrimaryCode(s)).filter(Boolean))];

        let avgTimePerScan = 0;
        if (sessions.length > 0) {
            let totalTime = 0;
            sessions.forEach(session => {
                if (session.endTime) {
                    const start = new Date(session.startTime);
                    const end = new Date(session.endTime);
                    totalTime += (end - start) / 1000;
                }
            });
            avgTimePerScan = scans.length > 0 ? Math.round(totalTime / scans.length) : 0;
        }

        const productivityByCollaborator = {};
        uniqueCollaborators.forEach(collaborator => {
            const collaboratorScans = scans.filter(s => this.normalizeCode(s.collaborator) === collaborator);
            const collaboratorProducts = [...new Set(collaboratorScans.map(s => this.getScanPrimaryCode(s)).filter(Boolean))];
            productivityByCollaborator[collaborator] = {
                scans: collaboratorScans.length,
                uniqueProducts: collaboratorProducts.length,
                productivity: collaboratorScans.length / (collaboratorProducts.length || 1)
            };
        });

        return {
            totalScans: scans.length,
            totalProducts: uniqueProductsScanned.length,
            totalCollaborators: uniqueCollaborators.length,
            totalMovements: movements.length,
            avgTimePerScan,
            productivityByCollaborator,
            uniqueCollaborators,
            uniqueProductsScanned,
            scans,
            sessions,
            movements,
            products
        };
    },

    getDiscrepancies() {
        const scans = this.getScans() || [];
        const products = this.getProductsCached();
        const scannedCounts = {};

        scans.forEach(scan => {
            const code = this.getScanPrimaryCode(scan);
            if (!code) {
                return;
            }

            if (!scannedCounts[code]) {
                scannedCounts[code] = 0;
            }
            scannedCounts[code]++;
        });

        return products
            .map(product => {
                const productCode = this.getProductPrimaryCode(product);

                if (!productCode) {
                    return null;
                }

                const systemStock = this.normalizeStock(product.Estoque ?? product.Stock);
                const countedStock = scannedCounts[productCode] || 0;
                const difference = countedStock - systemStock;

                if (difference === 0) {
                    return null;
                }

                return {
                    sku: this.getField(product, 'SKU'),
                    product: this.getProductDisplayName(product),
                    systemStock,
                    countedStock,
                    difference,
                    type: difference > 0 ? 'excess' : 'shortage',
                    ean: productCode
                };
            })
            .filter(Boolean);
    },

    getNotInventoriedProducts() {
        const scans = this.getScans() || [];
        const products = this.getProductsCached();
        const scannedCodes = new Set(scans.map(scan => this.getScanPrimaryCode(scan)).filter(Boolean));

        return products.filter(product => !scannedCodes.has(this.getProductPrimaryCode(product)));
    },

    exportToCSV(data, filename = 'inventario.csv') {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }

        const headers = Object.keys(data[0]);
        const rows = [
            headers.join(','),
            ...data.map(row => headers.map(header => this.escapeCSVValue(row[header])).join(','))
        ];

        return `\ufeff${rows.join('\n')}\n`;
    },

    escapeCSVValue(value) {
        if (value === undefined || value === null) {
            return '';
        }

        const text = String(value);

        if (/[",\n\r]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }

        return text;
    },

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

Storage.init();
