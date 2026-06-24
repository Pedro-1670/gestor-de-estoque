/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * utils.js - Funções Utilitárias
 * 
 * Contém funções auxiliares para formatação, validação e manipulação de dados
 */

const Utils = {
    /**
     * FORMATAÇÃO DE TEMPO
     */

    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    formatTimeHHMM(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR');
    },

    getCurrentDateTime() {
        const now = new Date();
        return now.toLocaleString('pt-BR');
    },

    formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('pt-BR');
    },

    /**
     * FORMATAÇÃO DE NÚMEROS
     */

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    formatNumber(value) {
        return new Intl.NumberFormat('pt-BR').format(value);
    },

    /**
     * VALIDAÇÃO
     */

    validateBarcode(barcode) {
        if (!barcode || barcode.trim().length === 0) {
            return false;
        }
        return true;
    },

    validateCollaboratorName(name) {
        if (!name || name.trim().length < 3) {
            return false;
        }
        return true;
    },

    isValidEAN(ean) {
        // Valida EAN-13, EAN-8 ou formatos numéricos
        const cleanEAN = ean.toString().replace(/\D/g, '');
        return cleanEAN.length >= 8;
    },

    /**
     * MANIPULAÇÃO DE STRINGS
     */

    normalizeBarcode(barcode) {
        return barcode.trim().toUpperCase();
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    capitalizeWords(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * COMPARAÇÕES
     */

    compareByField(array, field) {
        return array.sort((a, b) => {
            if (a[field] < b[field]) return -1;
            if (a[field] > b[field]) return 1;
            return 0;
        });
    },

    compareByFieldDesc(array, field) {
        return array.sort((a, b) => {
            if (a[field] > b[field]) return -1;
            if (a[field] < b[field]) return 1;
            return 0;
        });
    },

    /**
     * ARRAYS E OBJETOS
     */

    removeDuplicates(array, field) {
        const seen = new Set();
        return array.filter(item => {
            const value = field ? item[field] : item;
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    },

    groupBy(array, field) {
        return array.reduce((acc, item) => {
            const key = item[field];
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});
    },

    countOccurrences(array, field) {
        return array.reduce((acc, item) => {
            const key = item[field];
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    },

    /**
     * DOM HELPERS
     */

    hide(element) {
        if (element) {
            element.classList.add('hidden');
        }
    },

    show(element) {
        if (element) {
            element.classList.remove('hidden');
        }
    },

    toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    },

    addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    },

    removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    },

    setDisplay(element, display = 'block') {
        if (element) {
            element.style.display = display;
        }
    },

    /**
     * EVENT HELPERS
     */

    onEnter(element, callback) {
        if (element) {
            element.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    callback(e);
                }
            });
        }
    },

    onClick(element, callback) {
        if (element) {
            element.addEventListener('click', callback);
        }
    },

    onChange(element, callback) {
        if (element) {
            element.addEventListener('change', callback);
        }
    },

    /**
     * CÁLCULOS
     */

    calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    },

    calculateAverage(array) {
        if (array.length === 0) return 0;
        const sum = array.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / array.length);
    },

    /**
     * EXCEL / EXPORTAÇÃO
     */

    parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, {
                        raw: false,
                        defval: '',
                        blankrows: false
                    }).map(row => this.normalizeExcelRow(row));

                    rows.forEach(row => {
                        if(row.EAN)
                            row.EAN = String(row.EAN).trim();

                        if(row.SKU)
                            row.SKU = String(row.SKU).trim();

                        if(row.Barcode)
                            row.Barcode = String(row.Barcode).trim();

                        if(row.QRCode)
                            row.QRCode = String(row.QRCode).trim();

                        if(row.Codigo)
                            row.Codigo = String(row.Codigo).trim();

                        if(row.Código)
                            row.Código = String(row.Código).trim();
                    });

                    console.log('Arquivo Excel lido:', file.name, 'Linhas:', rows.length);
                    console.table(rows.slice(0, 50));
                    resolve(rows);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(file);
        });
    },

    parseXMLNFeFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const xml = event.target.result;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xml, 'application/xml');
                    const parserError = xmlDoc.querySelector('parsererror');

                    if (parserError) {
                        reject(new Error('XML inválido ou com estrutura incompatível.'));
                        return;
                    }

                    const items = [...xmlDoc.getElementsByTagName('det')]
                        .map(det => this.normalizeXMLItem(det))
                        .filter(item => item.codigoProduto || item.ean || item.description);

                    const emit = xmlDoc.getElementsByTagName('emit')[0];
                    const ide = xmlDoc.getElementsByTagName('ide')[0];

                    const fornecedor = emit ? this.getNodeValue(emit, 'xNome') : '';
                    const numeroNF = ide ? this.getNodeValue(ide, 'nNF') : '';
                    const serie = ide ? this.getNodeValue(ide, 'serie') : '';
                    const dataEmissao = ide ? this.getNodeValue(ide, 'dhEmi') : '';

                    const nfInfo = {
                        fornecedor: fornecedor || '-',
                        numeroNF: numeroNF || '-',
                        serie: serie || '-',
                        dataEmissao: dataEmissao || '-'
                    };

                    console.log('Arquivo XML lido:', file.name, 'Itens:', items.length);
                    console.table(items.slice(0, 50));
                    resolve({ items, nfInfo });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Erro ao ler arquivo XML'));
            reader.readAsText(file, 'utf-8');
        });
    },

    getNodeValue(parent, tagName) {
        const node = parent.getElementsByTagName(tagName)[0];
        return node ? node.textContent.trim() : '';
    },

    normalizeXMLItem(det) {
        const getValue = (tagName) => {
            const node = det.getElementsByTagName(tagName)[0];
            return node ? node.textContent.trim() : '';
        };

        const codigoProduto = getValue('cProd');
        const ean = getValue('cEAN');
        const description = getValue('xProd');
        const quantity = Number(getValue('qCom') || 0);
        const unitValue = Number(getValue('vUnCom') || 0);
        const totalValue = Number(getValue('vProd') || 0);

        return {
            codigoProduto,
            ean,
            description,
            quantity,
            unitValue,
            totalValue
        };
    },

    normalizeExcelRow(row = {}) {
        const normalized = {};

        Object.entries(row).forEach(([key, value]) => {
            normalized[this.normalizeExcelHeader(key)] = value;
        });

        return normalized;
    },

    normalizeExcelHeader(header) {
        const normalized = String(header)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\s_-]+/g, '');

        const mapping = {
            ean: 'EAN',
            sku: 'SKU',
            barcode: 'Barcode',
            codigodebarras: 'Barcode',
            codigo: 'Codigo',
            qrcode: 'QRCode',
            produto: 'Produto',
            nome: 'Nome',
            estoque: 'Estoque',
            stock: 'Stock',
            categoria: 'Categoria',
            category: 'Category',
            localizacao: 'Localizacao',
            local: 'Localizacao',
            location: 'Location'
        };

        return mapping[normalized] || String(header).trim();
    },

    createExcelFromData(data, filename = 'export.xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
        XLSX.writeFile(workbook, filename);
    },

    /**
     * NOTIFICAÇÕES
     */

    showNotification(message, type = 'info', duration = 3000) {
        // Cria elemento de notificação (implementar conforme necessário)
        console.log(`[${type.toUpperCase()}] ${message}`);
    },

    showError(message) {
        this.showNotification(message, 'error', 4000);
    },

    showSuccess(message) {
        this.showNotification(message, 'success', 3000);
    },

    showWarning(message) {
        this.showNotification(message, 'warning', 3000);
    },

    /**
     * DELAYS
     */

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * CÁLCULO DE PRODUTIVIDADE
     */

    calculateProductivity(scans, timeInSeconds) {
        if (timeInSeconds === 0) return 0;
        return (scans / (timeInSeconds / 60)).toFixed(2); // scans por minuto
    },

    /**
     * TRATAMENTO DE ERROS
     */

    handleError(error, context = '') {
        console.error(`Erro ${context}:`, error);
        return {
            success: false,
            message: error.message || 'Erro desconhecido',
            error: error
        };
    },

    /**
     * FILTROS
     */

    filterByDate(array, dateField, startDate, endDate = null) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : start;

        return array.filter(item => {
            const itemDate = new Date(item[dateField]).getTime();
            return itemDate >= start && itemDate <= end;
        });
    },

    filterByText(array, searchTerm, fields) {
        const term = searchTerm.toLowerCase();
        return array.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    },

    /**
     * GERAÇÃO DE RELATÓRIOS
     */

    generateSummaryReport(sessionData) {
        return {
            collaborator: sessionData.collaborator,
            location: sessionData.location,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            duration: sessionData.duration,
            totalScans: sessionData.itemsScanned,
            uniqueProducts: sessionData.uniqueProducts,
            scans: sessionData.scans
        };
    },

    /**
     * GERAÇÃO DE IDS
     */

    generateID() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * SANITIZAÇÃO
     */

    sanitizeInput(input) {
        if (!input) return '';
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'string') {
                    sanitized[key] = this.sanitizeInput(value);
                } else if (Array.isArray(value)) {
                    sanitized[key] = value.map(item => this.sanitizeObject(item));
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = this.sanitizeObject(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
        return sanitized;
    },

    validateXMLStructure(xml) {
        if (!xml) return false;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const error = doc.querySelector('parsererror');
        return !error;
    },

    validateExcelFile(file) {
        return file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'));
    },

    validateXMLFile(file) {
        return file && file.name.endsWith('.xml');
    },

    validateSession() {
        const authSession = Storage.getAuthSession();
        const operatorSession = Storage.getOperatorSession();
        return authSession || operatorSession;
    },

    checkRolePermission(role, permission) {
        const permissions = {
            supervisor: ['dashboard', 'history', 'divergences', 'not-inventoried', 'import', 'import-xml', 'conference', 'reports', 'config', 'reconciliation', 'manual-invoice', 'product-catalog', 'inventory-quantities', 'gsheets'],
            operator: ['scan', 'history', 'finish']
        };
        const allowed = permissions[role] || [];
        return allowed.includes(permission);
    }
};

// Adicionar suporte a quebra de linhas em CSV
if (!String.prototype.padStart) {
    String.prototype.padStart = function(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || ' ');
        if (this.length > targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}
