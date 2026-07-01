/**
 * SISTEMA DE INVENTÁRIO INTELIGENTE
 * test-data.js - Dados de Teste
 * 
 * Carregue este arquivo para testar o sistema com dados pré-definidos
 * Útil para demonstração e testes iniciais
 */

// Dados de teste - Produtos
const SAMPLE_PRODUCTS = [
    { EAN: '7891234567890', SKU: 'SKU001', Produto: 'Notebook Dell Inspiron 15', Estoque: 25 },
    { EAN: '7891234567891', SKU: 'SKU002', Produto: 'Monitor LG 24" Full HD', Estoque: 18 },
    { EAN: '7891234567892', SKU: 'SKU003', Produto: 'Mouse Logitech MX Master', Estoque: 50 },
    { EAN: '7891234567893', SKU: 'SKU004', Produto: 'Teclado Mecânico RGB', Estoque: 32 },
    { EAN: '7891234567894', SKU: 'SKU005', Produto: 'Webcam Logitech 1080p', Estoque: 15 },
    { EAN: '7891234567895', SKU: 'SKU006', Produto: 'Headset Gamer HyperX', Estoque: 22 },
    { EAN: '7891234567896', SKU: 'SKU007', Produto: 'SSD Samsung 500GB', Estoque: 40 },
    { EAN: '7891234567897', SKU: 'SKU008', Produto: 'Memória RAM 8GB DDR4', Estoque: 60 },
    { EAN: '7891234567898', SKU: 'SKU009', Produto: 'Adaptador HDMI', Estoque: 100 },
    { EAN: '7891234567899', SKU: 'SKU010', Produto: 'Cabo USB 3.0', Estoque: 120 },
    { EAN: '7891234567810', SKU: 'SKU011', Produto: 'Produto Externo', Estoque: 50 }
];

const SAMPLE_NF_CONFERENCE = {
    id: 'conf_abc123',
    conferenceCode: 'CONF-ABC-123',
    nfInfo: {
        fornecedor: 'ABC LTDA',
        numeroNF: '54321',
        serie: '1',
        dataEmissao: '2026-06-20'
    },
    items: [
        { codigoProduto: 'SKU001', ean: '7891234567890', description: 'Notebook Dell Inspiron 15', quantity: 10 },
        { codigoProduto: 'SKU002', ean: '7891234567891', description: 'Monitor LG 24" Full HD', quantity: 20 },
        { codigoProduto: 'SKU003', ean: '7891234567892', description: 'Mouse Logitech MX Master', quantity: 30 },
        { codigoProduto: 'SKU004', ean: '7891234567893', description: 'Teclado Mecânico RGB', quantity: 15 },
        { codigoProduto: 'SKU005', ean: '7891234567894', description: 'Webcam Logitech 1080p', quantity: 25 }
    ]
};

function loadTestData() {
    console.log('📥 Carregando dados de teste...');
    Storage.saveProducts(SAMPLE_PRODUCTS);
    Storage.saveXMLInvoice(SAMPLE_NF_CONFERENCE);
    console.log(`✅ ${SAMPLE_PRODUCTS.length} produtos carregados!`);
    console.log(`✅ Conferência de NF de teste criada com código: ${SAMPLE_NF_CONFERENCE.conferenceCode}`);
    
    // Recarregar página se estiver em supervisor
    if (App.state.userRole === 'supervisor') {
        location.reload();
    }
}

function loadNFConferenceTestData() {
    console.log('📥 Carregando dados de NF para conferência...');
    Storage.saveProducts(SAMPLE_PRODUCTS);
    Storage.saveXMLInvoice(SAMPLE_NF_CONFERENCE);
    console.log(`✅ Conferência de NF criada!`);
    console.log(`   Código: ${SAMPLE_NF_CONFERENCE.conferenceCode}`);
    console.log(`   Fornecedor: ${SAMPLE_NF_CONFERENCE.nfInfo.fornecedor}`);
    console.log(`   NF: ${SAMPLE_NF_CONFERENCE.nfInfo.numeroNF}`);
    console.log(`   Itens: ${SAMPLE_NF_CONFERENCE.items.length}`);
}

/**
 * Carrega dados de teste com simulação de bipagens
 */
