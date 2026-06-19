# 📊 Inventário Inteligente de Estoque

Sistema web profissional para gerenciamento de inventário com contagem por código de barras (bipagem), desenvolvido com HTML5, CSS3 e JavaScript puro.

## 🎯 Objetivo

Criar uma ferramenta completa para operadores realizarem inventários físicos e para supervisores acompanharem produtividade e divergências em tempo real.

## ✨ Características Principais

- ✅ **Login Simples** - Identificação por nome do colaborador
- ✅ **Tela do Operador** - Interface otimizada para leitura de código de barras
- ✅ **Tela do Supervisor** - Dashboard executivo com KPIs
- ✅ **Importação Excel** - Carregamento de planilhas de produtos (.xlsx)
- ✅ **Registro Automático** - Todas as bipagens vinculadas ao colaborador
- ✅ **Cálculo de Divergências** - Comparação sistema vs. contagem
- ✅ **Exportação** - Relatórios em Excel, CSV e PDF
- ✅ **Responsivo** - Funciona em desktop e mobile
- ✅ **Sem Backend** - Funciona 100% no navegador usando localStorage
- ✅ **Pronto para Migração** - Estrutura preparada para banco de dados

## 🏗️ Estrutura do Projeto

```
Estouqe teste/
├── index.html           # Arquivo principal HTML
├── css/
│   └── style.css       # Estilos CSS profissionais
├── js/
│   ├── app.js          # Lógica principal da aplicação
│   ├── storage.js      # Gerenciamento de dados (localStorage)
│   └── utils.js        # Funções utilitárias
└── README.md           # Este arquivo
```

## 🚀 Como Usar

### 1. **Abrir a Aplicação**

- Abra o arquivo `index.html` em um navegador moderno (Chrome, Firefox, Safari, Edge)
- A aplicação carrega completamente no navegador

### 2. **Fluxo de Operador (Bipagem)**

#### Login
```
1. Digite seu nome
2. Selecione "Operador (Bipagem)"
3. Clique em "Entrar no Sistema"
```

#### Contagem
```
1. Selecione a localização (Estoque Principal, Almoxarifado A ou B)
2. Aponte o leitor de código de barras para o código
3. O sistema registra automaticamente a bipagem
4. O cursor permanece no campo de entrada para próximo produto
5. Acompanhe em tempo real: itens contados, produtos únicos e tempo
```

#### Finalizar Inventário
```
1. Clique em "Finalizar Inventário"
2. Revise o resumo da sessão
3. Escolha voltar ou continuar contando
```

### 3. **Fluxo de Supervisor (Dashboard)**

#### Login
```
1. Digite seu nome
2. Selecione "Supervisor (Dashboard)"
3. Clique em "Entrar no Sistema"
```

#### Importação de Produtos
```
1. Acesse a aba "Importar Excel"
2. Clique ou arraste um arquivo .xlsx com produtos
3. Estrutura esperada:
   - EAN: Código de barras
   - SKU: Identificador do produto
   - Produto: Nome do produto
   - Estoque: Quantidade em sistema
4. Revise a prévia e confirme a importação
```

#### Dashboard (KPIs)
```
- Total de Bipagens
- Produtos Contados
- Quantidade de Colaboradores
- Tempo Médio de Contagem
- Ranking de Produtividade dos Operadores
```

#### Histórico Geral
```
1. Acesse a aba "Histórico"
2. Aplique filtros por data, colaborador ou produto
3. Visualize todas as bipagens realizadas
```

#### Divergências
```
1. Acesse a aba "Divergências"
2. Visualize produtos com diferenças entre sistema e contagem
3. Identifique sobras (verde) e faltas (vermelho)
4. Analise SKU, quantidade do sistema, contado e diferença
```

#### Produtos Não Inventariados
```
1. Acesse a aba "Não Inventariados"
2. Visualize produtos que não receberam nenhuma bipagem
3. Planeje recontagem se necessário
```

#### Exportação
```
1. Acesse a aba "Importar Excel"
2. Escolha o formato:
   - Excel (.xlsx) - Formato padrão
   - CSV (.csv) - Para análise em outras ferramentas
   - PDF (.pdf) - Para impressão e relatórios
3. Arquivo é salvo automaticamente
```

## 📊 Formato do Arquivo Excel

Para importar corretamente, o arquivo Excel deve ter as seguintes colunas:

