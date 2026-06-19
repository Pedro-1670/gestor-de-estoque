# 🚀 Guia de Início Rápido

Comece a usar o Sistema de Inventário Inteligente em 5 minutos!

## 1️⃣ Abrir a Aplicação

1. Localize o arquivo `index.html`
2. Clique duas vezes para abrir no navegador
3. A tela de login aparecerá automaticamente

## 2️⃣ Primeiro Acesso - Supervisor

### Preparar os dados:

**Opção A: Teste Rápido (Sem Importação)**
- Pule para a próxima seção

**Opção B: Importar Seus Produtos (Recomendado)**

1. Prepare um arquivo Excel (.xlsx) com seus produtos
   - Colunas necessárias: EAN, SKU, Produto, Estoque
   - Veja `SAMPLE_PRODUCTS.md` para um exemplo

2. Na tela de login:
   - Nome: Digitar um nome (ex: "João Silva")
   - Tipo de Acesso: Selecionar "Supervisor (Dashboard)"
   - Clicar "Entrar no Sistema"

3. Na tela do Supervisor, ir para aba "Importar Excel"
   - Clique ou arraste seu arquivo Excel
   - Confirme a importação
   - Pronto! Produtos carregados

## 3️⃣ Primeiro Teste - Operador

1. Na tela de login:
   - Nome: Digitar outro nome (ex: "Maria Santos")
   - Tipo de Acesso: Selecionar "Operador (Bipagem)"
   - Clicar "Entrar no Sistema"

2. Na tela do operador:
   - Selecione a localização (ex: "Estoque Principal")
   - O cursor estará no campo de bipagem automaticamente

3. Para testar, você pode:
   - **Com leitor de código:** Apontar o leitor para os produtos
   - **Sem leitor:** Digitar códigos manualmente (ex: 789001) e pressionar Enter

4. Cada bipagem registra:
   - Hora
   - Produto
   - SKU
   - Localização
   - Colaborador

5. Clique "Finalizar Inventário" para encerrar a sessão

## 4️⃣ Verificar Dados - Supervisor

1. Volte para login (ou abra em outra aba)
2. Acesse como Supervisor
3. Explore as abas:

   **Dashboard:**
   - Veja KPIs de bipagens
   - Ranking de colaboradores

   **Histórico:**
   - Todas as bipagens realizadas
   - Filtros por data, colaborador ou produto

   **Divergências:**
   - Produtos com diferenças sistema vs. contagem
   - Sobras (verde) e Faltas (vermelho)

   **Não Inventariados:**
   - Produtos que não foram bipados

## 5️⃣ Exportar Relatórios

Na aba "Importar Excel":

- **Excel:** Exporta produtos e dados
- **CSV:** Formato aberto para análises
- **PDF:** Para impressão e compartilhamento

Arquivo é salvo automaticamente no seu computador.

---

## 💡 Dicas de Uso

### Para Operadores:

✅ **Deixe as mãos livres**
- O sistema mantém o foco no campo de bipagem
- Não precisa usar mouse durante a contagem

✅ **Confira a localização**
- Cada bipagem registra a localização selecionada
- Mude se estiver em outro almoxarifado

✅ **Acompanhe o tempo**
- A sessão mostra tempo real, itens contados e produtos únicos
- Dados para análise de produtividade

### Para Supervisores:

✅ **Importe antes de começar**
- Tenha a base de produtos já carregada
- Facilita identificar divergências

✅ **Acompanhe em tempo real**
- Abra o dashboard em dispositivo separado
- Veja produtividade dos operadores

✅ **Use os filtros**
- Analise dados por período
- Foque em colaboradores específicos

✅ **Valide divergências**
- Revise regularmente
- Investigue produtos com grandes diferenças

## 🔄 Fluxo Típico de um Dia

### Manhã:
1. Supervisor faz login
2. Importa planilha de produtos (se não estiver carregada)
3. Compartilha a URL com operadores

### Durante o dia:
1. Operadores fazem login como "Operador"
2. Realizam contagem em suas respectivas áreas
3. Sistema registra automaticamente

### Fim do dia:
1. Supervisor verifica Dashboard
2. Analisa divergências
3. Exporta relatório para análise
4. Compartilha com gestão

## ⚠️ Problemas Comuns

**P: Meu código de barras não funciona**
- Teste digitando manualmente: 789001 + Enter
- Se funcionar, é configuração do leitor
- Se não funcionar, pode ser navegador

**P: Dados desapareceram**
- Os dados são salvos automaticamente
- Se limpou cache/cookies, será necessário reimportar
- Sempre mantenha backup do Excel

**P: Excel não importa**
- Verifique se tem as colunas: EAN, SKU, Produto, Estoque
- Salve novamente como .xlsx
- Tente com o arquivo de exemplo

**P: Sistema está lento**
- Se tiver muitos registros, é normal
- localStorage tem limite de ~5MB
- Para produção, use banco de dados

## 🎯 Próximos Passos

1. ✅ **Testar a importação** - Use seus produtos reais
2. ✅ **Treinar operadores** - Mostre a tela de bipagem
3. ✅ **Validar fluxo** - Fça uma contagem teste
4. ✅ **Analisar relatórios** - Verifique dashboards
5. ✅ **Melhorar processos** - Use insights dos dados

## 📞 Suporte

Para informações detalhadas, consulte `README.md`.

---

**Bem-vindo ao Inventário Inteligente! Boa contagem! 📊**