function loadTestDataWithScans() {
    console.log('📥 Carregando dados de teste com bipagens...');
    
    // Carregar produtos
    Storage.saveProducts(SAMPLE_PRODUCTS);
    
    // Simular algumas bipagens
    const testScans = [
        { collaborator: 'João Silva', product: 'Notebook Dell Inspiron 15', sku: 'SKU001', ean: '7891234567890', stock: 25, location: 'main', timestamp: new Date(Date.now() - 3600000).toISOString(), time: '14:30:00' },
        { collaborator: 'João Silva', product: 'Notebook Dell Inspiron 15', sku: 'SKU001', ean: '7891234567890', stock: 25, location: 'main', timestamp: new Date(Date.now() - 3500000).toISOString(), time: '14:32:00' },
        { collaborator: 'João Silva', product: 'Monitor LG 24\" Full HD', sku: 'SKU002', ean: '7891234567891', stock: 18, location: 'main', timestamp: new Date(Date.now() - 3400000).toISOString(), time: '14:34:00' },
        { collaborator: 'Maria Santos', product: 'Mouse Logitech MX Master', sku: 'SKU003', ean: '7891234567892', stock: 50, location: 'warehouse-a', timestamp: new Date(Date.now() - 3300000).toISOString(), time: '14:36:00' },
        { collaborator: 'Maria Santos', product: 'Teclado Mecânico RGB', sku: 'SKU004', ean: '7891234567893', stock: 32, location: 'warehouse-a', timestamp: new Date(Date.now() - 3200000).toISOString(), time: '14:38:00' },
        { collaborator: 'Maria Santos', product: 'Headset Gamer HyperX', sku: 'SKU006', ean: '7891234567895', stock: 22, location: 'warehouse-a', timestamp: new Date(Date.now() - 3100000).toISOString(), time: '14:40:00' },
        { collaborator: 'João Silva', product: 'SSD Samsung 500GB', sku: 'SKU007', ean: '7891234567896', stock: 40, location: 'main', timestamp: new Date(Date.now() - 3000000).toISOString(), time: '14:42:00' },
    ];
    
    Storage.saveScans(testScans);
    console.log(`✅ ${SAMPLE_PRODUCTS.length} produtos e ${testScans.length} bipagens carregados!`);
    
    // Recarregar
    location.reload();
}

/**
 * Limpa todos os dados de teste
 */
function clearTestData() {
    if (confirm('Tem certeza que deseja limpar TODOS os dados?')) {
        Storage.clear();
        console.log('✅ Dados limpos!');
        location.reload();
    }
}

/**
 * Exibe informações de teste no console
 */
function showTestInfo() {
    console.log('=== INFORMAÇÕES DE TESTE ===');
    console.log('Produtos:', Storage.getProducts());
    console.log('Bipagens:', Storage.getScans());
    console.log('Sessões:', Storage.getSessions());
    console.log('Colaboradores:', Storage.getCollaborators());
    console.log('Estatísticas:', Storage.getStatistics());
    console.log('Divergências:', Storage.getUnifiedDivergences());
}

/**
 * Simula bipagens automaticamente (útil para demo)
 */
function simulateRandomScans(count = 10) {
    console.log(`🔄 Simulando ${count} bipagens aleatórias...`);
    
    const collaborators = ['João Silva', 'Maria Santos', 'Pedro Costa'];
    const locations = ['main', 'warehouse-a', 'warehouse-b'];
    
    for (let i = 0; i < count; i++) {
        const product = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        const collaborator = collaborators[Math.floor(Math.random() * collaborators.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        Storage.addScan({
            collaborator,
            product: product.Produto,
            sku: product.SKU,
            ean: product.EAN,
            stock: product.Estoque,
            location
        });
    }
    
    console.log(`✅ ${count} bipagens simuladas!`);
}

/**
 * Export para uso em console
 */
window.TestUtils = {
    loadTestData,
    loadTestDataWithScans,
    clearTestData,
    showTestInfo,
    simulateRandomScans,
    loadNFConferenceTestData
};

console.log('📚 Utilitários de teste carregados!');
console.log('Use no console:');
console.log('  - TestUtils.loadTestData() - Carrega produtos de teste + NF de conferência');
console.log('  - TestUtils.loadTestDataWithScans() - Carrega produtos + bipagens');
console.log('  - TestUtils.simulateRandomScans(10) - Simula 10 bipagens aleatórias');
console.log('  - TestUtils.showTestInfo() - Exibe dados carregados');
console.log('  - TestUtils.clearTestData() - Limpa todos os dados');
console.log('  - TestUtils.loadNFConferenceTestData() - Carrega apenas NF para conferência');