| EAN | SKU | Produto | Estoque |
|-----|-----|---------|---------|
| 789001 | 001 | Notebook Dell | 25 |
| 789002 | 002 | Monitor LG | 18 |
| 789003 | 003 | Mouse Logitech | 50 |

**Nota:** O sistema aceita variações como "Código", "Produto" vs "Nome", "Stock" vs "Estoque".

## 🔧 Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Leitura Excel:** [SheetJS](https://sheetjs.com/)
- **Exportação PDF:** [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
- **Armazenamento:** LocalStorage (navegador)

## 💾 Persistência de Dados

Os dados são armazenados em `localStorage` do navegador:

- `inventory_products` - Produtos importados
- `inventory_scans` - Registros de bipagem
- `inventory_sessions` - Sessões de inventário
- `inventory_collaborators` - Lista de colaboradores

**Limite:** Geralmente 5-10MB por domínio. Para grandes volumes, migre para banco de dados.

## 📱 Compatibilidade

| Navegador | Desktop | Mobile |
|-----------|---------|--------|
| Chrome | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ | ✅ |
| Edge | ✅ | ✅ |

## ⌨️ Atalhos de Teclado

| Atalho | Função |
|--------|--------|
| Enter (no campo de bipagem) | Registra a leitura |
| Tab | Navega entre campos |
| ESC | Não implementado ainda |

## 🔐 Segurança

- ✅ Dados armazenados localmente (sem transmissão)
- ✅ Validação de entrada sanitizada
- ✅ Sem dependências externas de sensibilidade
- ⚠️ Para produção, implemente:
  - Autenticação robusta
  - Criptografia de dados
  - Backup centralizado
  - Controle de acesso por perfil

## 🚀 Próximas Implementações

### Backend (Opcional)
```bash
npm install express sqlite3 cors dotenv
```

### Estrutura de Backend Sugerida
```
backend/
├── server.js
├── routes/
│   ├── products.js
│   ├── scans.js
│   ├── sessions.js
│   └── reports.js
├── database/
│   ├── db.js
│   └── schema.sql
└── middleware/
    ├── auth.js
    └── validation.js
```

### Migração para Banco de Dados
O código está preparado para migração. Apenas substitua as chamadas de `Storage` por chamadas de API:

```javascript
// De:
const products = Storage.getProducts();

// Para:
const response = await fetch('/api/products');
const products = await response.json();
```

## 🐛 Troubleshooting

### Problema: Arquivo Excel não importa
- **Solução:** Verifique se o arquivo tem as colunas corretas: EAN, SKU, Produto, Estoque

### Problema: Dados desaparecem ao fechar navegador
- **Solução:** Dados são persistentes em localStorage. Limpe o cache se necessário.

### Problema: Código de barras não funciona
- **Solução:** Alguns leitores enviam ESC ao final. Configure o leitor para não enviar caracteres extras.

## 📖 Documentação de Código

### Storage.js
Gerencia toda a persistência de dados:
- `getProducts()` - Recupera lista de produtos
- `addScan(scan)` - Registra uma bipagem
- `getScans()` - Recupera todas as bipagens
- `getStatistics()` - Calcula estatísticas gerais
- `getDiscrepancies()` - Identifica divergências

### Utils.js
Funções utilitárias:
- `formatTime(seconds)` - Formata tempo em HH:MM:SS
- `parseExcelFile(file)` - Parse de arquivo Excel
- `createExcelFromData(data)` - Exporta para Excel
- `validateBarcode(barcode)` - Valida código de barras

### App.js
Lógica principal:
- `handleLogin()` - Processamento de login
- `handleBarcodeScan()` - Processamento de bipagem
- `finishInventory()` - Finalização de inventário
- `updateDashboard()` - Atualiza KPIs
- `exportToExcel()` - Exportação

## 📝 Logs e Debugging

Para ativar modo debug:
```javascript
// Abra o console do navegador (F12)
// Todos os eventos serão registrados em console.log()
```

## 🤝 Suporte Profissional

Esta aplicação segue padrões de:
- ✅ Google Material Design
- ✅ SAP Fiori Design
- ✅ Accessibility Standards (WCAG 2.1)
- ✅ Best Practices JavaScript

## 📄 Licença

Projeto desenvolvido especificamente para Estoque Inteligente.

## ✉️ Contato

Para dúvidas ou sugestões sobre o sistema, consulte a documentação ou os comentários no código.

---

**Versão:** 1.0.0  
**Última Atualização:** 2024  
**Status:** ✅ Produção
