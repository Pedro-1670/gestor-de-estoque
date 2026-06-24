/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * app.js - Lógica Principal da Aplicação
 * 
 * Gerencia toda a lógica de funcionamento, desde login até exportações
 */

const App = {
    state: {
        currentUser: null,
        userRole: null,
        currentSession: null,
        currentOperatorName: null,
        currentOperatorDate: null,
        currentOperatorTime: null,
        sessionStartTime: null,
        sessionScans: [],
        sessionTimer: null,
        pendingImport: null,
        pendingXMLImport: null,
        pendingMultipleXMLImports: null,
        bipagemReportRows: [],
        conferenceItems: [],
        conferenceSession: null,
        manualInvoiceItems: []
    },

    permissions: {
        supervisor: ['dashboard', 'history', 'divergences', 'not-inventoried', 'import', 'import-xml', 'conference', 'reports', 'config', 'reconciliation', 'manual-invoice', 'product-catalog', 'inventory-quantities', 'gsheets'],
        operator: ['scan', 'history', 'finish']
    },

    isTabAllowed(tabName) {
        const role = this.state.userRole;
        const allowed = this.permissions[role] || [];
        return tabName === 'operator' || allowed.includes(tabName);
    },

    enforcePermissions() {
        const role = this.state.userRole;
        const allowed = this.permissions[role] || [];

        document.querySelectorAll('[data-permission]').forEach((el) => {
            const permission = el.dataset.permission;
            if (permission === 'operator' || allowed.includes(permission)) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });
    },

    /**
     * INICIALIZAÇÃO
     */

    init() {
        console.log('🚀 Inicializando Sistema de Inventário Inteligente...');
        
        this.setupEventListeners();

        const products = Storage.getProducts() || [];
        console.log("Produtos carregados:", products.length);
        console.table(products);

        if (products.length === 0) {
            Utils.showError("Nenhum produto foi carregado na base.");
        }

        this.restoreAuthSession();
    },

    /**
     * NAVEGAÇÃO E TELAS
     */

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('screen--active');
        });
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('screen--active');
        }
    },

    /**
     * LOGIN
     */

