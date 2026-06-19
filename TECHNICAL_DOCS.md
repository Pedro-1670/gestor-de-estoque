# 🔧 Documentação Técnica

Documentação completa para desenvolvedores que desejam estender ou manter o sistema.

## 📁 Arquitetura

```
Frontend (Navegador)
├── HTML (index.html)
│   ├── Login Screen
│   ├── Operator Screen
│   └── Supervisor Screen
│
├── CSS (style.css)
│   ├── Login Styles
│   ├── Operator Styles
│   ├── Supervisor Styles
│   └── Responsive Design
│
└── JavaScript
    ├── app.js (Lógica Principal - 600+ linhas)
    ├── storage.js (Gerenciamento de Dados - 300+ linhas)
    ├── utils.js (Funções Utilitárias - 400+ linhas)
    └── test-data.js (Dados de Teste - 150+ linhas)

LocalStorage
├── inventory_products (Dados dos produtos)
├── inventory_scans (Registros de bipagem)
├── inventory_sessions (Histórico de sessões)
├── inventory_collaborators (Lista de colaboradores)
└── current_session (Sessão ativa)
```

## 🔄 Fluxo de Dados

```
Login
  ↓
[Operador]                    [Supervisor]
  ↓                                ↓
Bipagem                      Importar Excel
  ↓                                ↓
Storage.addScan()         Storage.saveProducts()
  ↓                                ↓
localStorage                  localStorage
  ↓                                ↓
Histórico                    Dashboard/Reports
  ↓                                ↓
Finalizar Inventário          Exportar Dados
```

## 🎯 Componentes Principais

### App.js

**Responsabilidades:**
- Gerenciar estado da aplicação
- Controlar navegação entre telas
- Processar login/logout
- Registrar bipagens
- Gerenciar supervisão

**Objeto Principal:**
```javascript
App = {
    state: { currentUser, userRole, currentSession, sessionScans, ... },
    init(),
    handleLogin(),
    handleLogout(),
    handleBarcodeScan(),
    recordScan(),
    finishInventory(),
    exportToExcel(),
    ...
}
```

**Métodos Principais:**
| Método | Descrição |
|--------|-----------|
| `init()` | Inicializa aplicação e event listeners |
| `showScreen(screenId)` | Alterna entre telas |
| `handleLogin(event)` | Processa login do usuário |
| `handleBarcodeScan(event)` | Processa leitura de código |
| `recordScan(product, codigo)` | Registra uma bipagem |
| `updateOperatorDashboard()` | Atualiza stats do operador |
| `updateDashboard()` | Atualiza KPIs do supervisor |
| `exportToExcel()` | Exporta dados para Excel |

### Storage.js

**Responsabilidades:**
- Persistir dados em localStorage
- Recuperar dados
- Calcular estatísticas
- Identificar divergências

**Objeto Principal:**
```javascript
Storage = {
    KEYS: { PRODUCTS, SCANS, SESSIONS, ... },
    getProducts(),
    getProduct(codigo),
    addScan(scan),
    getScansByCollaborator(name),
    getStatistics(),
    getDiscrepancies(),
    exportToCSV(data),
    ...
}
```

**Estrutura de Dados:**

**Product:**
```javascript
{
    EAN: string,
    SKU: string,
    Barcode: string,
    QRCode: string,
    Codigo: string,
    Produto: string,
    Estoque: number,
    Categoria: string
}
```

**Scan:**
```javascript
{
    id: string,
    timestamp: ISO8601,
    collaborator: string,
    product: string,
    sku: string,
    ean: string,
    barcode: string,
    stock: number,
    location: string,
    locationLabel: string,
    category: string,
    time: string
}
```

**Session:**
```javascript
{
    id: string,
    startTime: ISO8601,
    endTime: ISO8601,
    collaborator: string,
    role: string,
    location: string,
    itemsScanned: number,
    uniqueProducts: number,
    scans: Array
}
```

### Utils.js

**Categorias:**
- Formatação (tempo, data, moeda)
- Validação (código de barras, nome)
- Manipulação de strings
- Operações em arrays
- DOM helpers
- Exportação de dados
- Cálculos e estatísticas

## 🔌 Integração com Backend

Para integrar com um backend, substitua chamadas de Storage:

**De:**
```javascript
const products = Storage.getProducts();
```

**Para:**
```javascript
const response = await fetch('/api/products');
const products = await response.json();
```

