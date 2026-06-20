/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * storage.js - Gerenciamento de Dados em LocalStorage
 *
 * Este módulo gerencia toda a persistência de dados da aplicação,
 * incluindo produtos, registros de bipagem e dados de sessão.
 */

const Storage = {
    KEYS: {
        PRODUCTS: 'inventory_products',
        SCANS: 'inventory_scans',
        SESSIONS: 'inventory_sessions',
        CURRENT_SESSION: 'current_session',
        COLLABORATORS: 'inventory_collaborators',
        MOVEMENTS: 'inventory_movements',
        AUTH_SESSION: 'inventory_auth_session'
    },

    USERS: {
        admin: {
            username: 'admin',
            password: '123456',
            role: 'supervisor',
            name: 'Supervisor'
        },
        joao: {
            username: 'joao',
            password: '123456',
            role: 'operator',
            name: 'Joao'
        },
        maria: {
            username: 'maria',
            password: '123456',
            role: 'operator',
            name: 'Maria'
        },
        carlos: {
            username: 'carlos',
            password: '123456',
            role: 'operator',
            name: 'Carlos'
        }
    },

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
    },

    validateCredentials(username, password) {
        const user = this.USERS[String(username || '').trim().toLowerCase()];

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

    saveProducts(products) {
        const normalizedProducts = Array.isArray(products) ? products.map(product => this.normalizeProduct(product)) : [];
        localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(normalizedProducts));
        return normalizedProducts;
    },

    addProduct(product) {
        const products = this.getProducts();
        const normalizedProduct = this.normalizeProduct(product);
        const exists = products.some(existingProduct => this.productSharesCode(existingProduct, normalizedProduct));

        if (!exists) {
            products.push(normalizedProduct);
            this.saveProducts(products);
        }

        return products;
    },

    getProduct(codigo) {
        codigo = String(codigo).trim();

        if (!codigo) {
            return undefined;
        }

        const products = this.getProducts() || [];

        return products.find(product =>
            String(product.EAN || '').trim() === codigo ||
            String(product.SKU || '').trim() === codigo ||
            String(product.Barcode || '').trim() === codigo ||
            String(product.QRCode || '').trim() === codigo ||
            String(product.Codigo || '').trim() === codigo ||
            String(product.Código || '').trim() === codigo ||
            String(product.CodigoProduto || '').trim() === codigo
        );
    },

    normalizeCode(value) {
        return value === undefined || value === null ? '' : String(value).trim();
    },

    normalizeProduct(product = {}) {
        const source = product || {};
        const normalized = { ...source };
        const codeKeys = ['EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código', 'CodigoProduto'];
        const textKeys = ['Produto', 'Nome', 'Categoria', 'Category', 'Localizacao', 'Localização', 'Local', 'Location'];

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
        normalized.Estoque = stock;
        normalized.Stock = stock;

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
        return this.getField(product, 'Produto', 'Nome') || 'Produto sem nome';
    },

    getProductCategory(product) {
        return this.getField(product, 'Categoria', 'Category') || 'Não informada';
    },

    getProductPrimaryCode(product) {
        return this.getField(product, 'EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código');
    },

    getProductStock(product) {
        const stock = product?.Estoque ?? product?.Stock;

        if (stock === undefined || stock === null || stock === '') {
            return '0';
        }

        return String(stock).trim();
    },

    getProductMinStock(product) {
        const stock = product?.EstoqueMinimo ?? product?.EstoqueMin ?? product?.EstoqueMínimo ?? product?.Minimo ?? product?.Mínimo ?? product?.StockMin;

        if (stock === undefined || stock === null || stock === '') {
            return '0';
        }

        return String(stock).trim();
    },

    getProductLocation(product) {
        return this.getField(product, 'Localizacao', 'Localização', 'Local', 'Location') || 'Não informada';
    },

    getProductCodeFields(product) {
        return ['EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código', 'CodigoProduto']
            .map(key => this.normalizeCode(product?.[key]))
            .filter(Boolean);
    },

    productSharesCode(firstProduct, secondProduct) {
        const firstCodes = new Set(this.getProductCodeFields(firstProduct));
        const secondCodes = new Set(this.getProductCodeFields(secondProduct));

        return [...secondCodes].some(code => firstCodes.has(code));
    },

    getScanPrimaryCode(scan = {}) {
        return this.getField(scan, 'ean', 'sku', 'barcode', 'code', 'codigo', 'QRCode', 'Codigo');
    },

    getScans() {
        const data = localStorage.getItem(this.KEYS.SCANS);
        return data ? JSON.parse(data) : null;
    },

    saveScans(scans) {
        localStorage.setItem(this.KEYS.SCANS, JSON.stringify(scans));
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
        const session = {
            id: this.generateId(),
            startTime: new Date().toISOString(),
            endTime: null,
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

    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    clear() {
        localStorage.removeItem(this.KEYS.PRODUCTS);
        localStorage.removeItem(this.KEYS.SCANS);
        localStorage.removeItem(this.KEYS.SESSIONS);
        localStorage.removeItem(this.KEYS.CURRENT_SESSION);
        localStorage.removeItem(this.KEYS.COLLABORATORS);
        localStorage.removeItem(this.KEYS.MOVEMENTS);
        localStorage.removeItem(this.KEYS.AUTH_SESSION);
    },

    getStatistics() {
        const scans = this.getScans() || [];
        const sessions = this.getSessions() || [];
        const products = this.getProducts() || [];
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
            scans,
            sessions,
            movements,
            products
        };
    },

    getDiscrepancies() {
        const scans = this.getScans() || [];
        const products = this.getProducts() || [];
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
        const products = this.getProducts() || [];
        const scannedCodes = new Set(scans.map(scan => this.getScanPrimaryCode(scan)).filter(Boolean));

        return products.filter(product => !scannedCodes.has(this.getProductPrimaryCode(product)));
    },

    exportToCSV(data, filename = 'inventario.csv') {
        let csv = '';

        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            csv += headers.join(',') + '\n';

            data.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',')
                        ? `"${value.replace(/"/g, '""')}"`
                        : value;
                });
                csv += values.join(',') + '\n';
            });
        }

        return csv;
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