setupEventListeners() {
        // Login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const operatorStartForm = document.getElementById('operator-start-form');
        if (operatorStartForm) {
            operatorStartForm.addEventListener('submit', (e) => this.handleOperatorStart(e));
        }

        document.getElementById('show-admin-login')?.addEventListener('click', () => this.showAdminLoginForm());
        document.getElementById('hide-admin-login')?.addEventListener('click', () => this.showOperatorStartForm());

        // Logout
        document.getElementById('logout-operator')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('logout-supervisor')?.addEventListener('click', () => this.handleLogout());

        // Operador
        document.getElementById('barcode-input')?.addEventListener('keypress', (e) => this.handleBarcodeScan(e));
        document.getElementById('product-search-input')?.addEventListener('input', (e) => this.handleProductSearchInput(e));
        document.getElementById('product-search-input')?.addEventListener('change', (e) => this.handleProductSearchSelect(e));
        document.getElementById('product-search-input')?.addEventListener('keydown', (e) => this.handleProductSearchKeydown(e));
        document.getElementById('clear-history')?.addEventListener('click', () => this.clearHistory());
        document.getElementById('history-filter-input')?.addEventListener('input', (e) => this.updateHistoryTable());
        document.getElementById('finish-inventory')?.addEventListener('click', () => this.finishInventory());

        // Supervisor - Relatórios por Colaborador
        document.getElementById('report-collaborator-filter')?.addEventListener('change', () => this.updateCollaboratorReportSummary());
        document.getElementById('generate-collaborator-report')?.addEventListener('click', () => this.generateCollaboratorReportPDF());

        // Supervisor - Navegação de tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTabSwitch(e));
        });

        // Supervisor - Importação
        document.getElementById('excel-file-input')?.addEventListener('change', (e) => this.handleFileUpload(e, 'catalog'));
        document.getElementById('inventory-qty-file-input')?.addEventListener('change', (e) => this.handleFileUpload(e, 'quantities'));
        document.getElementById('confirm-import')?.addEventListener('click', () => this.confirmImport());
        document.getElementById('cancel-import')?.addEventListener('click', () => this.cancelImport());
        document.getElementById('xml-file-input')?.addEventListener('change', (e) => this.handleXMLFileUpload(e));
        document.getElementById('confirm-xml-import')?.addEventListener('click', () => this.confirmXMLImport());
        document.getElementById('cancel-xml-import')?.addEventListener('click', () => this.cancelXMLImport());

        // Supervisor - Exportação
        document.querySelectorAll('[data-export-current]').forEach(btn => {
            btn.addEventListener('click', () => this.exportToExcel());
        });
        document.querySelectorAll('[data-export-csv]').forEach(btn => {
            btn.addEventListener('click', () => this.exportToCSV());
        });
        document.querySelectorAll('[data-export-pdf]').forEach(btn => {
            btn.addEventListener('click', () => this.exportToPDF());
        });

        // Supervisor - New Reports
        document.getElementById('export-inventory-summary')?.addEventListener('click', () => this.exportInventorySummary());
        document.getElementById('export-divergence-report')?.addEventListener('click', () => this.exportDivergenceReport());
        document.getElementById('export-history-report')?.addEventListener('click', () => this.exportHistoryReport());

        // Supervisor - Filtros
        document.getElementById('apply-filters')?.addEventListener('click', () => this.applyFilters());

        // Google Sheets
        document.getElementById('connect-gsheets-catalog')?.addEventListener('click', () => this.openGoogleSheetsModal('catalog'));
        document.getElementById('connect-gsheets-qty')?.addEventListener('click', () => this.openGoogleSheetsModal('quantities'));
        document.getElementById('sync-gsheets-catalog')?.addEventListener('click', () => this.syncGoogleSheetsData('catalog'));
        document.getElementById('sync-gsheets-qty')?.addEventListener('click', () => this.syncGoogleSheetsData('quantities'));

        // Manual Invoice
        document.getElementById('add-invoice-item')?.addEventListener('click', () => this.addManualInvoiceItem());
        document.getElementById('save-manual-invoice')?.addEventListener('click', () => this.saveManualInvoice());

        // Reconciliation
        document.getElementById('run-reconciliation')?.addEventListener('click', () => this.runReconciliation());
        document.getElementById('export-reconciliation')?.addEventListener('click', () => this.exportReconciliation());

        // Multiple XML
        document.getElementById('xml-file-input')?.addEventListener('change', (e) => this.handleMultipleXMLFileUpload(e));
        document.getElementById('confirm-xml-import')?.addEventListener('click', () => this.confirmMultipleXMLImport());

        

        // Drag and drop para importação XLSX
        const importArea = document.querySelector('.import-area:not(.xml-import-area)');
        if (importArea) {
            importArea.addEventListener('dragover', (e) => e.preventDefault());
            importArea.addEventListener('drop', (e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileUpload({ target: { files } });
                }
            });
        }

        // Drag and drop para importação XML
        const xmlImportArea = document.querySelector('.xml-import-area');
        if (xmlImportArea) {
            xmlImportArea.addEventListener('dragover', (e) => e.preventDefault());
            xmlImportArea.addEventListener('drop', (e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleXMLFileUpload({ target: { files } });
                }
            });
        }

        // Conference mode
        document.getElementById('start-conf-btn')?.addEventListener('click', () => this.startConference());
        document.getElementById('conf-barcode-input')?.addEventListener('keypress', (e) => this.handleConferenceScan(e));
        document.getElementById('finish-conf-btn')?.addEventListener('click', () => this.finishConference());
    },

    handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('username-input').value.trim();
        const password = document.getElementById('password-input').value;
        const authSession = Storage.validateCredentials(username, password);

        if (!authSession) {
            this.showLoginMessage('Usuário ou senha inválidos.', 'error');
            document.getElementById('password-input').value = '';
            document.getElementById('username-input').focus();
            return;
        }

        this.state.currentUser = authSession.name;
        this.state.userRole = authSession.role;
        this.state.currentOperatorName = null;
        this.state.currentOperatorDate = null;
        this.state.currentOperatorTime = null;
        this.state.sessionStartTime = new Date();
        this.state.sessionScans = [];
        this.state.currentSession = null;

        Storage.clearOperatorSession();
        Storage.saveAuthSession(authSession);
        this.showSupervisorScreen();
    },

    handleOperatorStart(event) {
        event.preventDefault();

        const operatorName = Utils.sanitizeInput(document.getElementById('operator-name-input').value);

        if (!operatorName) {
            this.showOperatorMessage('Digite o nome do operador para iniciar.', 'error');
            document.getElementById('operator-name-input').focus();
            return;
        }

        const now = new Date();
        const operatorSession = {
            name: operatorName,
            role: 'operator',
            date: now.toLocaleDateString('pt-BR'),
            time: now.toLocaleTimeString('pt-BR'),
            startedAt: now.toISOString()
        };

        Storage.addCollaborator(operatorName);
        Storage.clearAuthSession();
        Storage.saveOperatorSession(operatorSession);

        this.state.currentUser = operatorName;
        this.state.userRole = 'operator';
        this.state.currentOperatorName = operatorName;
        this.state.currentOperatorDate = operatorSession.date;
        this.state.currentOperatorTime = operatorSession.time;
        this.state.sessionStartTime = now;
        this.state.sessionScans = [];

        const session = Storage.createSession({
            collaborator: operatorName,
            operatorName,
            operatorDate: operatorSession.date,
            operatorTime: operatorSession.time,
            role: 'operator',
            location: 'main'
        });

        operatorSession.sessionId = session.id;
        Storage.saveOperatorSession(operatorSession);

        this.state.currentSession = session;
        this.hideOperatorMessage();
        this.showOperatorScreen();
    },

    handleLogout() {
        if (this.state.currentSession) {
            Storage.endSession({
                itemsScanned: this.state.sessionScans.length,
                uniqueProducts: new Set(this.state.sessionScans.map(s => Storage.getScanPrimaryCode(s)).filter(Boolean)).size,
                scans: this.state.sessionScans
            });
        }

        this.state.currentUser = null;
        this.state.userRole = null;
        this.state.currentSession = null;
        this.state.currentOperatorName = null;
        this.state.currentOperatorDate = null;
        this.state.currentOperatorTime = null;
        this.state.sessionScans = [];
        if (this.state.sessionTimer) {
            clearInterval(this.state.sessionTimer);
            this.state.sessionTimer = null;
        }

        Storage.clearAuthSession();
        Storage.clearOperatorSession();
        Storage.clearCurrentSession();
        document.getElementById('login-form').reset();
        document.getElementById('operator-start-form').reset();
        this.hideLoginMessage();
        this.hideOperatorMessage();
        this.showScreen('login-screen');
        setTimeout(() => {
            const nameInput = document.getElementById('operator-name-input');
            if (nameInput) nameInput.focus();
        }, 100);
    },

    restoreAuthSession() {
        const authSession = Storage.getAuthSession();
        const operatorSession = Storage.getOperatorSession();

        if (authSession) {
            this.state.currentUser = authSession.name;
            this.state.userRole = authSession.role;

            const currentSession = Storage.getCurrentSession();
            if (currentSession && currentSession.role === authSession.role) {
                this.state.currentSession = currentSession;
                this.state.sessionStartTime = new Date(currentSession.startTime);
                this.state.sessionScans = Array.isArray(currentSession.scans) ? currentSession.scans : [];
            }

            if (authSession.role === 'operator') {
                this.showOperatorScreen();
            } else {
                this.showSupervisorScreen();
            }
            return;
        }

        if (operatorSession) {
            this.state.currentUser = operatorSession.name;
            this.state.userRole = operatorSession.role;
            this.state.currentOperatorName = operatorSession.name;
            this.state.currentOperatorDate = operatorSession.date;
            this.state.currentOperatorTime = operatorSession.time;

            const currentSession = Storage.getCurrentSession();
            if (currentSession && currentSession.id === operatorSession.sessionId) {
                this.state.currentSession = currentSession;
                this.state.sessionStartTime = new Date(currentSession.startTime);
                this.state.sessionScans = Array.isArray(currentSession.scans) ? currentSession.scans : [];
            }

            this.state.sessionStartTime = this.state.sessionStartTime || new Date(operatorSession.startedAt);
            this.state.sessionScans = this.state.sessionScans || [];

            this.showOperatorScreen();
            return;
        }

        this.showScreen('login-screen');
        const nameInput = document.getElementById('operator-name-input');
        if (nameInput) nameInput.focus();
    },

    showAdminLoginForm() {
        Utils.hide(document.getElementById('operator-start-form'));
        Utils.hide(document.getElementById('show-admin-login'));
        Utils.show(document.getElementById('login-form'));
        this.hideLoginMessage();
        this.hideOperatorMessage();
        setTimeout(() => document.getElementById('username-input')?.focus(), 50);
    },

    showOperatorStartForm() {
        Utils.show(document.getElementById('operator-start-form'));
        Utils.show(document.getElementById('show-admin-login'));
        Utils.hide(document.getElementById('login-form'));
        this.hideLoginMessage();
        this.hideOperatorMessage();
        setTimeout(() => document.getElementById('operator-name-input')?.focus(), 50);
    },

    showLoginMessage(message, type = 'error') {
        const messageElement = document.getElementById('login-message');
        messageElement.textContent = message;
        messageElement.className = `login-message ${type}`;
        Utils.show(messageElement);
    },

    hideLoginMessage() {
        const messageElement = document.getElementById('login-message');
        messageElement.textContent = '';
        Utils.hide(messageElement);
    },

    showOperatorMessage(message, type = 'error') {
        const messageElement = document.getElementById('operator-message');
        messageElement.textContent = message;
        messageElement.className = `login-message ${type}`;
        Utils.show(messageElement);
    },

    hideOperatorMessage() {
        const messageElement = document.getElementById('operator-message');
        messageElement.textContent = '';
        Utils.hide(messageElement);
    },

    /**
     * TELA DO OPERADOR
     */

    showOperatorScreen() {
        this.showScreen('operator-screen');

        if (!this.state.currentSession) {
            const now = new Date();
            this.state.sessionStartTime = now;
            this.state.currentOperatorName = this.state.currentUser;
            this.state.currentOperatorDate = now.toLocaleDateString('pt-BR');
            this.state.currentOperatorTime = now.toLocaleTimeString('pt-BR');

            this.state.currentSession = Storage.createSession({
                collaborator: this.state.currentUser,
                operatorName: this.state.currentOperatorName,
                operatorDate: this.state.currentOperatorDate,
                operatorTime: this.state.currentOperatorTime,
                role: this.state.userRole,
                location: 'main'
            });
        } else {
            this.state.currentOperatorName = this.state.currentSession.operatorName || this.state.currentSession.collaborator || this.state.currentUser;
            this.state.currentOperatorDate = this.state.currentSession.operatorDate || '';
            this.state.currentOperatorTime = this.state.currentSession.operatorTime || '';
            this.state.sessionStartTime = new Date(this.state.currentSession.startTime);
        }

        document.getElementById('operator-name').textContent = this.state.currentOperatorName;

        // Focar no input de leitura
        setTimeout(() => {
            document.getElementById('barcode-input').focus();
        }, 100);

        // Iniciar timer
        this.startSessionTimer();

        // Atualizar dashboards
        this.updateOperatorDashboard();
    },

    startSessionTimer() {
        let seconds = 0;
        if (this.state.sessionTimer) {
            clearInterval(this.state.sessionTimer);
        }

        this.state.sessionTimer = setInterval(() => {
            seconds++;
            document.getElementById('session-time').textContent = Utils.formatTime(seconds);
        }, 1000);
    },

    handleBarcodeScan(event) {
        if (event.key !== 'Enter') return;

        const barcodeInput = document.getElementById('barcode-input');
        const codigo = barcodeInput.value.trim();

        if (!codigo) {
            this.showError('Por favor, escaneie um código de barras.');
            barcodeInput.focus();
            return;
        }

        console.log("Código recebido:", codigo);
        barcodeInput.value = "";

        const produto = Storage.getProduct(codigo);
        console.log("Produto encontrado:", produto);

        if (!produto) {
            console.warn("Produto não encontrado:", codigo);
            this.showProductError(this.getProductNotFoundMessage(codigo));
            barcodeInput.focus();
            return;
        }

        this.recordScan(produto, codigo);
        this.resetBarcodeInput();
    },

    getCurrentBipagemType() {
        const selected = document.querySelector('input[name="bipagem-type"]:checked');
        return selected ? selected.value : 'unit';
    },

    showBipagemTypeSelector(product) {
        const selector = document.getElementById('bipagem-type-selector');
        const optionCaixa = document.getElementById('option-caixa');
        const optionMalote = document.getElementById('option-malote');
        const boxQty = document.getElementById('box-qty');
        const bundleQty = document.getElementById('bundle-qty');
        
        const qtyPerBox = Number(Storage.normalizeCode(product.QuantidadePorCaixa || product.QtdPorCaixa || 0));
        const qtyPerBundle = Number(Storage.normalizeCode(product.QuantidadePorMalote || product.QtdPorMalote || 0));
        
        if (qtyPerBox > 0) {
            optionCaixa.style.display = 'inline-flex';
            boxQty.textContent = qtyPerBox;
        } else {
            optionCaixa.style.display = 'none';
        }
        
        if (qtyPerBundle > 0) {
            optionMalote.style.display = 'inline-flex';
            bundleQty.textContent = qtyPerBundle;
        } else {
            optionMalote.style.display = 'none';
        }
        
        const hasMultiple = qtyPerBox > 0 || qtyPerBundle > 0;
        if (hasMultiple) {
            Utils.show(selector);
        } else {
            Utils.hide(selector);
        }
    },

    resetBarcodeInput() {
        const barcodeInput = document.getElementById('barcode-input');
        barcodeInput.value = "";
        barcodeInput.focus();
    },

    handleProductSearchInput(event) {
        this.renderProductSuggestions(event.target.value);
    },

    handleProductSearchKeydown(event) {
        if (event.key !== 'Enter') return;

        const product = this.findProductBySearchTerm(event.target.value);
        if (product) {
            event.preventDefault();
            this.loadProductForBipagem(product);
        }
    },

    handleProductSearchSelect(event) {
        const product = this.findProductBySearchTerm(event.target.value);

        if (!product) {
            this.showProductError('Nenhum produto encontrado para o termo informado.');
            event.target.value = '';
            document.getElementById('barcode-input').focus();
            return;
        }

        this.loadProductForBipagem(product);
    },

    renderProductSuggestions(searchTerm) {
        const datalist = document.getElementById('product-search-options');
        const term = Storage.normalizeCode(searchTerm).toLowerCase();

        if (!datalist) return;

        datalist.innerHTML = '';

        if (!term) {
            return;
        }

        Storage.getProducts()
            .filter(product => this.matchesProductSearch(product, term))
            .slice(0, 20)
            .forEach(product => {
                const option = document.createElement('option');
                option.value = Storage.getProductDisplayName(product);
                option.label = `${Storage.normalizeCode(product.SKU) || Storage.getProductPrimaryCode(product)} | ${Storage.normalizeCode(product.EAN) || Storage.getProductPrimaryCode(product)}`;
                datalist.appendChild(option);
            });
    },

    matchesProductSearch(product, term) {
        return [
            Storage.getProductDisplayName(product),
            Storage.normalizeCode(product.SKU),
            Storage.normalizeCode(product.EAN),
            Storage.normalizeCode(product.Barcode),
            Storage.normalizeCode(product.Codigo),
            Storage.normalizeCode(product.Código)
        ].some(value => Storage.normalizeCode(value).toLowerCase().includes(term));
    },

    findProductBySearchTerm(searchTerm) {
        const term = Storage.normalizeCode(searchTerm).toLowerCase();

        if (!term) {
            return null;
        }

        const products = Storage.getProducts();
        return products.find(product => [
            Storage.getProductDisplayName(product),
            Storage.normalizeCode(product.SKU),
            Storage.normalizeCode(product.EAN),
            Storage.normalizeCode(product.Barcode),
            Storage.normalizeCode(product.Codigo),
            Storage.normalizeCode(product.Código)
        ].some(value => Storage.normalizeCode(value).toLowerCase() === term))
            || products.find(product => this.matchesProductSearch(product, term));
    },

    loadProductForBipagem(product) {
        this.showBipagemTypeSelector(product);
        
        const scan = {
            product: Storage.getProductDisplayName(product),
            sku: Storage.normalizeCode(product.SKU),
            ean: Storage.getProductPrimaryCode(product),
            stock: Storage.getProductStock(product),
            category: Storage.getProductCategory(product)
        };

        this.showProductInfo(product, scan);
        document.getElementById('product-search-input').value = '';
        document.getElementById('barcode-input').focus();
    },

    recordScan(product, codigo = '') {
        const now = new Date();
        const bipagemType = this.getCurrentBipagemType();
        const qtyPerBox = Number(Storage.normalizeCode(product.QuantidadePorCaixa || product.QtdPorCaixa || 0));
        const qtyPerBundle = Number(Storage.normalizeCode(product.QuantidadePorMalote || product.QtdPorMalote || 0));
        
        let quantity = 1;
        if (bipagemType === 'box' && qtyPerBox > 0) {
            quantity = qtyPerBox;
        } else if (bipagemType === 'bundle' && qtyPerBundle > 0) {
            quantity = qtyPerBundle;
        }

        const scan = {
            collaborator: this.state.currentOperatorName || this.state.currentUser,
            operatorName: this.state.currentOperatorName || this.state.currentUser,
            operatorDate: this.state.currentOperatorDate,
            operatorTime: this.state.currentOperatorTime,
            product: Storage.getProductDisplayName(product),
            sku: Storage.normalizeCode(product.SKU),
            ean: Storage.getProductPrimaryCode(product),
            barcode: Storage.normalizeCode(codigo),
            stock: Storage.getProductStock(product),
            category: Storage.getProductCategory(product),
            timestamp: now.toISOString(),
            time: now.toLocaleTimeString('pt-BR'),
            bipagemType: bipagemType,
            quantity: quantity
        };

        Storage.addScan(scan);
        this.state.sessionScans.push(scan);

        this.showProductInfo(product, scan, bipagemType, quantity);
        this.updateOperatorDashboard();
        this.updateHistoryTable();
    },

    showProductInfo(product, scan, bipagemType = null, quantity = 1) {
        const productInfo = document.getElementById('product-info');
        const productName = document.getElementById('product-name');
        const productSKU = document.getElementById('product-sku');
        const productEAN = document.getElementById('product-ean');
        const productStock = document.getElementById('product-stock');
        const productMinStock = document.getElementById('product-min-stock');
        const productCategory = document.getElementById('product-category');
        const productCounted = document.getElementById('product-counted');

        productName.textContent = Storage.getProductDisplayName(product);
        productSKU.textContent = Storage.normalizeCode(product.SKU) || 'Não informado';
        productEAN.textContent = Storage.normalizeCode(product.EAN) || Storage.normalizeCode(product.Barcode) || Storage.normalizeCode(product.Codigo) || Storage.normalizeCode(product.Código) || Storage.normalizeCode(product.SKU) || 'Não informado';
        productStock.textContent = Storage.getProductStock(product);
        productMinStock.textContent = Storage.getProductMinStock(product);
        productCategory.textContent = Storage.getProductCategory(product);

        const productCode = Storage.getProductPrimaryCode(product);
        const count = productCode
            ? this.state.sessionScans.filter(s => Storage.getScanPrimaryCode(s) === productCode).length
            : 0;
        productCounted.textContent = count;

        Utils.show(productInfo);

        productInfo.style.animation = 'none';
        setTimeout(() => {
            productInfo.style.animation = 'slideDown 0.3s ease-out';
        }, 10);
    },

    showProductError(message) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        Utils.show(errorMessage);

        setTimeout(() => {
            Utils.hide(errorMessage);
        }, 3000);
    },

    getProductNotFoundMessage(codigo) {
        return [
            "Nenhum produto correspondente foi localizado.",
            `Código pesquisado: ${codigo}`,
            "Verifique:",
            "• Cadastro do produto",
            "• SKU",
            "• EAN",
            "• Código de barras",
            "• Importação da planilha"
        ].join('\n');
    },

    updateOperatorDashboard() {
        const totalItems = this.state.sessionScans.length;
        const uniqueProducts = new Set(this.state.sessionScans.map(s => Storage.getScanPrimaryCode(s)).filter(Boolean)).size;

        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('unique-products').textContent = uniqueProducts;
    },

    updateHistoryTable() {
        const tbody = document.getElementById('history-body');
        const emptyState = document.getElementById('empty-history');
        const filterTerm = this.getHistoryFilterTerm();

        const scans = this.state.sessionScans.filter((scan) => this.matchesHistorySearch(scan, filterTerm));

        if (scans.length === 0) {
            Utils.show(emptyState);
            tbody.innerHTML = '';
            return;
        }

        Utils.hide(emptyState);
        tbody.innerHTML = '';

        [...scans].reverse().forEach((scan, index) => {
            const row = document.createElement('tr');
            row.dataset.ean = Storage.getScanPrimaryCode(scan);
            row.dataset.index = index;
            row.innerHTML = `
                <td>${scan.time}</td>
                <td>${scan.product}</td>
                <td>${scan.sku}</td>
                <td>${Storage.normalizeCode(scan.ean)}</td>
                <td>
                    <button class="btn btn--secondary btn--small btn-remove-scan" aria-label="Remover bipagem do produto ${scan.product}">
                        Remover
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.btn-remove-scan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const ean = row.dataset.ean;
                const originalScan = [...this.state.sessionScans].reverse().find((scan) => {
                    return this.matchesHistorySearch(scan, filterTerm) && Storage.getScanPrimaryCode(scan) === ean;
                });

                const realIndex = originalScan
                    ? this.state.sessionScans.indexOf(originalScan)
                    : -1;

                if (realIndex >= 0) {
                    this.removeScanByIndex(realIndex);
                }
            });
        });
    },

    getHistoryFilterTerm() {
        const filterInput = document.getElementById('history-filter-input');
        return Storage.normalizeCode(filterInput?.value).toLowerCase();
    },

    matchesHistorySearch(scan, filterTerm) {
        if (!filterTerm) return true;

        return [
            scan.product,
            scan.sku,
            scan.ean,
            scan.barcode,
            scan.collaborator,
            scan.operatorName
        ].some((value) => Storage.normalizeCode(value).toLowerCase().includes(filterTerm));
    },

    removeScanByIndex(index) {
        if (index >= 0 && index < this.state.sessionScans.length) {
            this.state.sessionScans.splice(index, 1);
            this.updateHistoryTable();
            this.updateOperatorDashboard();
        }
    },

    clearHistory() {
        if (confirm('Tem certeza que deseja limpar o histórico? Esta ação não pode ser desfeita.')) {
            this.state.sessionScans = [];
            this.updateHistoryTable();
            this.updateOperatorDashboard();
        }
    },

    finishInventory() {
        if (this.state.sessionScans.length === 0) {
            alert('Nenhum produto foi escaneado nesta sessão.');
            return;
        }

        const endTime = new Date();
        const duration = Math.floor((endTime - this.state.sessionStartTime) / 1000);
        const uniqueProducts = new Set(this.state.sessionScans.map(s => Storage.getScanPrimaryCode(s)).filter(Boolean)).size;

        if (this.state.currentSession) {
            Storage.endSession({
                itemsScanned: this.state.sessionScans.length,
                uniqueProducts: uniqueProducts,
                scans: this.state.sessionScans
            });
        }

        Storage.saveOperatorSessionData({
            collaborator: this.state.currentOperatorName,
            date: this.state.currentOperatorDate,
            time: this.state.currentOperatorTime,
            duration: duration,
            itemsScanned: this.state.sessionScans.length,
            uniqueProducts: uniqueProducts,
            scans: this.state.sessionScans
        });

        this.clearOperatorSessionState();
        this.showScreen('login-screen');
        setTimeout(() => {
            const nameInput = document.getElementById('operator-name-input');
            if (nameInput) nameInput.focus();
        }, 100);
    },

    clearOperatorSessionState() {
        this.state.sessionScans = [];
        this.state.currentSession = null;
        this.state.sessionTimer = null;
        this.state.sessionScans = [];
        
        const productInfo = document.getElementById('product-info');
        if (productInfo) Utils.hide(productInfo);
        
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) barcodeInput.value = '';
        
        const emptyHistory = document.getElementById('empty-history');
        if (emptyHistory) Utils.show(emptyHistory);
        
        const historyBody = document.getElementById('history-body');
        if (historyBody) historyBody.innerHTML = '';
        
        const totalItems = document.getElementById('total-items');
        const uniqueProducts = document.getElementById('unique-products');
        if (totalItems) totalItems.textContent = '0';
        if (uniqueProducts) uniqueProducts.textContent = '0';
    },

    showBipagemReportModal() {
        if (this.state.sessionScans.length === 0) {
            alert('Nenhuma bipagem registrada nesta sessão.');
            return;
        }

        const reportRows = this.buildBipagemReportRows();
        this.state.bipagemReportRows = reportRows;

        const tbody = document.getElementById('bipagem-report-body');
        tbody.innerHTML = '';

        reportRows.forEach(row => {
            const tr = document.createElement('tr');
            const productCell = document.createElement('td');
            const skuCell = document.createElement('td');
            const quantityCell = document.createElement('td');

            productCell.textContent = row.product;
            skuCell.textContent = row.sku || row.ean || 'Não informado';
            quantityCell.textContent = row.count;
            quantityCell.style.textAlign = 'right';

            tr.appendChild(productCell);
            tr.appendChild(skuCell);
            tr.appendChild(quantityCell);
            tbody.appendChild(tr);
        });

        document.getElementById('bipagem-report-modal').showModal();
    },

    buildBipagemReportRows() {
        const grouped = new Map();

        this.state.sessionScans.forEach(scan => {
            const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
            const existing = grouped.get(key) || {
                operatorName: Storage.normalizeCode(scan.operatorName || scan.collaborator),
                operatorDate: Storage.normalizeCode(scan.operatorDate),
                operatorTime: Storage.normalizeCode(scan.operatorTime),
                product: Storage.normalizeCode(scan.product),
                sku: Storage.normalizeCode(scan.sku),
                ean: Storage.normalizeCode(scan.ean),
                count: 0
            };

            existing.count += 1;
            grouped.set(key, existing);
        });

        return [...grouped.values()].sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'));
    },

    exportBipagemReportXLSX() {
        const tab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'consolidated';
        
        if (tab === 'consolidated') {
            const rows = this.state.bipagemReportRows.length > 0 ? this.state.bipagemReportRows : this.buildBipagemReportRows();
            if (rows.length === 0) {
                alert('Nenhuma bipagem registrada nesta sessão.');
                return;
            }
            const exportRows = rows.map(row => ({
                Operador: row.operatorName,
                Data: row.operatorDate,
                Hora: row.operatorTime,
                Produto: row.product,
                SKU: row.sku,
                EAN: row.ean,
                Quantidade: row.count
            }));
            Utils.createExcelFromData(exportRows, `relatorio_bipagem_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            const selectedCollaborator = document.getElementById('collaborator-filter').value;
            const scans = selectedCollaborator 
                ? this.state.sessionScans.filter(s => s.collaborator === selectedCollaborator)
                : this.state.sessionScans;
            
            if (scans.length === 0) {
                alert('Nenhuma bipagem registrada para este colaborador.');
                return;
            }
            
            const grouped = new Map();
            scans.forEach(scan => {
                const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
                const existing = grouped.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    grouped.set(key, {
                        product: Storage.normalizeCode(scan.product),
                        sku: Storage.normalizeCode(scan.sku),
                        ean: Storage.normalizeCode(scan.ean),
                        count: 1,
                        operatorName: Storage.normalizeCode(scan.collaborator)
                    });
                }
            });
            
            const exportRows = [...grouped.values()].map(row => ({
                Operador: selectedCollaborator || row.operatorName,
                Produto: row.product,
                SKU: row.sku,
                EAN: row.ean,
                Quantidade: row.count
            }));
            
            Utils.createExcelFromData(exportRows, `relatorio_${selectedCollaborator || 'colaborador'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    },

    exportBipagemReportCSV() {
        const tab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'consolidated';
        
        if (tab === 'consolidated') {
            const rows = this.state.bipagemReportRows.length > 0 ? this.state.bipagemReportRows : this.buildBipagemReportRows();
            if (rows.length === 0) {
                alert('Nenhuma bipagem registrada nesta sessão.');
                return;
            }
            const exportRows = rows.map(row => ({
                Operador: row.operatorName,
                Data: row.operatorDate,
                Hora: row.operatorTime,
                Produto: row.product,
                SKU: row.sku,
                EAN: row.ean,
                Quantidade: row.count
            }));
            const csv = Storage.exportToCSV(exportRows);
            Storage.downloadCSV(csv, `relatorio_bipagem_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            const selectedCollaborator = document.getElementById('collaborator-filter').value;
            const scans = selectedCollaborator 
                ? this.state.sessionScans.filter(s => s.collaborator === selectedCollaborator)
                : this.state.sessionScans;
            
            if (scans.length === 0) {
                alert('Nenhuma bipagem registrada para este colaborador.');
                return;
            }
            
            const grouped = new Map();
            scans.forEach(scan => {
                const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
                const existing = grouped.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    grouped.set(key, {
                        product: Storage.normalizeCode(scan.product),
                        sku: Storage.normalizeCode(scan.sku),
                        ean: Storage.normalizeCode(scan.ean),
                        count: 1,
                        operatorName: Storage.normalizeCode(scan.collaborator)
                    });
                }
            });
            
            const exportRows = [...grouped.values()].map(row => ({
                Operador: selectedCollaborator || row.operatorName,
                Produto: row.product,
                SKU: row.sku,
                EAN: row.ean,
                Quantidade: row.count
            }));
            
            const csv = Storage.exportToCSV(exportRows);
            Storage.downloadCSV(csv, `relatorio_${selectedCollaborator || 'colaborador'}_${new Date().toISOString().split('T')[0]}.csv`);
        }
    },

    closeBipagemReportModal() {
        document.getElementById('bipagem-report-modal').close();
        document.getElementById('barcode-input').focus();
    },

    switchReportTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
        
        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        if (tabName === 'by-collaborator') {
            this.populateCollaboratorFilter();
            this.renderCollaboratorReports();
        }
    },

    populateCollaboratorFilter() {
        const filter = document.getElementById('collaborator-filter');
        const collaborators = [...new Set(this.state.sessionScans.map(s => s.collaborator).filter(Boolean))];
        filter.innerHTML = '<option value="">Todos os Colaboradores</option>';
        collaborators.forEach(collab => {
            const option = document.createElement('option');
            option.value = collab;
            option.textContent = collab;
            filter.appendChild(option);
        });
    },

    renderCollaboratorReports() {
        const filter = document.getElementById('collaborator-filter');
        const container = document.getElementById('collaborator-reports-container');
        const selectedCollaborator = filter.value;
        
        let scans = this.state.sessionScans;
        if (selectedCollaborator) {
            scans = scans.filter(s => s.collaborator === selectedCollaborator);
        }
        
        const grouped = new Map();
        scans.forEach(scan => {
            const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
            const existing = grouped.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                grouped.set(key, {
                    product: Storage.normalizeCode(scan.product),
                    sku: Storage.normalizeCode(scan.sku),
                    ean: Storage.normalizeCode(scan.ean),
                    count: 1
                });
            }
        });
        
        container.innerHTML = '';
        
        if (selectedCollaborator) {
            const collaboratorScans = this.state.sessionScans.filter(s => s.collaborator === selectedCollaborator);
            const uniqueCollaborators = [...new Set(collaboratorScans.map(s => s.collaborator))];
            
            uniqueCollaborators.forEach(collab => {
                const collabScans = collaboratorScans.filter(s => s.collaborator === collab);
                const collabGrouped = new Map();
                collabScans.forEach(scan => {
                    const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
                    const existing = collabGrouped.get(key);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        collabGrouped.set(key, {
                            product: Storage.normalizeCode(scan.product),
                            sku: Storage.normalizeCode(scan.sku),
                            ean: Storage.normalizeCode(scan.ean),
                            count: 1
                        });
                    }
                });
                
                const section = document.createElement('div');
                section.style.marginBottom = '20px';
                section.style.border = '1px solid #ddd';
                section.style.borderRadius = '5px';
                section.style.padding = '10px';
                
                let tableHTML = `
                    <h4 style="margin-top: 0; margin-bottom: 10px;">${collab}: ${collabGrouped.size} produto(s)</h4>
                    <table class="bipagem-report-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>SKU</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                [...collabGrouped.values()].forEach(row => {
                    tableHTML += `
                        <tr>
                            <td>${row.product}</td>
                            <td>${row.sku || row.ean || 'Não informado'}</td>
                            <td style="text-align: right;">${row.count}</td>
                        </tr>
                    `;
                });
                
                tableHTML += '</tbody></table>';
                section.innerHTML = tableHTML;
                container.appendChild(section);
            });
        } else {
            const collaborators = [...new Set(scans.map(s => s.collaborator))];
            collaborators.forEach(collab => {
                const collabScans = scans.filter(s => s.collaborator === collab);
                const collabGrouped = new Map();
                collabScans.forEach(scan => {
                    const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
                    const existing = collabGrouped.get(key);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        collabGrouped.set(key, {
                            product: Storage.normalizeCode(scan.product),
                            sku: Storage.normalizeCode(scan.sku),
                            ean: Storage.normalizeCode(scan.ean),
                            count: 1
                        });
                    }
                });
                
                const section = document.createElement('div');
                section.style.marginBottom = '20px';
                section.style.border = '1px solid #ddd';
                section.style.borderRadius = '5px';
                section.style.padding = '10px';
                
                let tableHTML = `
                    <h4 style="margin-top: 0; margin-bottom: 10px;">${collab}: ${collabGrouped.size} produto(s)</h4>
                    <table class="bipagem-report-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>SKU</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                [...collabGrouped.values()].forEach(row => {
                    tableHTML += `
                        <tr>
                            <td>${row.product}</td>
                            <td>${row.sku || row.ean || 'Não informado'}</td>
                            <td style="text-align: right;">${row.count}</td>
                        </tr>
                    `;
                });
                
                tableHTML += '</tbody></table>';
                section.innerHTML = tableHTML;
                container.appendChild(section);
            });
        }
    },

    exportBipagemReportPDF() {
        const rows = this.state.bipagemReportRows.length > 0 ? this.state.bipagemReportRows : this.buildBipagemReportRows();
        if (rows.length === 0) {
            alert('Nenhuma bipagem registrada nesta sessão.');
            return;
        }
        
        const element = this.createConsolidatedReportElement(rows);
        const opt = {
            margin: 10,
            filename: `relatorio_bipagem_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
        }).catch(err => {
            document.body.removeChild(element);
            console.error('PDF export error:', err);
            alert('Erro ao gerar PDF: ' + err.message);
        });
    },

    exportInventorySummary() {
        const products = Storage.getProducts() || [];
        const scans = Storage.getScans() || [];
        const stats = Storage.getStatistics();

        const data = [{
            'Total de Produtos': products.length,
            'Total de Bipagens': scans.length,
            'Colaboradores Únicos': stats.totalCollaborators,
            'Data do Relatório': new Date().toLocaleDateString('pt-BR')
        }];

        Utils.createExcelFromData(data, `resumo_inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    exportDivergenceReport() {
        const discrepancies = Storage.getReconciliationData();
        const data = discrepancies.map(d => ({
            SKU: d.sku || '',
            EAN: d.ean,
            Esperado: d.expected,
            Contado: d.scanned,
            Diferença: d.difference,
            Tipo: d.type === 'shortage' ? 'Falta' : 'Sobra'
        }));

        Utils.createExcelFromData(data, `divergencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    exportHistoryReport() {
        const scans = Storage.getScans() || [];
        const data = scans.map(s => ({
            Data: new Date(s.timestamp).toLocaleDateString('pt-BR'),
            Hora: new Date(s.timestamp).toLocaleTimeString('pt-BR'),
            Colaborador: Storage.normalizeCode(s.collaborator),
            Produto: Storage.normalizeCode(s.product),
            SKU: Storage.normalizeCode(s.sku),
            EAN: Storage.normalizeCode(s.ean),
            Local: this.getLocationLabel(s.location)
        }));

        Utils.createExcelFromData(data, `historico_completo_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    createConsolidatedReportElement(rows) {
        const element = document.createElement('div');
        element.innerHTML = `
            <h1>Relatório Consolidado de Bipagem</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            <p>Total de Itens: ${rows.reduce((sum, r) => sum + r.count, 0)}</p>
            <p>Produtos Únicos: ${rows.length}</p>
            <table border="1" cellpadding="5" style="width: 100%; margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                        <tr>
                            <td>${r.product}</td>
                            <td>${r.sku || r.ean || 'Não informado'}</td>
                            <td style="text-align: right;">${r.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return element;
    },

    createCollaboratorReportElement(scans, collaborator) {
        const grouped = new Map();
        scans.forEach(scan => {
            const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
            const existing = grouped.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                grouped.set(key, {
                    product: Storage.normalizeCode(scan.product),
                    sku: Storage.normalizeCode(scan.sku),
                    ean: Storage.normalizeCode(scan.ean),
                    count: 1
                });
            }
        });
        
        const element = document.createElement('div');
        element.innerHTML = `
            <h1>Relatório por Colaborador</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            ${collaborator ? `<p>Colaborador: ${collaborator}</p>` : ''}
            <p>Total de Itens: ${scans.length}</p>
            <p>Produtos Únicos: ${grouped.size}</p>
            <table border="1" cellpadding="5" style="width: 100%; margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${[...grouped.values()].map(r => `
                        <tr>
                            <td>${r.product}</td>
                            <td>${r.sku || r.ean || 'Não informado'}</td>
                            <td style="text-align: right;">${r.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return element;
    },

    /**
     * TELA DO SUPERVISOR
     */

    showSupervisorScreen() {
        this.showScreen('supervisor-screen');
        document.getElementById('supervisor-name').textContent = this.state.currentUser;

        this.enforcePermissions();

        const firstAllowed = this.permissions[this.state.userRole]?.[0] || 'dashboard';
        this.showTab(firstAllowed);
    },

    handleTabSwitch(event) {
        const tabName = event.target.dataset.tab;
        if (!this.isTabAllowed(tabName)) {
            this.showError('Acesso negado a esta funcionalidade.');
            return;
        }

        this.showTab(tabName);
    },

    showTab(tabName) {
        // Remover active de todos os tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('tab-content--active');
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('nav-btn--active');
            btn.setAttribute('aria-selected', 'false');
        });

        // Ativar tab selecionado
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) {
            tab.classList.add('tab-content--active');
        }

        const btn = document.querySelector(`[data-tab="${tabName}"]`);
        if (btn) {
            btn.classList.add('nav-btn--active');
            btn.setAttribute('aria-selected', 'true');
        }

        // Atualizar conteúdo do tab
        switch (tabName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'history':
                this.updateHistoryTab();
                break;
            case 'reconciliation':
                this.updateReconciliationTab();
                break;
            case 'divergences':
                this.updateDiscrepanciesTab();
                break;
            case 'not-inventoried':
                this.updateNotInventoriedTab();
                break;
            case 'import':
                this.updateImportTab();
                break;
            case 'product-catalog':
                this.updateProductCatalogTab();
                break;
            case 'inventory-quantities':
                this.updateInventoryQuantitiesTab();
                break;
            case 'manual-invoice':
                this.updateManualInvoiceTab();
                break;
            case 'conference':
                this.updateConferenceTab();
                break;
            case 'reports':
                this.updateReportsTab();
                break;
        }
    },

    updateDashboard() {
        const stats = Storage.getStatistics();

        // KPIs
        document.getElementById('kpi-total-scans').textContent = stats.totalScans;
        document.getElementById('kpi-total-products').textContent = stats.totalProducts;
        document.getElementById('kpi-collaborators').textContent = stats.totalCollaborators;
        document.getElementById('kpi-avg-time').textContent = stats.avgTimePerScan;

        // Ranking
        this.updateRankingTable(stats.productivityByCollaborator);
    },

    updateRankingTable(productivity) {
        const tbody = document.getElementById('ranking-body');
        tbody.innerHTML = '';

        // Ordenar por produtividade decrescente
        const sorted = Object.entries(productivity)
            .sort((a, b) => b[1].productivity - a[1].productivity);

        sorted.forEach((entry, index) => {
            const [collaborator, data] = entry;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${collaborator}</td>
                <td>${data.scans}</td>
                <td>${data.uniqueProducts}</td>
                <td>${data.productivity.toFixed(2)} scans/prod</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateHistoryTab() {
        const tbody = document.getElementById('all-history-body');
        const scans = Storage.getScans() || [];

        tbody.innerHTML = '';
        scans.reverse().forEach(scan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDate(scan.timestamp)} ${new Date(scan.timestamp).toLocaleTimeString('pt-BR')}</td>
                <td>${Storage.normalizeCode(scan.collaborator)}</td>
                <td>${Storage.normalizeCode(scan.product)}</td>
                <td>${Storage.normalizeCode(scan.sku)}</td>
                <td>${Storage.normalizeCode(scan.ean)}</td>
                <td>${this.getLocationLabel(scan.location)}</td>
            `;
            tbody.appendChild(row);
        });

        // Popular dropdown de colaboradores
        const collaboratorSelect = document.getElementById('filter-collaborator');
        const collaborators = Storage.getCollaborators();
        collaboratorSelect.innerHTML = '<option value="">Todos os Colaboradores</option>';
        collaborators.forEach(collab => {
            const option = document.createElement('option');
            option.value = collab;
            option.textContent = collab;
            collaboratorSelect.appendChild(option);
        });
    },

    applyFilters() {
        const date = document.getElementById('filter-date').value;
        const collaborator = document.getElementById('filter-collaborator').value;
        const product = document.getElementById('filter-product').value;

        let scans = Storage.getScans() || [];

        if (date) {
            scans = scans.filter(s => Utils.formatDate(s.timestamp) === date);
        }

        if (collaborator) {
            scans = scans.filter(s => s.collaborator === collaborator);
        }

        if (product) {
            scans = scans.filter(s => Storage.normalizeCode(s.product).toLowerCase().includes(product.toLowerCase()));
        }

        const tbody = document.getElementById('all-history-body');
        tbody.innerHTML = '';

        scans.reverse().forEach(scan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDate(scan.timestamp)} ${new Date(scan.timestamp).toLocaleTimeString('pt-BR')}</td>
                <td>${Storage.normalizeCode(scan.collaborator)}</td>
                <td>${Storage.normalizeCode(scan.product)}</td>
                <td>${Storage.normalizeCode(scan.sku)}</td>
                <td>${Storage.normalizeCode(scan.ean)}</td>
                <td>${this.getLocationLabel(scan.location)}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateDiscrepanciesTab() {
        const discrepancies = Storage.getDiscrepancies();
        const tbody = document.getElementById('divergences-body');

        tbody.innerHTML = '';
        discrepancies.forEach(disc => {
            const row = document.createElement('tr');
            row.classList.add(disc.type === 'shortage' ? 'shortage' : 'excess');
            row.innerHTML = `
                <td>${Storage.normalizeCode(disc.sku)}</td>
                <td>${Storage.normalizeCode(disc.product)}</td>
                <td>${disc.systemStock}</td>
                <td>${disc.countedStock}</td>
                <td><strong>${disc.difference > 0 ? '+' : ''}${disc.difference}</strong></td>
                <td>${disc.type === 'shortage' ? '❌ Falta' : '✅ Sobra'}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateNotInventoriedTab() {
        const notInventoried = Storage.getNotInventoriedProducts();
        const tbody = document.getElementById('not-inventoried-body');

        tbody.innerHTML = '';
        notInventoried.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Storage.normalizeCode(product.SKU)}</td>
                <td>${Storage.getProductPrimaryCode(product)}</td>
                <td>${Storage.getProductDisplayName(product)}</td>
                <td>${Storage.getProductStock(product)}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateImportTab() {
        const products = Storage.getProducts() || [];
        const catalog = Storage.getProductCatalog() || [];
        const quantities = Storage.getInventoryQuantities() || [];
        
        document.getElementById('current-products-count').textContent = `${products.length} produtos no sistema`;
        document.getElementById('catalog-count').textContent = `${catalog.length} produtos no catálogo`;
        document.getElementById('qty-count').textContent = `${quantities.length} itens de quantidade`;
    },

    updateReportsTab() {
        const collaborators = Storage.getCollaborators() || [];
        const filter = document.getElementById('report-collaborator-filter');
        const currentValue = filter.value;
        
        filter.innerHTML = '<option value="">Selecione um colaborador</option>';
        collaborators.forEach(collab => {
            const option = document.createElement('option');
            option.value = collab;
            option.textContent = collab;
            filter.appendChild(option);
        });
        
        if (currentValue && collaborators.includes(currentValue)) {
            filter.value = currentValue;
        }
        
        this.updateCollaboratorReportSummary();
    },

    updateProductCatalogTab() {
        const products = Storage.getProductCatalog() || [];
        const tbody = document.getElementById('catalog-body');
        const countEl = document.getElementById('catalog-count');
        
        if (countEl) countEl.textContent = `${products.length} produtos`;
        if (!tbody) return;
        
        tbody.innerHTML = '';
        products.slice(0, 50).forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Storage.normalizeCode(product.SKU || product.sku)}</td>
                <td>${Storage.normalizeCode(product.EAN || product.ean)}</td>
                <td>${Storage.getProductDisplayName(product)}</td>
                <td>${Storage.normalizeCode(product.Brand || product.brand)}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateInventoryQuantitiesTab() {
        const quantities = Storage.getInventoryQuantities() || [];
        const tbody = document.getElementById('qty-body');
        const countEl = document.getElementById('qty-count');
        
        if (countEl) countEl.textContent = `${quantities.length} itens`;
        if (!tbody) return;
        
        tbody.innerHTML = '';
        quantities.forEach(qty => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Storage.normalizeCode(qty.sku)}</td>
                <td>${Storage.normalizeCode(qty.ean)}</td>
                <td style="text-align: right;">${qty.expectedQuantity}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateManualInvoiceTab() {
        const dateInput = document.getElementById('invoice-date');
        if (dateInput) dateInput.valueAsDate = new Date();
    },

    openGoogleSheetsModal(source) {
        const url = prompt('Cole a URL do Google Sheet (formato CSV):', '');
        if (!url) return;
        
        const config = { source, gsheetUrl: url, connectedAt: new Date().toISOString() };
        Storage.saveGoogleSheetsConfig(config);
        
        const statusEl = document.getElementById(`gsheets-${source === 'catalog' ? 'catalog' : 'qty'}-status`);
        if (statusEl) {
            statusEl.textContent = '✓ Conectado';
            statusEl.style.color = 'green';
        }
    },

    async syncGoogleSheetsData(source) {
        const config = Storage.getGoogleSheetsConfig();
        if (!config?.gsheetUrl) {
            alert('Google Sheet não configurado.');
            return;
        }
        
        try {
            const response = await fetch(config.gsheetUrl);
            const text = await response.text();
            
            const lines = text.split('\n').map(line => line.split(','));
            const headers = lines[0];
            const rows = lines.slice(1).filter(line => line.some(cell => cell.trim()));
            
            if (source === 'catalog') {
                const products = rows.map(row => {
                    const p = {};
                    headers.forEach((h, i) => {
                        p[h.trim()] = row[i] || '';
                    });
                    return p;
                });
                Storage.saveProductCatalog(products);
                this.updateProductCatalogTab();
            } else {
                const quantities = rows.map(row => {
                    const q = {};
                    headers.forEach((h, i) => {
                        q[h.trim()] = row[i] || '';
                    });
                    return {
                        ean: q.EAN || q.ean || '',
                        sku: q.SKU || q.sku || '',
                        expectedQuantity: Number(q.ExpectedQuantity || q.expectedQuantity || 0)
                    };
                }).filter(q => q.ean || q.sku);
                Storage.saveInventoryQuantities(quantities);
                this.updateInventoryQuantitiesTab();
            }
            
            const statusEl = document.getElementById(`gsheets-${source === 'catalog' ? 'catalog' : 'qty'}-status`);
            if (statusEl) {
                statusEl.textContent = `✓ Última sync: ${new Date().toLocaleTimeString('pt-BR')}`;
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            alert('Erro ao sincronizar: ' + error.message);
        }
    },

    addManualInvoiceItem() {
        const ean = document.getElementById('item-ean').value.trim();
        const qty = Number(document.getElementById('item-qty').value) || 1;
        
        if (!ean || qty < 1) return;
        
        const product = Storage.getProduct(ean);
        const item = {
            ean,
            sku: product ? Storage.normalizeCode(product.SKU) : '',
            description: product ? Storage.getProductDisplayName(product) : '',
            quantity: qty
        };
        
        if (!this.state.manualInvoiceItems) this.state.manualInvoiceItems = [];
        this.state.manualInvoiceItems.push(item);
        
        this.renderManualInvoiceItems();
        document.getElementById('item-ean').value = '';
        document.getElementById('item-qty').value = '1';
    },

    renderManualInvoiceItems() {
        const tbody = document.getElementById('manual-invoice-items-body');
        if (!tbody || !this.state.manualInvoiceItems) return;
        
        tbody.innerHTML = '';
        this.state.manualInvoiceItems.forEach((item, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.ean}</td>
                <td>${item.description}</td>
                <td>${item.sku}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td><button onclick="App.removeManualInvoiceItem(${idx})" class="btn btn--secondary btn--small">Remover</button></td>
            `;
            tbody.appendChild(row);
        });
    },

    removeManualInvoiceItem(index) {
        if (this.state.manualInvoiceItems && this.state.manualInvoiceItems[index]) {
            this.state.manualInvoiceItems.splice(index, 1);
            this.renderManualInvoiceItems();
        }
    },

    saveManualInvoice() {
        const number = document.getElementById('invoice-number').value.trim();
        const supplier = document.getElementById('invoice-supplier').value.trim();
        const date = document.getElementById('invoice-date').value;
        
        if (!number || !supplier || !this.state.manualInvoiceItems?.length) {
            alert('Preencha todos os campos e adicione itens.');
            return;
        }
        
        const invoice = this.createManualInvoice({
            invoiceNumber: number,
            supplier,
            date,
            items: this.state.manualInvoiceItems
        });
        
        Storage.saveXMLInvoice({
            id: invoice.id,
            nfInfo: { numeroNF: number, fornecedor: supplier, dataEmissao: date },
            items: invoice.items.map(item => ({
                codigoProduto: item.sku,
                ean: item.ean,
                description: item.description,
                quantity: item.quantity,
                unitValue: 0,
                totalValue: 0
            }))
        });
        
        alert('Nota fiscal manual salva com sucesso!');
        this.state.manualInvoiceItems = [];
        this.renderManualInvoiceItems();
        document.getElementById('manual-invoice-form').reset();
    },

    runReconciliation() {
        const discrepancies = Storage.getReconciliationData();
        const tbody = document.getElementById('reconciliation-body');
        const countEl = document.getElementById('recon-div-count');
        
        if (countEl) countEl.textContent = discrepancies.length;
        if (!tbody) return;
        
        tbody.innerHTML = '';
        discrepancies.forEach(disc => {
            const row = document.createElement('tr');
            const diffColor = disc.type === 'shortage' ? 'diff-red' : 'diff-green';
            row.innerHTML = `
                <td>${disc.sku || '-'}</td>
                <td>${disc.ean}</td>
                <td style="text-align: right;">${disc.expected}</td>
                <td style="text-align: right;">${disc.scanned}</td>
                <td style="text-align: right;" class="${diffColor}"><strong>${disc.difference > 0 ? '+' : ''}${disc.difference}</strong></td>
                <td>${disc.type === 'shortage' ? '❌ Falta' : '✅ Sobra'}</td>
            `;
            tbody.appendChild(row);
        });
    },

    exportReconciliation() {
        const discrepancies = Storage.getReconciliationData();
        const data = discrepancies.map(d => ({
            SKU: d.sku || '',
            EAN: d.ean,
            Esperado: d.expected,
            Contado: d.scanned,
            Diferença: d.difference,
            Tipo: d.type === 'shortage' ? 'Falta' : 'Sobra'
        }));
        
        Utils.createExcelFromData(data, `reconciliacao_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    updateCollaboratorReportSummary() {
        const filter = document.getElementById('report-collaborator-filter');
        const summary = document.getElementById('collaborator-report-summary');
        const selectedCollaborator = filter.value;
        
        if (!selectedCollaborator) {
            summary.innerHTML = '';
            return;
        }
        
        const scans = Storage.getScans() || [];
        const collaboratorScans = scans.filter(s => s.collaborator === selectedCollaborator);
        
        if (collaboratorScans.length === 0) {
            summary.innerHTML = `<p>Nenhuma bipagem encontrada para <strong>${selectedCollaborator}</strong>.</p>`;
            return;
        }
        
        const uniqueProducts = new Set(collaboratorScans.map(s => Storage.getScanPrimaryCode(s)).filter(Boolean)).size;
        
        summary.innerHTML = `
            <div class="report-summary-info">
                <p><strong>Colaborador:</strong> ${selectedCollaborator}</p>
                <p><strong>Total de Bipagens:</strong> ${collaboratorScans.length}</p>
                <p><strong>Produtos Únicos:</strong> ${uniqueProducts}</p>
            </div>
        `;
    },

    generateCollaboratorReportPDF() {
        const filter = document.getElementById('report-collaborator-filter');
        const selectedCollaborator = filter.value;
        
        if (!selectedCollaborator) {
            alert('Selecione um colaborador para gerar o relatório.');
            return;
        }
        
        const scans = Storage.getScans() || [];
        const collaboratorScans = scans.filter(s => s.collaborator === selectedCollaborator);
        
        if (collaboratorScans.length === 0) {
            alert('Nenhuma bipagem encontrada para este colaborador.');
            return;
        }
        
        const grouped = new Map();
        collaboratorScans.forEach(scan => {
            const key = `${Storage.normalizeCode(scan.ean)}|${Storage.normalizeCode(scan.sku)}|${Storage.normalizeCode(scan.product)}`;
            const existing = grouped.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                grouped.set(key, {
                    product: Storage.normalizeCode(scan.product),
                    sku: Storage.normalizeCode(scan.sku),
                    ean: Storage.normalizeCode(scan.ean),
                    count: 1,
                    time: scan.time,
                    date: scan.operatorDate
                });
            }
        });
        
        const element = this.createCollaboratorPDFReportElement(selectedCollaborator, [...grouped.values()], collaboratorScans);
        document.body.appendChild(element);
        
        const opt = {
            margin: 10,
            filename: `relatorio_${selectedCollaborator}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
        });
    },

    createCollaboratorPDFReportElement(collaborator, groupedItems, scans) {
        const totalItems = scans.length;
        const uniqueProducts = groupedItems.length;
        const duration = this.calculateSessionDuration(scans);
        
        const element = document.createElement('div');
        element.innerHTML = `
            <h1>Relatório por Colaborador</h1>
            <div style="margin-bottom: 20px;">
                <p><strong>Nome do Colaborador:</strong> ${collaborator}</p>
                <p><strong>Data:</strong> ${scans[0]?.operatorDate || new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Tempo de Inventário:</strong> ${duration}</p>
                <p><strong>Itens Bipados:</strong> ${totalItems}</p>
                <p><strong>Produtos Únicos:</strong> ${uniqueProducts}</p>
            </div>
            <table border="1" cellpadding="5" style="width: 100%; margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>EAN</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${groupedItems.map(item => `
                        <tr>
                            <td>${item.product}</td>
                            <td>${item.sku || '-'}</td>
                            <td>${item.ean || '-'}</td>
                            <td style="text-align: right;">${item.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return element;
    },

    calculateSessionDuration(scans) {
        if (scans.length === 0) return '00:00:00';
        
        const times = scans.map(s => new Date(s.timestamp)).sort((a, b) => a - b);
        const start = times[0];
        const end = times[times.length - 1];
        const duration = Math.floor((end - start) / 1000);
        
        const hrs = Math.floor(duration / 3600);
        const mins = Math.floor((duration % 3600) / 60);
        const secs = duration % 60;
        
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    async handleXMLFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        if (!Utils.validateXMLFile(file)) {
            alert('Arquivo inválido. Selecione um arquivo XML.');
            return;
        }

        try {
            const { items, nfInfo } = await Utils.parseXMLNFeFile(file);
            
            if (!items || items.length === 0) {
                alert('Nenhum item válido encontrado no XML.');
                return;
            }

            const existingInvoices = Storage.getXMLInvoices();
            const nfNumber = nfInfo.numeroNF || nfInfo.nfNumber;
            if (existingInvoices.some(inv => inv.nfInfo?.numeroNF === nfNumber)) {
                alert('Esta nota fiscal já foi importada anteriormente.');
                return;
            }

            this.state.pendingXMLImport = { items, nfInfo, fileName: file.name };
            this.showXMLImportPreview(items, nfInfo);

        } catch (error) {
            console.error('Erro ao importar XML:', error);
            alert('Erro ao importar XML: ' + error.message);
        }
    },

    showXMLImportPreview(items, nfInfo) {
        const status = document.getElementById('xml-import-status');
        const preview = document.getElementById('xml-import-preview');
        const previewBody = document.getElementById('xml-import-preview-body');

        status.innerHTML = '';
        previewBody.innerHTML = '';

        Utils.removeClass(status, 'hidden');
        status.className = 'import-result success';
        status.innerHTML = `
            <div><strong>${items.length}</strong> itens encontrados no XML</div>
            <div style="margin-top: 5px; font-size: 0.9rem;">
                Fornecedor: <strong>${nfInfo.fornecedor}</strong><br>
                NF: <strong>${nfInfo.numeroNF}</strong> | Série: <strong>${nfInfo.serie}</strong><br>
                Data: <strong>${nfInfo.dataEmissao}</strong>
            </div>
            <div style="margin-top: 10px; font-weight: bold; color: #28a745;">
                ✓ NF-e carregada com sucesso
            </div>
        `;

        items.slice(0, 10).forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.codigoProduto || '-'}</td>
                <td>${item.ean || '-'}</td>
                <td>${item.description || '-'}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${item.unitValue.toFixed(2)}</td>
                <td style="text-align: right;">${item.totalValue.toFixed(2)}</td>
            `;
            previewBody.appendChild(tr);
        });

        if (items.length > 10) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="text-align: center; font-style: italic;">... e mais ${items.length - 10} itens</td>`;
            previewBody.appendChild(tr);
        }

        Utils.removeClass(preview, 'hidden');
    },

    confirmXMLImport() {
        if (!this.state.pendingXMLImport) return;

        const { items, nfInfo } = this.state.pendingXMLImport;
        let productsCreated = 0;
        let productsUpdated = 0;

        items.forEach(item => {
            const product = {
                Produto: item.description,
                SKU: item.codigoProduto,
                EAN: item.ean,
                Estoque: item.quantity,
                vUnCom: item.unitValue,
                vProd: item.totalValue,
                nfNumber: nfInfo.numeroNF,
                serie: nfInfo.serie,
                emitDate: nfInfo.dataEmissao,
                fornecedorName: nfInfo.fornecedor
            };

            if (Storage.getProduct(item.codigoProduto) || Storage.getProduct(item.ean)) {
                Storage.updateProduct(product);
                productsUpdated++;
            } else {
                Storage.addProduct(product);
                productsCreated++;
            }
        });

        document.getElementById('xml-import-status').classList.add('hidden');
        document.getElementById('xml-import-preview').classList.add('hidden');
        document.getElementById('xml-file-input').value = '';
        
        alert(`Importação concluída!\n${productsCreated} produtos criados\n${productsUpdated} produtos atualizados`);
        
        this.state.pendingXMLImport = null;
    },

    cancelXMLImport() {
        document.getElementById('xml-import-status').classList.add('hidden');
        document.getElementById('xml-import-preview').classList.add('hidden');
        document.getElementById('xml-file-input').value = '';
        this.state.pendingXMLImport = null;
    },

    /**
     * CONFERÊNCIA XML
     */

    updateConferenceTab() {
        if (this.state.conferenceItems.length === 0) {
            const body = document.getElementById('conference-body');
            if (body) body.innerHTML = '';
            return;
        }

        const nfInfo = this.state.pendingXMLImport?.nfInfo || {};
        document.getElementById('conf-fornecedor').textContent = nfInfo.fornecedor || '-';
        document.getElementById('conf-nf').textContent = nfInfo.numeroNF || '-';
        document.getElementById('conf-serie').textContent = nfInfo.serie || '-';
        document.getElementById('conf-data').textContent = nfInfo.dataEmissao || '-';

        this.renderConferenceTable();
        this.updateConferenceSummary();
    },

    renderConferenceTable() {
        const body = document.getElementById('conference-body');
        if (!body) return;

        body.innerHTML = '';

        this.state.conferenceItems.forEach(item => {
            const tr = document.createElement('tr');
            const diff = item.counted - item.expected;
            let diffColor = '';
            if (item.counted === 0) diffColor = 'diff-red';
            else if (diff < 0) diffColor = 'diff-yellow';
            else if (diff === 0) diffColor = 'diff-green';
            else diffColor = 'diff-blue';

            tr.innerHTML = `
                <td>${item.codigoProduto || '-'}</td>
                <td>${item.ean || '-'}</td>
                <td>${item.description || '-'}</td>
                <td style="text-align: right;">${item.expected}</td>
                <td style="text-align: right;">${item.counted}</td>
                <td style="text-align: right;" class="${diffColor}">${diff > 0 ? '+' : ''}${diff}</td>
            `;
            body.appendChild(tr);
        });
    },

    updateConferenceSummary() {
        const expected = this.state.conferenceItems.reduce((sum, item) => sum + item.expected, 0);
        const counted = this.state.conferenceItems.reduce((sum, item) => sum + item.counted, 0);
        const diff = counted - expected;

        document.getElementById('conf-total-expected').textContent = expected;
        document.getElementById('conf-total-counted').textContent = counted;
        document.getElementById('conf-total-diff').textContent = diff;
    },

    startConference() {
        if (!this.state.pendingXMLImport) {
            alert('Carregue um XML primeiro.');
            return;
        }

        this.state.conferenceItems = this.state.pendingXMLImport.items.map(item => ({
            codigoProduto: item.codigoProduto,
            ean: item.ean,
            description: item.description,
            expected: item.quantity,
            counted: 0
        }));

        this.state.conferenceSession = {
            startTime: new Date(),
            operator: this.state.currentOperatorName || this.state.currentUser
        };

        this.showScreen('supervisor-screen');
        this.showTab('conference');
        this.renderConferenceTable();
        this.updateConferenceSummary();

        const input = document.getElementById('conf-barcode-input');
        if (input) input.focus();
    },

    handleConferenceScan(event) {
        if (!this.state.conferenceSession) return;
        if (event.key !== 'Enter') return;

        const barcode = event.target.value.trim();
        if (!barcode) return;

        const item = this.state.conferenceItems.find(i => 
            i.ean === barcode || i.codigoProduto === barcode
        );

        if (item) {
            item.counted += 1;
            this.renderConferenceTable();
            this.updateConferenceSummary();
        }

        event.target.value = '';
        event.target.focus();
    },

    finishConference() {
        if (!this.state.conferenceSession) return;

        const items = this.state.conferenceItems;
        const expected = items.reduce((sum, i) => sum + i.expected, 0);
        const counted = items.reduce((sum, i) => sum + i.counted, 0);
        const diff = counted - expected;

        const report = `Conferência Finalizada\n\n` +
            `Fornecedor: ${this.state.pendingXMLImport?.nfInfo?.fornecedor || '-'}\n` +
            `NF: ${this.state.pendingXMLImport?.nfInfo?.numeroNF || '-'}\n` +
            `Série: ${this.state.pendingXMLImport?.nfInfo?.serie || '-'}\n` +
            `Data: ${this.state.pendingXMLImport?.nfInfo?.dataEmissao || '-'}\n` +
            `Operador: ${this.state.conferenceSession.operator}\n\n` +
            `Total Esperado: ${expected}\n` +
            `Total Contado: ${counted}\n` +
            `Diferença: ${diff > 0 ? '+' : ''}${diff}`;

        alert(report);

        this.state.conferenceItems = [];
        this.state.conferenceSession = null;
        this.state.pendingXMLImport = null;

        const body = document.getElementById('conference-body');
        if (body) body.innerHTML = '';
    },

    /**
     * IMPORTAÇÃO DE EXCEL
     */

    async handleFileUpload(event, importType = 'catalog') {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        try {
            const rows = await Utils.parseExcelFile(file);
            console.log('Importação Excel iniciada:', file.name, 'Tamanho:', file.size, 'Linhas:', rows.length);

            const rowsWithoutCode = rows.filter(row => !this.hasImportCode(row)).length;
            if (rowsWithoutCode > 0) {
                console.warn('Linhas importadas sem código identificável:', rowsWithoutCode);
            }

            if (!rows || rows.length === 0) {
                alert('Arquivo Excel vazio ou inválido.');
                return;
            }

            if (importType === 'quantities') {
                const quantities = rows.map(row => ({
                    ean: Storage.normalizeCode(row.EAN || row.ean || row.SKU || row.sku),
                    sku: Storage.normalizeCode(row.SKU || row.sku),
                    expectedQuantity: Number(Storage.normalizeStock(row.ExpectedQuantity ?? row.expectedQuantity ?? row.Estoque ?? row.Stock))
                })).filter(q => q.ean);
                
                Storage.saveInventoryQuantities(quantities);
                document.getElementById('inventory-qty-file-input').value = '';
                alert(`${quantities.length} quantidades de estoque importadas com sucesso!`);
                this.updateInventoryQuantitiesTab();
                return;
            }

            const hasRequiredFields = rows.some(row => this.hasImportCode(row));

            if (!hasRequiredFields) {
                alert('Arquivo deve conter colunas: EAN, SKU, Produto, Estoque (ou Produto, Stock)');
                return;
            }

            this.state.pendingImport = rows;
            this.showImportPreview(rows);

        } catch (error) {
            console.error('Erro ao importar:', error);
            alert('Erro ao importar arquivo: ' + error.message);
        }
    },

    showImportPreview(rows) {
        const importStatus = document.getElementById('import-status');
        const importResult = document.getElementById('import-result');
        const importPreview = document.getElementById('import-preview');
        const previewBody = document.getElementById('import-preview-body');

        Utils.removeClass(importStatus, 'hidden');

        importResult.className = 'import-result success';
        importResult.textContent = `✅ ${rows.length} produtos encontrados no arquivo. Revise os dados abaixo:`;

        previewBody.innerHTML = '';
        rows.slice(0, 10).forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${Storage.normalizeCode(row.EAN) || Storage.normalizeCode(row.Codigo) || Storage.normalizeCode(row.Código) || '-'}</td>
                <td>${Storage.normalizeCode(row.SKU) || Storage.normalizeCode(row.Codigo) || Storage.normalizeCode(row.Código) || '-'}</td>
                <td>${Storage.normalizeCode(row.Produto) || Storage.normalizeCode(row.Nome) || '-'}</td>
                <td>${Storage.normalizeCode(row.Estoque) || Storage.normalizeCode(row.Stock) || 0}</td>
            `;
            previewBody.appendChild(tr);
        });

        if (rows.length > 10) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align: center; font-style: italic;">... e mais ${rows.length - 10} produtos</td>`;
            previewBody.appendChild(tr);
        }

        Utils.removeClass(importPreview, 'hidden');
    },

    confirmImport() {
        if (!this.state.pendingImport) return;

        const products = this.state.pendingImport.map(row => this.normalizeImportedProduct(row));
        const savedProducts = Storage.saveProducts(products);
        Storage.saveProductCatalog(products);

        console.log("Produtos carregados:", savedProducts.length);
        console.table(savedProducts);

        document.getElementById('import-result').className = 'import-result success';
        document.getElementById('import-result').textContent = `✅ Importação confirmada! ${savedProducts.length} produtos carregados com sucesso.`;

        document.getElementById('import-preview').classList.add('hidden');
        document.getElementById('current-products-count').textContent = `${savedProducts.length} produtos`;

        this.state.pendingImport = null;

        setTimeout(() => {
            document.getElementById('excel-file-input').value = '';
        }, 1000);
    },

    normalizeImportedProduct(row = {}) {
        const ean = Storage.normalizeCode(row.EAN);
        const sku = Storage.normalizeCode(row.SKU);
        const barcode = Storage.normalizeCode(row.Barcode);
        const qrCode = Storage.normalizeCode(row.QRCode);
        const codigo = Storage.normalizeCode(row.Codigo || row.Código);
        const produto = Storage.normalizeCode(row.Produto || row.Nome);
        const categoria = Storage.normalizeCode(row.Categoria || row.Category);
        const localizacao = Storage.normalizeCode(row.Localizacao || row.Localização || row.Local || row.Location);
        const estoque = Storage.normalizeStock(row.Estoque ?? row.Stock);

        return {
            EAN: ean,
            SKU: sku,
            Barcode: barcode,
            QRCode: qrCode,
            Codigo: codigo,
            Código: codigo,
            Produto: produto,
            Nome: produto,
            Estoque: estoque,
            Stock: estoque,
            Categoria: categoria,
            Category: categoria,
            Localizacao: localizacao,
            Localização: localizacao
        };
    },

    hasImportCode(row = {}) {
        return ['EAN', 'SKU', 'Barcode', 'QRCode', 'Codigo', 'Código']
            .some(key => Storage.normalizeCode(row?.[key]));
    },

    cancelImport() {
        document.getElementById('import-status').classList.add('hidden');
        document.getElementById('import-preview').classList.add('hidden');
        document.getElementById('excel-file-input').value = '';
        this.state.pendingImport = null;
    },

    /**
     * EXPORTAÇÃO
     */

    exportToExcel() {
        const products = Storage.getProducts() || [];

        if (products.length === 0) {
            alert('Nenhum produto para exportar.');
            return;
        }

        Utils.createExcelFromData(products, `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    exportToCSV() {
        const scans = Storage.getScans() || [];

        if (scans.length === 0) {
            alert('Nenhum registro para exportar.');
            return;
        }

        const csvData = Storage.exportToCSV(scans);
        Storage.downloadCSV(csvData, `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    },

    exportToPDF() {
        const scans = Storage.getScans() || [];
        if (scans.length === 0) {
            alert('Nenhum registro para exportar.');
            return;
        }

        const element = document.createElement('div');
        element.style.padding = '20px';
        element.innerHTML = `
            <h1>Relatório de Inventário</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            <p>Total de Registros: ${scans.length}</p>
            <table border="1" cellpadding="10" style="width: 100%; margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Colaborador</th>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>EAN</th>
                        <th>Local</th>
                    </tr>
                </thead>
                <tbody>
                    ${scans.map(s => `
                        <tr>
                            <td>${new Date(s.timestamp).toLocaleString('pt-BR')}</td>
                            <td>${Storage.normalizeCode(s.collaborator)}</td>
                            <td>${Storage.normalizeCode(s.product)}</td>
                            <td>${Storage.normalizeCode(s.sku)}</td>
                            <td>${Storage.normalizeCode(s.ean)}</td>
                            <td>${this.getLocationLabel(s.location)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.body.appendChild(element);

        const opt = {
            margin: 10,
            filename: `inventario_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
        }).catch(err => {
            document.body.removeChild(element);
            console.error('PDF export error:', err);
            alert('Erro ao gerar PDF: ' + err.message);
        });
    },

    /**
     * GOOGLE SHEETS INTEGRATION
     */

    async connectGoogleSheets(config) {
        const gsheetUrl = config.gsheetUrl;
        const clientId = config.clientId;
        
        try {
            const response = await fetch(gsheetUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch Google Sheet');
            }
            
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            Storage.saveGoogleSheetsConfig({
                gsheetUrl,
                clientId,
                connected: true
            });
            
            return { success: true };
        } catch (error) {
            console.error('Google Sheets connection error:', error);
            return { success: false, error: error.message };
        }
    },

    async syncGoogleSheets() {
        const config = Storage.getGoogleSheetsConfig();
        if (!config?.gsheetUrl) {
            return { success: false, error: 'Not configured' };
        }
        
        try {
            const response = await fetch(config.gsheetUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            const sheets = doc.querySelectorAll('sheet');
            if (sheets.length < 2) {
                return { success: false, error: 'Invalid sheet structure' };
            }
            
            const productCatalog = this.parseSheetData(sheets[0]);
            const inventoryQuantities = this.parseSheetData(sheets[1]);
            
            Storage.saveProductCatalog(productCatalog);
            Storage.saveInventoryQuantities(inventoryQuantities);
            
            Storage.saveGoogleSheetsConfig({ ...config, lastSync: new Date().toISOString() });
            
            return { 
                success: true, 
                products: productCatalog.length, 
                quantities: inventoryQuantities.length 
            };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, error: error.message };
        }
    },

    parseSheetData(sheet) {
        const rows = [];
        const trs = sheet.querySelectorAll('tr');
        const headers = [...trs[0].querySelectorAll('th, td')].map(th => th.textContent.trim());
        
        for (let i = 1; i < trs.length; i++) {
            const cells = [...trs[i].querySelectorAll('td')];
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = cells[idx] ? cells[idx].textContent.trim() : '';
            });
            if (Object.values(row).some(v => v)) {
                rows.push(row);
            }
        }
        return rows;
    },

    /**
     * MANUAL INVOICE ENTRY
     */

    createManualInvoice(invoiceData) {
        const invoice = {
            ...invoiceData,
            id: Storage.generateId(),
            items: invoiceData.items || [],
            createdAt: new Date().toISOString(),
            createdBy: this.state.currentUser
        };
        
        const saved = Storage.saveManualInvoice(invoice);
        return saved[saved.length - 1];
    },

    /**
     * MULTIPLE XML INVOICES
     */

    async handleMultipleXMLFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const results = [];
        for (const file of files) {
            try {
                const { items, nfInfo } = await Utils.parseXMLNFeFile(file);
                if (items && items.length > 0) {
                    const invoiceId = Storage.generateId();
                    results.push({
                        id: invoiceId,
                        items,
                        nfInfo: { ...nfInfo, numeroNF: nfInfo.numeroNF || nfInfo.nfNumber },
                        fileName: file.name,
                        uploadedAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }
        
        if (results.length > 0) {
            this.state.pendingMultipleXMLImports = results;
            this.showMultipleXMLPreview(results);
        }
    },

    showMultipleXMLPreview(invoices) {
        const status = document.getElementById('xml-import-status');
        const preview = document.getElementById('xml-import-preview');
        const previewBody = document.getElementById('xml-import-preview-body');
        
        status.innerHTML = '';
        previewBody.innerHTML = '';
        
        Utils.removeClass(status, 'hidden');
        status.className = 'import-result success';
        status.innerHTML = `
            <div><strong>${invoices.length}</strong> nota(s) fiscal(is) carregada(s)</div>
            <div style="margin-top: 5px; font-size: 0.9rem;">
                Total de <strong>${invoices.reduce((sum, inv) => sum + inv.items.length, 0)}</strong> itens encontrados
            </div>
        `;
        
        invoices.forEach(invoice => {
            const card = document.createElement('div');
            card.className = 'invoice-preview-card';
            card.innerHTML = `
                <div class="invoice-header">
                    <strong>NF ${invoice.nfInfo.numeroNF || invoice.nfInfo.nfNumber}</strong>
                    <span>Série: ${invoice.nfInfo.serie || '-'}</span>
                </div>
                <div class="invoice-details">
                    <div>Fornecedor: ${invoice.nfInfo.fornecedor || '-'}</div>
                    <div>Data: ${invoice.nfInfo.dataEmissao || '-'}</div>
                    <div>Itens: ${invoice.items.length}</div>
                    <div>Total: R$ ${invoice.items.reduce((sum, item) => sum + (item.totalValue || 0), 0).toFixed(2)}</div>
                </div>
            `;
            previewBody.appendChild(card);
        });
        
        Utils.removeClass(preview, 'hidden');
    },

    confirmMultipleXMLImport() {
        if (!this.state.pendingMultipleXMLImports) return;
        
        this.state.pendingMultipleXMLImports.forEach(invoice => {
            Storage.saveXMLInvoice({
                id: invoice.id,
                ...invoice
            });
        });
        
        document.getElementById('xml-import-status').classList.add('hidden');
        document.getElementById('xml-import-preview').classList.add('hidden');
        document.getElementById('xml-file-input').value = '';
        
        alert(`${this.state.pendingMultipleXMLImports.length} notas fiscais importadas com sucesso!`);
        this.state.pendingMultipleXMLImports = null;
    },

    /**
     * RECONCILIATION MODULE
     */

    updateReconciliationTab() {
        const discrepancies = Storage.getReconciliationData();
        const tbody = document.getElementById('reconciliation-body');
        
        if (tbody) {
            tbody.innerHTML = '';
            discrepancies.forEach(disc => {
                const row = document.createElement('tr');
                const diffColor = disc.type === 'shortage' ? 'diff-red' : 'diff-green';
                row.innerHTML = `
                    <td>${Storage.normalizeCode(disc.sku)}</td>
                    <td>${disc.ean}</td>
                    <td>${disc.scanned}</td>
                    <td>${disc.expected}</td>
                    <td class="${diffColor}"><strong>${disc.difference > 0 ? '+' : ''}${disc.difference}</strong></td>
                    <td>${disc.type === 'shortage' ? '❌ Falta' : '✅ Sobra'}</td>
                `;
                tbody.appendChild(row);
            });
        }
    },

    /**
     * BOX/PACKAGE COUNTING
     */

    getUnitConversion(product) {
        const boxQty = Number(Storage.normalizeCode(product.QuantidadePorCaixa || product.QtdPorCaixa || 0));
        const bundleQty = Number(Storage.normalizeCode(product.QuantidadePorMalote || product.QtdPorMalote || 0));
        const packageQty = Number(Storage.normalizeCode(product.QuantidadePorPacote || product.QtdPorPacote || 0));
        
        return {
            unit: 1,
            box: boxQty > 0 ? boxQty : 1,
            bundle: bundleQty > 0 ? bundleQty : 1,
            package: packageQty > 0 ? packageQty : 1
        };
    },

    /**
     * UTILITÁRIOS
     */

    getLocationLabel(location) {
        const labels = {
            'main': 'Estoque Principal',
            'warehouse-a': 'Almoxarifado A',
            'warehouse-b': 'Almoxarifado B'
        };
        return labels[location] || location;
    },

    showError(message) {
        console.error('❌ Erro:', message);
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            Utils.show(errorDiv);
            setTimeout(() => Utils.hide(errorDiv), 3000);
        }
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