**Endpoints sugeridos:**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/products` | Listar produtos |
| POST | `/api/products` | Importar produtos |
| POST | `/api/scans` | Registrar bipagem |
| GET | `/api/scans` | Listar bipagens |
| GET | `/api/reports/statistics` | Estatísticas |
| GET | `/api/reports/discrepancies` | Divergências |

## 🧪 Modo Teste

Para testar a aplicação sem dados reais:

1. Abra o navegador (F12)
2. No console, execute:

```javascript
// Carregar dados de teste
TestUtils.loadTestData();

// Ou com bipagens simuladas
TestUtils.loadTestDataWithScans();

// Simular mais bipagens
TestUtils.simulateRandomScans(20);

// Ver dados
TestUtils.showTestInfo();

// Limpar tudo
TestUtils.clearTestData();
```

## 🎨 Customização de Temas

Altere as cores em `css/style.css`:

```css
:root {
    --primary-color: #1e40af;      /* Azul principal */
    --success-color: #16a34a;      /* Verde sucesso */
    --warning-color: #ea580c;      /* Laranja aviso */
    --danger-color: #dc2626;       /* Vermelho erro */
}
```

## 📊 Cálculos e Algoritmos

### Divergências

```javascript
divergence = countedStock - systemStock
if (divergence > 0) {
    type = 'excess'      // Sobra
} else if (divergence < 0) {
    type = 'shortage'    // Falta
}
```

### Produtividade

```javascript
productivity = totalScans / uniqueProducts
timePerScan = totalTime / totalScans  (em segundos)
```

### Estatísticas

```javascript
totalScans = array length
uniqueProducts = set(ean).size
avgTimePerScan = totalTime / scans
```

## 🔒 Considerações de Segurança

**Atual (Frontend Only):**
- ✅ Sem transmissão de dados
- ⚠️ Sem autenticação robusta
- ⚠️ Dados visíveis no localStorage
- ⚠️ Sem validação server-side

**Para Produção:**
1. Implementar autenticação com JWT
2. Criptografar dados sensíveis
3. Validar todos os inputs
4. Usar HTTPS
5. Implementar rate limiting
6. Registrar eventos de segurança
7. Fazer backup regular
8. Implementar controle de acesso

## 🚀 Performance

**Otimizações Implementadas:**
- ✅ Lazy loading de scripts
- ✅ CSS minificado
- ✅ Sem jQuery (zero dependências pesadas)
- ✅ localStorage para cache local

**Para Melhorar:**
- [ ] Implementar Service Workers
- [ ] Comprimir imagens
- [ ] Cachear arquivos estáticos
- [ ] Implementar lazy loading de componentes
- [ ] Usar IndexedDB para >5MB
- [ ] Implementar virtual scrolling para grandes listas

## 📱 Responsive Design

**Breakpoints:**
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px
- Small Mobile: < 480px

**Ajustes:**
- Grid columns reduzem
- Fontes reduzem
- Padding/margin reduzem
- Navegação muda

## 🔍 Debugging

**Variáveis Globais Disponíveis:**
```javascript
App          // Objeto principal
Storage      // Gerenciamento de dados
Utils        // Funções utilitárias
TestUtils    // Utilitários de teste
```

**No console do navegador:**
```javascript
// Ver estado completo
console.log(App.state);

// Ver todos os dados
console.log(Storage.getStatistics());

// Ver localStorage bruto
localStorage;
```

## 📝 Padrões de Código

**Convenção de Nomes:**
- `PascalCase` para Objetos/Namespaces: `App`, `Storage`, `Utils`
- `camelCase` para métodos: `handleLogin()`, `recordScan()`
- `UPPER_SNAKE_CASE` para constantes: `KEYS`, `SAMPLE_PRODUCTS`

**Estrutura de Métodos:**
```javascript
/**
 * Descrição do método
 * @param {type} param - Descrição
 * @returns {type} Descrição do retorno
 */
methodName(param) {
    // Implementação
}
```

## 🔗 Dependências Externas

| Biblioteca | Versão | Uso |
|------------|--------|-----|
| XLSX | 0.18.5 | Leitura de Excel |
| html2pdf.js | 0.10.1 | Exportação em PDF |

## 📚 Recursos Adicionais

- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [SheetJS Documentation](https://docs.sheetjs.com/)

## 🎓 Roadmap

**v2.0:**
- [ ] Backend Node.js + Express
- [ ] Banco de dados SQLite
- [ ] Autenticação com JWT
- [ ] Relatórios em tempo real
- [ ] Gráficos avançados

**v3.0:**
- [ ] App Mobile (React Native)
- [ ] Suporte offline
- [ ] Sincronização em nuvem
- [ ] API REST documentada
- [ ] Docker containerization

---

**Última Atualização:** 2024  
**Versão:** 1.0.0
