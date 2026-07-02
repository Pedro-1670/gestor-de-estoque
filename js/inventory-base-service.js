/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * inventory-base-service.js - Base de Estoque (quantidades esperadas)
 *
 * Serviço independente do CatalogService: guarda só a quantidade esperada de
 * estoque por SKU/EAN, usada para comparar com o que foi contado durante o
 * inventário. Nunca compartilha nem sobrescreve dados do catálogo de produtos
 * - são fontes completamente isoladas, cada uma com sua própria conexão.
 */

const InventoryBaseService = {
    PAGE_SIZE: 100,

    /**
     * Todos os registros da base de estoque ativa: {sku, ean, expectedQuantity}.
     * @returns {Array}
     */
    getRecords() {
        return Storage.getInventoryQuantities() || [];
    },

    /**
     * Metadados da conexão ativa (origem, nome, contagem, última sincronização,
     * status), ou null se nenhuma planilha estiver conectada.
     */
    getConnection() {
        return Storage.getInventoryBaseConnection();
    },

    searchRecords(term) {
        const query = Storage.normalizeCode(term).toLowerCase();
        if (!query) {
            return this.getRecords();
        }
        return this.getRecords().filter(record =>
            Storage.normalizeCode(record.sku).toLowerCase().includes(query)
            || Storage.normalizeCode(record.ean).toLowerCase().includes(query)
        );
    },

    /**
     * Uma página da base de estoque (100 registros por página, com filtro de
     * busca opcional) - nunca renderiza a base inteira de uma vez.
     */
    getRecordsPage(page = 1, searchTerm = '') {
        const all = searchTerm ? this.searchRecords(searchTerm) : this.getRecords();
        const totalPages = Math.max(1, Math.ceil(all.length / this.PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const start = (safePage - 1) * this.PAGE_SIZE;

        return {
            items: all.slice(start, start + this.PAGE_SIZE),
            total: all.length,
            totalPages,
            page: safePage
        };
    },

    /**
     * Grava a nova base como única fonte ativa: qualquer base anterior (de
     * QUALQUER origem) é destruída antes da troca. Nunca mexe no catálogo de
     * produtos (serviço completamente independente).
     * @private
     */
    _commit(records, meta) {
        Storage.saveInventoryQuantities([]);
        const saved = Storage.saveInventoryQuantities(records);
        Storage.saveInventoryBaseConnection({
            source: meta.source,
            name: meta.name,
            spreadsheetId: meta.spreadsheetId || null,
            sheetName: meta.sheetName || null,
            fileName: meta.fileName || null,
            recordCount: saved.length,
            lastSyncAt: new Date().toISOString(),
            status: 'ok'
        });
        return saved;
    },

    /**
     * Carrega a base de estoque a partir do Google Sheets e a torna a fonte
     * ativa única, substituindo qualquer base anterior.
     */
    async loadFromGoogleSheets(spreadsheetId, sheetName) {
        const result = await DataService.importInventoryQuantitiesFromSheet(spreadsheetId, sheetName);

        if (!result.success) {
            return result;
        }

        const saved = this._commit(result.quantities, {
            source: 'google-sheets',
            name: sheetName || `Planilha ${spreadsheetId.slice(-6)}`,
            spreadsheetId,
            sheetName
        });

        return { ...result, savedCount: saved.length };
    },

    /**
     * Lê um arquivo Excel/CSV e já torna seu conteúdo a fonte ativa única
     * (sem etapa de prévia - mesma UX imediata que a Base de Estoque já tinha).
     */
    async loadFromExcelFile(file) {
        const rows = await Utils.parseExcelFile(file);

        if (!rows || rows.length === 0) {
            return { success: false, message: 'Arquivo vazio ou inválido.', count: 0 };
        }

        const headerMap = DataService.detectHeaderMap(rows[0]);
        const quantities = rows
            .map(row => DataService.mapQuantityRow(row, headerMap))
            .filter(q => q.ean || q.sku);

        const saved = this._commit(quantities, { source: 'xlsx', name: file.name, fileName: file.name });

        return { success: true, message: 'Importação concluída.', count: saved.length };
    },

    /**
     * Remove a conexão E a base de estoque importada (mesma semântica do
     * "Desconectar" do Catálogo de Produtos) - nunca afeta o catálogo.
     */
    clearBase() {
        Storage.saveInventoryQuantities([]);
        Storage.clearInventoryBaseConnection();
    }
};

window.InventoryBaseService = InventoryBaseService;
