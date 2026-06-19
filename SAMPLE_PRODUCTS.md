# 📋 Arquivo de Exemplo para Importação

Este arquivo `.xlsx` de exemplo contém a estrutura correta para importar produtos no sistema.

## Como criar o arquivo de exemplo:

1. Abra o Excel ou Google Sheets
2. Crie uma planilha com as seguintes colunas:
   - Coluna A: **EAN** (código de barras)
   - Coluna B: **SKU** (identificador do produto)
   - Coluna C: **Produto** (nome do produto)
   - Coluna D: **Estoque** (quantidade em sistema)

## Exemplo de dados:

| EAN | SKU | Produto | Estoque |
|-----|-----|---------|---------|
| 7891234567890 | SKU001 | Notebook Dell Inspiron 15 | 25 |
| 7891234567891 | SKU002 | Monitor LG 24" Full HD | 18 |
| 7891234567892 | SKU003 | Mouse Logitech MX Master | 50 |
| 7891234567893 | SKU004 | Teclado Mecânico RGB | 32 |
| 7891234567894 | SKU005 | Webcam Logitech 1080p | 15 |
| 7891234567895 | SKU006 | Headset Gamer HyperX | 22 |
| 7891234567896 | SKU007 | SSD Samsung 500GB | 40 |
| 7891234567897 | SKU008 | Memória RAM 8GB DDR4 | 60 |
| 7891234567898 | SKU009 | Adaptador HDMI | 100 |
| 7891234567899 | SKU010 | Cabo USB 3.0 | 120 |

## Passo a passo para criar:

### No Excel/LibreOffice:
1. Abra um novo arquivo
2. Na primeira linha, digite os cabeçalhos
3. Nas linhas seguintes, insira os dados dos produtos
4. Salve como `produtos.xlsx`

### No Google Sheets:
1. Crie um novo spreadsheet
2. Adicione os dados conforme acima
3. Download como Excel (.xlsx)
4. Use na importação

## Notas Importantes:

- ✅ O arquivo deve estar em formato `.xlsx` (Excel 2007+)
- ✅ Os nomes das colunas devem ser exatamente como listado
- ✅ O EAN deve conter apenas números
- ✅ O SKU é obrigatório para identificação
- ✅ O campo Estoque deve ser numérico
- ⚠️ Evite espaços em branco nas colunas cabeçalho
- ⚠️ Não adicione linhas em branco no meio dos dados

## Suporte a outras denominações:

O sistema também aceita:
- "Código" ao invés de "EAN"
- "Nome" ao invés de "Produto"
- "Stock" ao invés de "Estoque"

Exemplo alternativo:
| Código | SKU | Nome | Stock |
|--------|-----|------|-------|
| 789123 | 001 | Notebook | 25 |
| 789124 | 002 | Monitor | 18 |

## Após importar:

1. Na tela do Supervisor, vá para "Importar Excel"
2. Selecione seu arquivo
3. Revise a prévia dos produtos
4. Clique em "Confirmar Importação"
5. Pronto! Os produtos estão carregados

---

**Dica:** Mantenha sempre um backup da sua planilha de produtos!
