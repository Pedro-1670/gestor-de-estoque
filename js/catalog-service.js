/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * catalog-service.js - Catálogo Único de Produtos
 *
 * CatalogService é a única porta de entrada para dados de produto: garante
 * que só existe UMA fonte ativa por vez (Google Sheets OU Excel, nunca as
 * duas), e centraliza leitura/busca/importação. Os importadores só convertem
 * dados brutos no modelo padrão - quem grava/troca o catálogo é sempre o
 * CatalogService.
 */

const GoogleSheetsImporter = {
    /**
     * Busca e converte uma planilha do Google Sheets no modelo padrão de
     * produto. Reaproveita o motor de detecção de cabeçalho e o conector já
     * existentes em DataService - não duplica parsing.
     * @returns {Promise<{success: boolean, message: string, products: Array, count: number}>}
     */
    async import(spreadsheetId, sheetName) {
        return DataService.importProductCatalogFromSheet(spreadsheetId, sheetName);
    }
};

const ExcelImporter = {
    /**
     * Lê um arquivo Excel e converte no modelo padrão de produto. Não grava
     * nada em localStorage e não mexe em UI - só parsing puro.
     * @param {File} file
     * @returns {Promise<{success: boolean, message: string, products: Array, count: number, rowsWithoutCode: number, columnsDetected: string}>}
     */
    async import(file) {
        const rows = await Utils.parseExcelFile(file);

        if (!rows || rows.length === 0) {
            return { success: false, message: 'Arquivo Excel vazio ou inválido.', products: [], count: 0 };
        }

        const headerMap = DataService.detectHeaderMap(rows[0]);
        const products = rows.map((row, index) => DataService.mapProductRow(row, index, headerMap));
        const rowsWithoutCode = rows.filter(row => !DataService.rowHasProductCode(row)).length;

        return {
            success: true,
            message: 'Importação concluída.',
            products,
            count: products.length,
            rowsWithoutCode,
            columnsDetected: DataService.describeHeaderMap(headerMap)
        };
    }
};

const CatalogService = {
    PAGE_SIZE: 100,

    /**
     * Todos os produtos do catálogo ativo.
     * @returns {Array}
     */
    getProducts() {
        return Storage.getProductsCached();
    },

    /**
     * Metadados da conexão ativa (origem, nome, contagem, última sincronização,
     * status), ou null se nenhuma planilha estiver conectada.
     */
    getConnection() {
        return Storage.getCatalogConnection();
    },

    /**
     * Busca por texto livre (SKU, EAN, código de barras, nome, categoria,
     * localização) dentro do catálogo ativo.
     * @param {string} term
     * @returns {Array}
     */
    searchProducts(term) {
        const query = Storage.normalizeCode(term).toLowerCase();
        if (!query) {
            return this.getProducts();
        }
        return this.getProducts().filter(product => Storage.getProductSearchText(product).includes(query));
    },

    /**
     * Localiza um produto por qualquer código de barras (unidade ou caixa) ou
     * código genérico - a resolução dupla de código de barras já é garantida
     * por Storage.getProduct.
     */
    getProductByBarcode(code) {
        return Storage.getProduct(code) || null;
    },

    /**
     * Localiza um produto pelo SKU (ou qualquer outro código reconhecido -
     * mesma resolução universal usada pela bipagem).
     */
    getProductBySKU(sku) {
        return Storage.getProduct(sku) || null;
    },

    /**
     * Uma página do catálogo (100 produtos por página, com filtro de busca
     * opcional) - nunca renderiza o catálogo inteiro de uma vez.
     * @param {number} page
     * @param {string} [searchTerm]
     * @returns {{items: Array, total: number, totalPages: number, page: number}}
     */
    getCatalogPage(page = 1, searchTerm = '') {
        const all = searchTerm ? this.searchProducts(searchTerm) : this.getProducts();
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
     * Grava o novo catálogo como única fonte ativa: qualquer catálogo/conexão
     * anterior (de QUALQUER origem) é destruído antes da troca, nunca
     * coexistindo com o novo.
     * @private
     */
    _commit(products, meta) {
        Storage.saveProducts([]);
        const saved = Storage.saveProducts(products);
        Storage.saveCatalogConnection({
            source: meta.source,
            name: meta.name,
            spreadsheetId: meta.spreadsheetId || null,
            sheetName: meta.sheetName || null,
            fileName: meta.fileName || null,
            productCount: saved.length,
            lastSyncAt: new Date().toISOString(),
            status: 'ok'
        });
        return saved;
    },

    /**
     * Carrega o catálogo a partir do Google Sheets e o torna a fonte ativa
     * única, substituindo qualquer catálogo anterior (Excel ou outra planilha).
     * @returns {Promise<object>} resultado do GoogleSheetsImporter, com savedCount quando bem-sucedido
     */
    async loadFromGoogleSheets(spreadsheetId, sheetName) {
        const result = await GoogleSheetsImporter.import(spreadsheetId, sheetName);

        if (!result.success) {
            return result;
        }

        const saved = this._commit(result.products, {
            source: 'google-sheets',
            name: sheetName || `Planilha ${spreadsheetId.slice(-6)}`,
            spreadsheetId,
            sheetName
        });

        return { ...result, savedCount: saved.length };
    },

    /**
     * Torna um conjunto de produtos já convertidos (ex: pelo ExcelImporter,
     * após revisão na prévia de importação) a fonte ativa única, substituindo
     * qualquer catálogo anterior (Google Sheets ou outro arquivo Excel).
     * @returns {Array} produtos salvos
     */
    loadFromExcel(products, fileName) {
        return this._commit(products, { source: 'xlsx', name: fileName || 'Arquivo Excel', fileName });
    },

    /**
     * Remove a conexão E o catálogo importado (usado pelo botão "Desconectar
     * Planilha" - decisão explícita: não deixa produtos órfãos de uma fonte
     * desconectada).
     */
    clearCatalog() {
        Storage.saveProducts([]);
        Storage.clearCatalogConnection();
    }
};

window.GoogleSheetsImporter = GoogleSheetsImporter;
window.ExcelImporter = ExcelImporter;
window.CatalogService = CatalogService;
