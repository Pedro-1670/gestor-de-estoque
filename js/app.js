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
        manualInvoiceItems: [],
        // NF Conference state
        loadedNF: null,
        nfConferenceItems: [],
        nfConfirmedCount: 0,
        nfExcessCount: 0,
        nfDivergenceCount: 0
    },

    permissions: {
        supervisor: ['dashboard', 'history', 'divergences', 'data-import', 'invoices', 'reports', 'config'],
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

        const products = DataService.getProducts() || [];
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
        document.getElementById('load-nf-btn')?.addEventListener('click', () => this.loadNFConference());
        document.getElementById('cancel-nf-btn')?.addEventListener('click', () => this.cancelNFConference());
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

        // Supervisor - Dados/Importação
        document.getElementById('excel-file-input')?.addEventListener('change', (e) => this.handleFileUpload(e, 'catalog'));
        document.getElementById('inventory-qty-file-input')?.addEventListener('change', (e) => this.handleFileUpload(e, 'quantities'));
        document.getElementById('confirm-import')?.addEventListener('click', () => this.confirmImport());
        document.getElementById('cancel-import')?.addEventListener('click', () => this.cancelImport());
        document.getElementById('xml-file-input')?.addEventListener('change', (e) => this.handleXMLFileUpload(e));
        document.getElementById('confirm-xml-import')?.addEventListener('click', () => this.confirmXMLImport());
        document.getElementById('cancel-xml-import')?.addEventListener('click', () => this.cancelXMLImport());

        // Supervisor - Conector único de Google Sheets (Catálogo, Quantidades, Base de Estoque)
        document.querySelectorAll('[data-sheet-target]').forEach(btn => {
            btn.addEventListener('click', () => this.importFromGoogleSheet(btn.dataset.sheetTarget));
        });

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
        document.getElementById('divergence-type-filter')?.addEventListener('change', () => this.renderDivergencesTable());

        // Notas Fiscais - alternância entre sub-abas (Importar XML / Nota Manual)
        document.querySelectorAll('.invoice-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showInvoiceSubtab(btn.dataset.subtab));
        });

        // Manual Invoice
        document.getElementById('add-invoice-item')?.addEventListener('click', () => this.addManualInvoiceItem());
        document.getElementById('save-manual-invoice')?.addEventListener('click', () => this.saveManualInvoice());

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
        this.showScreen('login-screen');
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

        if (this.state.loadedNF) {
            this.handleNFConferenceBarcodeScan(codigo);
            this.resetBarcodeInput();
            return;
        }

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

    /**
     * Durante a conferência de NF, o código bipado pode pertencer a um item
     * da nota que nunca foi cadastrado no catálogo de produtos (comum em
     * notas manuais). Por isso a busca prioriza os itens da NF carregada -
     * o catálogo só é usado para enriquecer a exibição (estoque, categoria).
     * Só mostra "produto não encontrado" quando o código não bate nem com o
     * catálogo nem com nenhum item da NF.
     */
    handleNFConferenceBarcodeScan(codigo) {
        const normalizedCode = Storage.normalizeCode(codigo);
        const produto = Storage.getProduct(codigo);

        const nfItem = this.state.nfConferenceItems.find(item => {
            if (item.ean && item.ean === normalizedCode) return true;
            if (item.codigoProduto && item.codigoProduto === normalizedCode) return true;
            if (produto) {
                const productEan = Storage.getProductPrimaryCode(produto);
                const productSku = Storage.normalizeCode(produto.SKU);
                if (item.ean && item.ean === productEan) return true;
                if (item.codigoProduto && item.codigoProduto === productSku) return true;
            }
            return false;
        });

        if (!produto && !nfItem) {
            this.showProductError(this.getProductNotFoundMessage(codigo));
            return;
        }

        // Produto "virtual" montado a partir do item da NF quando ele não
        // existe no catálogo (ex: nota fiscal manual referenciando um EAN
        // que ainda não foi importado como produto).
        const effectiveProduct = produto || {
            SKU: nfItem.codigoProduto || '',
            EAN: nfItem.ean || normalizedCode,
            Produto: nfItem.description || 'Produto da Nota (não cadastrado no catálogo)'
        };

        this.recordNFConferenceScan(effectiveProduct, codigo);
    },

    recordNFConferenceScan(product, codigo) {
        const now = new Date();
        const ean = Storage.normalizeCode(product.EAN) || Storage.getProductPrimaryCode(product);
        const sku = Storage.normalizeCode(product.SKU);

        const nfItem = this.state.nfConferenceItems.find(i => 
            i.ean === ean || i.codigoProduto === sku
        );

        const scan = {
            collaborator: this.state.currentOperatorName || this.state.currentUser,
            operatorName: this.state.currentOperatorName || this.state.currentUser,
            operatorDate: this.state.currentOperatorDate,
            operatorTime: this.state.currentOperatorTime,
            product: Storage.getProductDisplayName(product),
            sku: sku,
            ean: ean,
            barcode: Storage.normalizeCode(codigo),
            stock: Storage.getProductStock(product),
            category: Storage.getProductCategory(product),
            timestamp: now.toISOString(),
            time: now.toLocaleTimeString('pt-BR'),
            bipagemType: this.getCurrentBipagemType(),
            quantity: 1
        };

        if (!nfItem) {
            scan.nfStatus = 'divergence';
            this.state.nfDivergenceCount++;
            this.showNFStatusMessage('🔴 Produto não encontrado nesta Nota Fiscal', 'error');
        } else {
            const wasComplete = nfItem.countedQuantity >= nfItem.expectedQuantity;
            nfItem.countedQuantity++;
            
            if (nfItem.countedQuantity > nfItem.expectedQuantity) {
                scan.nfStatus = 'excess';
                this.state.nfExcessCount++;
                this.showNFStatusMessage('🟡 Quantidade excedida', 'warning');
            } else if (wasComplete) {
                scan.nfStatus = 'excess';
                this.showNFStatusMessage('🟡 Quantidade excedida', 'warning');
            } else {
                scan.nfStatus = 'ok';
                if (nfItem.countedQuantity >= nfItem.expectedQuantity) {
                    this.state.nfConfirmedCount++;
                }
                this.showNFStatusMessage('🟢 Produto localizado na Nota', 'success');
            }
        }

        Storage.addScan(scan);
        this.state.sessionScans.push(scan);

        this.showProductInfo(product, scan);
        this.updateOperatorDashboard();
        this.updateHistoryTable();
        this.updateNFInfoPanel();

        const allComplete = this.state.nfConferenceItems.every(i => 
            i.countedQuantity >= i.expectedQuantity
        );
        if (allComplete && this.state.nfConferenceItems.length > 0) {
            this.showNFCompletedModal();
        }
    },

    showNFCompletedModal() {
        const totalItems = this.state.nfConferenceItems.length;
        const confirmedItems = this.state.nfConferenceItems.filter(i => 
            i.countedQuantity >= i.expectedQuantity
        ).length;
        const confirmedCount = this.state.nfConferenceItems.reduce((sum, i) => sum + i.countedQuantity, 0);
        const missingCount = this.state.nfConferenceItems.reduce((sum, i) => 
            sum + Math.max(0, i.expectedQuantity - i.countedQuantity), 0
        );

const modalHtml = `
            <div class="modal" id="nf-completed-modal" open>
                <div class="modal-content">
                    <h2>✅ Conferência concluída</h2>
                    <div class="nf-completed-details">
                        <dl class="summary-list">
                            <dt>Itens esperados:</dt>
                            <dd>${totalItems}</dd>
                            <dt>Itens conferidos:</dt>
                            <dd>${confirmedCount}</dd>
                            <dt>Divergências:</dt>
                            <dd>${this.state.nfDivergenceCount}</dd>
                            <dt>Excedentes:</dt>
                            <dd>${this.state.nfExcessCount}</dd>
                            <dt>Faltantes:</dt>
                            <dd>${missingCount}</dd>
                        </dl>
                    </div>
                    <div class="modal-actions">
                        <button id="close-nf-modal" class="btn btn--secondary btn--large">Fechar</button>
                        <button id="finalize-nf-conference" class="btn btn--success btn--large">Finalizar Conferência</button>
                    </div>
                </div>
            </div>
        `;
        
        const existing = document.getElementById('nf-completed-modal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        document.getElementById('close-nf-modal').onclick = () => {
            document.getElementById('nf-completed-modal').remove();
        };
        
        document.getElementById('finalize-nf-conference').onclick = () => {
            this.finalizeNFConference();
        };
    },

    finalizeNFConference() {
        const modal = document.getElementById('nf-completed-modal');
        if (modal) modal.remove();

        const endTime = new Date();
        const duration = Math.floor((endTime - this.state.sessionStartTime) / 1000);
        
        const nfScans = this.state.sessionScans.filter(s => s.nfStatus);
        
        Storage.saveNFCconferenceReport({
            operator: this.state.currentOperatorName || this.state.currentUser,
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR'),
            duration: duration,
            itemsScanned: nfScans.length,
            divergences: this.state.nfDivergenceCount,
            excesses: this.state.nfExcessCount,
            nfInfo: this.state.loadedNF?.nfInfo,
            scans: nfScans
        });

        this.state.loadedNF = null;
        this.state.nfConferenceItems = [];
        this.state.nfConfirmedCount = 0;
        this.state.nfExcessCount = 0;
        this.state.nfDivergenceCount = 0;

        this.showNFControls(false);
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

    loadNFConference() {
        const fornecedor = document.getElementById('nf-fornecedor-input').value.trim();
        const nfNumber = document.getElementById('nf-number-input').value.trim();
        const conferenceCode = document.getElementById('nf-code-input').value.trim();

        let conference = null;

        const invoices = Storage.getXMLInvoices() || [];

        if (conferenceCode) {
            conference = invoices.find(inv => inv.conferenceCode === conferenceCode || inv.id === conferenceCode);
        } else if (nfNumber && fornecedor) {
            conference = invoices.find(inv => 
                inv.nfInfo?.numeroNF === nfNumber && 
                inv.nfInfo?.fornecedor?.toLowerCase().includes(fornecedor.toLowerCase())
            );
        } else if (nfNumber) {
            conference = invoices.find(inv => inv.nfInfo?.numeroNF === nfNumber);
        } else if (fornecedor) {
            conference = invoices.find(inv => 
                inv.nfInfo?.fornecedor?.toLowerCase().includes(fornecedor.toLowerCase())
            );
        }

        if (!conference || !conference.items || conference.items.length === 0) {
            this.showProductError('Nota Fiscal não encontrada. Verifique os dados informados.');
            return;
        }

        this.state.loadedNF = conference;
        this.state.nfConferenceItems = conference.items.map(item => ({
            codigoProduto: item.codigoProduto || item.SKU,
            ean: item.ean || item.EAN,
            description: item.description || item.Produto,
            expectedQuantity: Number(item.quantity) || Number(item.Quantidade) || 0,
            countedQuantity: 0
        }));
        this.state.nfConfirmedCount = 0;
        this.state.nfExcessCount = 0;
        this.state.nfDivergenceCount = 0;

        this.updateNFInfoPanel();
        this.showNFControls(true);
        this.updateHistoryTable();
    },

    updateNFInfoPanel() {
        const panel = document.getElementById('nf-info-panel');
        if (!panel || !this.state.loadedNF) return;

        const totalItems = this.state.nfConferenceItems.length;
        const confirmedItems = this.state.nfConferenceItems.filter(i => i.countedQuantity >= i.expectedQuantity).length;
        const confirmedCount = this.state.nfConferenceItems.reduce((sum, i) => sum + i.countedQuantity, 0);
        const pendingCount = totalItems - confirmedItems;

        Utils.show(panel);

        document.getElementById('nf-display-fornecedor').textContent = this.state.loadedNF.nfInfo?.fornecedor || '-';
        document.getElementById('nf-display-nf').textContent = this.state.loadedNF.nfInfo?.numeroNF || '-';
        document.getElementById('nf-display-items').textContent = totalItems;
        document.getElementById('nf-display-confirmed').textContent = confirmedCount;
        document.getElementById('nf-display-pending').textContent = pendingCount;

        const percent = totalItems > 0 ? Math.round((confirmedItems / totalItems) * 100) : 0;
        const fill = document.getElementById('nf-progress-fill');
        const percentEl = document.getElementById('nf-progress-percent');
        if (fill) fill.style.width = `${percent}%`;
        if (percentEl) percentEl.textContent = `${percent}%`;
    },

    showNFControls(show) {
        const section = document.getElementById('nf-conference-section');
        const panel = document.getElementById('nf-info-panel');
        if (show) {
            Utils.hide(section);
            Utils.show(panel);
        } else {
            Utils.show(section);
            Utils.hide(panel);
        }
    },

    cancelNFConference() {
        if (!this.state.loadedNF) return;

        if (!confirm('Sair da conferência desta Nota Fiscal? As bipagens já registradas continuam no histórico da sessão, mas a conferência não será marcada como finalizada.')) {
            return;
        }

        this.state.loadedNF = null;
        this.state.nfConferenceItems = [];
        this.state.nfConfirmedCount = 0;
        this.state.nfExcessCount = 0;
        this.state.nfDivergenceCount = 0;

        document.getElementById('nf-fornecedor-input').value = '';
        document.getElementById('nf-number-input').value = '';
        document.getElementById('nf-code-input').value = '';

        this.showNFControls(false);
        this.updateHistoryTable();
        document.getElementById('barcode-input')?.focus();
    },

    getNFItemStatus(scan) {
        if (!this.state.loadedNF) return '';

        const ean = Storage.normalizeCode(scan.ean);
        const sku = Storage.normalizeCode(scan.sku);

        const item = this.state.nfConferenceItems.find(i => 
            i.ean === ean || i.codigoProduto === sku
        );

        if (!item) return '❌ Não pertence à NF';

        if (scan.nfStatus === 'excess') return '⚠ Excedente';
        if (scan.nfStatus === 'ok') return '✔ OK';

        return '';
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

    showNFStatusMessage(message, type = 'info') {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        errorMessage.className = `error-message ${type}`;
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
            const status = this.getNFItemStatus(scan);
            const statusClass = status.includes('OK') ? 'status-ok' : 
                              status.includes('Excedente') ? 'status-excess' : 
                              status.includes('Não pertence') ? 'status-divergence' : '';
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
                <td class="${statusClass}">${status}</td>
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
        this.state.loadedNF = null;
        this.state.nfConferenceItems = [];
        this.state.nfConfirmedCount = 0;
        this.state.nfExcessCount = 0;
        this.state.nfDivergenceCount = 0;
        
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
        const typeLabels = { 'not-inventoried': 'Não Inventariado', excess: 'Sobra', shortage: 'Falta' };
        const divergences = Storage.getUnifiedDivergences().filter(d => d.type !== 'ok');
        const data = divergences.map(d => ({
            SKU: d.sku || '',
            EAN: d.ean,
            Produto: d.product,
            Esperado: d.expected,
            Contado: d.counted,
            Diferença: d.difference,
            Tipo: typeLabels[d.type] || d.type
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
            case 'divergences':
                this.updateDivergencesTab();
                break;
            case 'data-import':
                this.updateDataImportTab();
                break;
            case 'invoices':
                this.updateManualInvoiceTab();
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

    updateDivergencesTab() {
        this.renderDivergencesTable();
    },

    renderDivergencesTable() {
        const tbody = document.getElementById('divergences-body');
        if (!tbody) return;

        const filterSelect = document.getElementById('divergence-type-filter');
        const filterType = filterSelect ? filterSelect.value : 'all';

        const typeLabels = {
            'not-inventoried': '📦 Não Inventariado',
            excess: '✅ Sobra',
            shortage: '❌ Falta'
        };

        const divergences = Storage.getUnifiedDivergences()
            .filter(div => div.type !== 'ok')
            .filter(div => filterType === 'all' || div.type === filterType);

        tbody.innerHTML = '';
        divergences.forEach(div => {
            const row = document.createElement('tr');
            row.classList.add(div.type);
            row.innerHTML = `
                <td>${Storage.normalizeCode(div.sku)}</td>
                <td>${Storage.normalizeCode(div.ean)}</td>
                <td>${Storage.normalizeCode(div.product)}</td>
                <td>${div.expected}</td>
                <td>${div.counted}</td>
                <td><strong>${div.difference > 0 ? '+' : ''}${div.difference}</strong></td>
                <td>${typeLabels[div.type] || div.type}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateDataImportTab() {
        const products = Storage.getProducts() || [];

        const currentCountEl = document.getElementById('current-products-count');
        if (currentCountEl) currentCountEl.textContent = `${products.length} produtos no sistema`;

        const stockBaseCountEl = document.getElementById('stock-base-count');
        if (stockBaseCountEl) {
            const stockBaseCount = (DataService.getStockBase() || []).length;
            stockBaseCountEl.textContent = `${stockBaseCount.toLocaleString('pt-BR')} produtos na Base de Estoque`;
        }

        this.renderCatalogTable();
        this.renderQuantitiesTable();
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

    renderCatalogTable() {
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

    renderQuantitiesTable() {
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

    showInvoiceSubtab(name) {
        document.querySelectorAll('.invoice-subtab-btn').forEach(btn => {
            const isActive = btn.dataset.subtab === name;
            btn.classList.toggle('invoice-subtab-btn--active', isActive);
            btn.classList.toggle('btn--primary', isActive);
            btn.classList.toggle('btn--secondary', !isActive);
        });
        document.querySelectorAll('.invoice-subtab').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `invoice-subtab-${name}`);
        });
    },

    /**
     * Conector único de Google Sheets, reaproveitado pelas 3 seções da aba
     * Dados/Importação (Catálogo, Quantidades, Base de Estoque). `target`
     * define qual método do DataService chamar e onde salvar o resultado -
     * o restante (ler inputs, mostrar status, tratar erro) é compartilhado.
     */
    async importFromGoogleSheet(target) {
        const idInput = document.getElementById(`sheet-${target}-id`);
        const nameInput = document.getElementById(`sheet-${target}-name`);
        const statusEl = document.getElementById(`sheet-${target}-status`);
        const resultEl = document.getElementById(`sheet-${target}-result`);
        const btn = document.querySelector(`[data-sheet-target="${target}"]`);

        if (!idInput || !nameInput || !statusEl || !resultEl) return;

        const spreadsheetId = idInput.value.trim();
        const sheetName = nameInput.value.trim();

        Utils.removeClass(statusEl, 'hidden');
        resultEl.className = 'import-result';
        resultEl.textContent = '⏳ Importando...';

        if (btn) {
            btn.disabled = true;
            btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
            btn.textContent = '⏳ Importando...';
        }

        try {
            let resultado;

            if (target === 'catalog') {
                resultado = await DataService.importProductCatalogFromSheet(spreadsheetId, sheetName);
                if (resultado.success) {
                    Storage.saveProductCatalog(resultado.products);
                    this.renderCatalogTable();
                }
            } else if (target === 'quantities') {
                resultado = await DataService.importInventoryQuantitiesFromSheet(spreadsheetId, sheetName);
                if (resultado.success) {
                    Storage.saveInventoryQuantities(resultado.quantities);
                    this.renderQuantitiesTable();
                }
            } else {
                resultado = await DataService.importStockBase(spreadsheetId, sheetName);
                if (resultado.success) {
                    const countEl = document.getElementById('stock-base-count');
                    if (countEl) countEl.textContent = `${DataService.getStockBase().length.toLocaleString('pt-BR')} produtos na Base de Estoque`;
                }
            }

            if (resultado.success) {
                resultEl.className = 'import-result success';
                resultEl.textContent = `✅ ${resultado.message} ${resultado.count.toLocaleString('pt-BR')} itens carregados.`;
            } else {
                resultEl.className = 'import-result error';
                resultEl.textContent = `❌ ${resultado.message}`;
            }
        } catch (error) {
            // Rede de segurança extra: os métodos do DataService já não lançam exceções
            console.error(`Erro inesperado ao importar (${target}):`, error);
            resultEl.className = 'import-result error';
            resultEl.textContent = '❌ Erro inesperado ao importar. Tente novamente.';
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText || '🔗 Importar do Google Sheets';
            }
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
     * IMPORTAÇÃO DE EXCEL
     */

    async handleFileUpload(event, importType = 'catalog') {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        try {
            const rows = await Utils.parseExcelFile(file);
            console.log('Importação Excel iniciada:', file.name, 'Tamanho:', file.size, 'Linhas:', rows.length);

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
                this.renderQuantitiesTable();
                return;
            }

            // Não bloqueia a importação por causa da estrutura da planilha: os
            // cabeçalhos já passam por reconhecimento flexível (Utils.normalizeExcelHeader)
            // e, na falta de qualquer código identificável, uma linha ainda assim é
            // importada com um código gerado automaticamente (ver normalizeImportedProduct).
            const rowsWithoutCode = rows.filter(row => !this.hasImportCode(row)).length;
            if (rowsWithoutCode > 0) {
                console.warn('Linhas importadas sem código identificável (código será gerado automaticamente):', rowsWithoutCode);
            }

            this.state.pendingImport = rows;
            this.showImportPreview(rows, rowsWithoutCode);

        } catch (error) {
            console.error('Erro ao importar:', error);
            alert('Erro ao importar arquivo: ' + error.message);
        }
    },

    showImportPreview(rows, rowsWithoutCode = 0) {
        const importStatus = document.getElementById('import-status');
        const importResult = document.getElementById('import-result');
        const importPreview = document.getElementById('import-preview');
        const previewBody = document.getElementById('import-preview-body');

        Utils.removeClass(importStatus, 'hidden');

        importResult.className = 'import-result success';
        importResult.textContent = rowsWithoutCode > 0
            ? `✅ ${rows.length} produtos encontrados no arquivo. ${rowsWithoutCode} sem EAN/SKU reconhecido - um código será gerado automaticamente para eles. Revise os dados abaixo:`
            : `✅ ${rows.length} produtos encontrados no arquivo. Revise os dados abaixo:`;

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

        const products = this.state.pendingImport.map((row, index) => this.normalizeImportedProduct(row, index));
        const savedProducts = Storage.saveProducts(products);
        Storage.saveProductCatalog(products);

        console.log("Produtos carregados:", savedProducts.length);
        console.table(savedProducts);

        document.getElementById('import-result').className = 'import-result success';
        document.getElementById('import-result').textContent = `✅ Importação confirmada! ${savedProducts.length} produtos carregados com sucesso.`;

        document.getElementById('import-preview').classList.add('hidden');
        document.getElementById('current-products-count').textContent = `${savedProducts.length} produtos`;
        this.renderCatalogTable();

        this.state.pendingImport = null;

        setTimeout(() => {
            document.getElementById('excel-file-input').value = '';
        }, 1000);
    },

    normalizeImportedProduct(row = {}, index = 0) {
        const ean = Storage.normalizeCode(row.EAN);
        const sku = Storage.normalizeCode(row.SKU);
        const barcode = Storage.normalizeCode(row.Barcode);
        const qrCode = Storage.normalizeCode(row.QRCode);
        const codigo = Storage.normalizeCode(row.Codigo || row.Código);
        const produto = Storage.normalizeCode(row.Produto || row.Nome);
        const categoria = Storage.normalizeCode(row.Categoria || row.Category);
        const localizacao = Storage.normalizeCode(row.Localizacao || row.Localização || row.Local || row.Location);
        const estoque = Storage.normalizeStock(row.Estoque ?? row.Stock);

        // Planilhas sem nenhuma coluna de código reconhecida ainda são
        // importadas: gera um código sequencial só para o produto poder
        // aparecer no catálogo (não vai casar com nenhum código de barras real).
        const hasAnyCode = ean || sku || barcode || qrCode || codigo;
        const generatedCode = hasAnyCode ? '' : `AUTO-${index + 1}`;

        return {
            EAN: ean,
            SKU: sku || generatedCode,
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