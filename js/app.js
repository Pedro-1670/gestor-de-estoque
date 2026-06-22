/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * app.js - Lógica Principal da Aplicação
 * 
 * Gerencia toda a lógica de funcionamento, desde login até exportações
 */

const App = {
    // Estado da aplicação
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
        bipagemReportRows: []
    },

    permissions: {
        supervisor: ['dashboard', 'history', 'divergences', 'not-inventoried', 'import', 'import-xml', 'reports', 'config'],
        operator: ['bipagem', 'history']
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
        document.getElementById('finish-bipagem')?.addEventListener('click', () => this.showBipagemReportModal());
        document.getElementById('finish-inventory')?.addEventListener('click', () => this.finishInventory());

        // Supervisor - Navegação de tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTabSwitch(e));
        });

        // Supervisor - Importação
        document.getElementById('excel-file-input')?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('confirm-import')?.addEventListener('click', () => this.confirmImport());
        document.getElementById('cancel-import')?.addEventListener('click', () => this.cancelImport());
        document.getElementById('xml-file-input')?.addEventListener('change', (e) => this.handleXMLFileUpload(e));

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

        // Relatório de bipagem
        document.getElementById('export-bipagem-xlsx')?.addEventListener('click', () => this.exportBipagemReportXLSX());
        document.getElementById('export-bipagem-csv')?.addEventListener('click', () => this.exportBipagemReportCSV());
        document.getElementById('close-bipagem-report')?.addEventListener('click', () => this.closeBipagemReportModal());

        // Supervisor - Filtros
        document.getElementById('apply-filters')?.addEventListener('click', () => this.applyFilters());

        // Modal
        document.getElementById('finish-return-login')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('finish-continue')?.addEventListener('click', () => this.closeFinishModal());

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
        document.getElementById('login-form').reset();
        document.getElementById('operator-start-form').reset();
        this.hideLoginMessage();
        this.hideOperatorMessage();
        this.showOperatorStartForm();
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
        document.getElementById('operator-name-input').focus();
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
            time: now.toLocaleTimeString('pt-BR')
        };

        Storage.addScan(scan);
        this.state.sessionScans.push(scan);

        this.showProductInfo(product, scan);
        this.updateOperatorDashboard();
        this.updateHistoryTable();
    },

    showProductInfo(product, scan) {
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
                <td>${scan.collaborator}</td>
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

        // Preencher modal
        document.getElementById('summary-collaborator').textContent = this.state.currentUser;
        document.getElementById('summary-start-time').textContent = this.state.sessionStartTime.toLocaleTimeString('pt-BR');
        document.getElementById('summary-end-time').textContent = endTime.toLocaleTimeString('pt-BR');
        document.getElementById('summary-total-time').textContent = Utils.formatTime(duration);
        document.getElementById('summary-items').textContent = this.state.sessionScans.length;
        document.getElementById('summary-unique').textContent = uniqueProducts;

        // Mostrar modal nativo
        document.getElementById('finish-modal').showModal();

        // Parar timer
        clearInterval(this.state.sessionTimer);
    },

    closeFinishModal() {
        document.getElementById('finish-modal').close();
        document.getElementById('barcode-input').focus();
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
    },

    exportBipagemReportCSV() {
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
    },

    closeBipagemReportModal() {
        document.getElementById('bipagem-report-modal').close();
        document.getElementById('barcode-input').focus();
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
            case 'divergences':
                this.updateDiscrepanciesTab();
                break;
            case 'not-inventoried':
                this.updateNotInventoriedTab();
                break;
            case 'import':
                this.updateImportTab();
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
        document.getElementById('current-products-count').textContent = `${products.length} produtos`;
    },

    /**
     * IMPORTAÇÃO DE EXCEL
     */

    async handleFileUpload(event) {
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

            // Validar estrutura
            const hasRequiredFields = rows.some(row => this.hasImportCode(row));

            if (!hasRequiredFields) {
                alert('Arquivo deve conter colunas: EAN, SKU, Produto, Estoque (ou Produto, Stock)');
                return;
            }

            // Armazenar para confirmação
            this.state.pendingImport = rows;

            // Mostrar prévia
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

        const opt = {
            margin: 10,
            filename: `inventario_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(element).save();
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
