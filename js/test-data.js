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
    { EAN: '7891234567899', SKU: 'SKU010', Produto: 'Cabo USB 3.0', Estoque: 120 }
];

/**
 * Carrega dados de teste no sistema
 */
function loadTestData() {
    console.log('📥 Carregando dados de teste...');
    Storage.saveProducts(SAMPLE_PRODUCTS);
    console.log(`✅ ${SAMPLE_PRODUCTS.length} produtos carregados!`);
    
    // Recarregar página se estiver em supervisor
    if (App.state.userRole === 'supervisor') {
        location.reload();
    }
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
    console.log('Divergências:', Storage.getDiscrepancies());
    console.log('Não Inventariados:', Storage.getNotInventoriedProducts());
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
    simulateRandomScans
};

console.log('📚 Utilitários de teste carregados!');
console.log('Use no console:');
console.log('  - TestUtils.loadTestData() - Carrega produtos de teste');
console.log('  - TestUtils.loadTestDataWithScans() - Carrega produtos + bipagens');
console.log('  - TestUtils.simulateRandomScans(10) - Simula 10 bipagens aleatórias');
console.log('  - TestUtils.showTestInfo() - Exibe dados carregados');
console.log('  - TestUtils.clearTestData() - Limpa todos os dados');
