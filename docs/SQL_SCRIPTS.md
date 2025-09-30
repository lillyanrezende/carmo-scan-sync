# SQL Scripts - Carmo Scan & Sync

Scripts SQL úteis para gestão e manutenção da base de dados.

## 📊 Consultas Úteis

### Ver Stock por Armazém

```sql
SELECT 
  p.sku,
  p.nome AS produto,
  a.nome AS armazem,
  e.quantidade,
  e.quantidade_reservada,
  (e.quantidade - e.quantidade_reservada) AS disponivel
FROM estoques e
JOIN produtos p ON p.id = e.produto_id
JOIN armazens a ON a.id = e.armazem_id
WHERE e.quantidade > 0
ORDER BY p.nome, a.nome;
```

### Stock Total por Produto

```sql
SELECT 
  p.sku,
  p.nome,
  SUM(e.quantidade) AS stock_total,
  COUNT(DISTINCT e.armazem_id) AS num_armazens
FROM produtos p
LEFT JOIN estoques e ON e.produto_id = p.id
WHERE p.status = 'ativo'
GROUP BY p.id, p.sku, p.nome
HAVING SUM(e.quantidade) > 0
ORDER BY stock_total DESC;
```

### Produtos com Stock Baixo

```sql
SELECT 
  p.sku,
  p.nome,
  SUM(e.quantidade) AS stock_total
FROM produtos p
LEFT JOIN estoques e ON e.produto_id = p.id
WHERE p.status = 'ativo'
GROUP BY p.id, p.sku, p.nome
HAVING SUM(e.quantidade) < 10 OR SUM(e.quantidade) IS NULL
ORDER BY stock_total NULLS FIRST;
```

### Últimas Movimentações

```sql
SELECT 
  m.id,
  m.timestamp,
  m.tipo_movimentacao,
  p.sku,
  p.nome AS produto,
  m.quantidade,
  ao.nome AS origem,
  ad.nome AS destino,
  m.usuario,
  m.sync_status
FROM movimentacao_estoque m
JOIN produtos p ON p.id = m.produto_id
LEFT JOIN armazens ao ON ao.id = m.armazem_origem_id
LEFT JOIN armazens ad ON ad.id = m.armazem_destino_id
ORDER BY m.timestamp DESC
LIMIT 50;
```

### Movimentações por Tipo

```sql
SELECT 
  tipo_movimentacao,
  COUNT(*) AS num_movimentacoes,
  SUM(quantidade) AS quantidade_total
FROM movimentacao_estoque
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tipo_movimentacao
ORDER BY num_movimentacoes DESC;
```

### Movimentações por Utilizador

```sql
SELECT 
  usuario,
  COUNT(*) AS num_operacoes,
  SUM(quantidade) AS quantidade_total,
  MAX(timestamp) AS ultima_operacao
FROM movimentacao_estoque
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY usuario
ORDER BY num_operacoes DESC;
```

## ➕ Inserir Dados

### Adicionar Produto

```sql
-- 1. Inserir produto
INSERT INTO produtos (sku, nome, descricao, marca, cor, tamanho, preco_custo, preco_venda, subcategoria_id, fornecedor_id)
VALUES (
  'SAP001',
  'Sapato Social Preto 42',
  'Sapato social em pele genuína',
  'Marca XYZ',
  'Preto',
  '42',
  45.00,
  89.90,
  1,  -- subcategoria_id
  1   -- fornecedor_id
)
RETURNING id;

-- 2. Adicionar código de barras
INSERT INTO product_barcodes (produto_id, ean, nivel, pack_qty)
VALUES (
  1,  -- usar o ID retornado acima
  '5601234567890',
  'unit',
  1
);

-- 3. Inicializar stock (opcional)
INSERT INTO estoques (produto_id, armazem_id, quantidade)
VALUES (1, 1, 0);
```

### Adicionar Armazém

```sql
INSERT INTO armazens (codigo, nome, morada, ativo)
VALUES (
  'ARM04',
  'Novo Armazém',
  'Rua Exemplo, 456',
  true
);
```

### Adicionar Categoria

```sql
-- 1. Categoria
INSERT INTO categorias (nome, descricao)
VALUES ('Botas', 'Botas e botins')
RETURNING id;

-- 2. Subcategoria
INSERT INTO subcategorias (categoria_id, nome, descricao)
VALUES (1, 'Botas Inverno', 'Botas para época fria');
```

## 🔄 Ajustes de Stock

### Ajuste Manual de Stock

```sql
-- Actualizar stock directamente
UPDATE estoques 
SET quantidade = 100,
    atualizado_em = now()
WHERE produto_id = 1 AND armazem_id = 1;

-- Ou inserir se não existir
INSERT INTO estoques (produto_id, armazem_id, quantidade)
VALUES (1, 1, 100)
ON CONFLICT (produto_id, armazem_id) 
DO UPDATE SET quantidade = EXCLUDED.quantidade;
```

### Transferência Manual (sem usar API)

```sql
-- ⚠️ Usar com cuidado - melhor usar a função RPC
BEGIN;

-- Decrementar origem
UPDATE estoques 
SET quantidade = quantidade - 10 
WHERE produto_id = 1 AND armazem_id = 1;

-- Incrementar destino
INSERT INTO estoques (produto_id, armazem_id, quantidade)
VALUES (1, 2, 10)
ON CONFLICT (produto_id, armazem_id) 
DO UPDATE SET quantidade = estoques.quantidade + 10;

-- Registar movimentação
INSERT INTO movimentacao_estoque (
  produto_id, armazem_origem_id, armazem_destino_id,
  tipo_movimentacao, quantidade, usuario, timestamp
) VALUES (
  1, 1, 2,
  'transferencia', 10, 'admin', now()
);

COMMIT;
```

## 🧹 Limpeza e Manutenção

### Remover Movimentações Sincronizadas Antigas

```sql
-- Manter apenas últimos 6 meses
DELETE FROM movimentacao_estoque
WHERE sync_status = 'sincronizado'
  AND timestamp < CURRENT_DATE - INTERVAL '6 months';
```

### Remover Produtos Inativos sem Stock

```sql
DELETE FROM produtos
WHERE status = 'inativo'
  AND id NOT IN (
    SELECT DISTINCT produto_id 
    FROM estoques 
    WHERE quantidade > 0
  );
```

### Limpar Estoques a Zero

```sql
-- Remover registos de estoques com quantidade 0
DELETE FROM estoques
WHERE quantidade = 0 AND quantidade_reservada = 0;
```

## 📈 Estatísticas

### Valor Total de Stock

```sql
SELECT 
  SUM(e.quantidade * p.preco_custo) AS valor_custo_total,
  SUM(e.quantidade * p.preco_venda) AS valor_venda_total,
  COUNT(DISTINCT p.id) AS num_produtos_em_stock,
  SUM(e.quantidade) AS unidades_totais
FROM estoques e
JOIN produtos p ON p.id = e.produto_id
WHERE e.quantidade > 0;
```

### Rotatividade por Produto (últimos 30 dias)

```sql
SELECT 
  p.sku,
  p.nome,
  COUNT(CASE WHEN m.tipo_movimentacao = 'saida' THEN 1 END) AS num_saidas,
  SUM(CASE WHEN m.tipo_movimentacao = 'saida' THEN m.quantidade ELSE 0 END) AS qtd_vendida,
  SUM(e.quantidade) AS stock_atual
FROM produtos p
LEFT JOIN movimentacao_estoque m ON m.produto_id = p.id 
  AND m.timestamp >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN estoques e ON e.produto_id = p.id
WHERE p.status = 'ativo'
GROUP BY p.id, p.sku, p.nome
HAVING SUM(CASE WHEN m.tipo_movimentacao = 'saida' THEN m.quantidade ELSE 0 END) > 0
ORDER BY qtd_vendida DESC
LIMIT 20;
```

### Stock por Categoria

```sql
SELECT 
  c.nome AS categoria,
  sc.nome AS subcategoria,
  COUNT(DISTINCT p.id) AS num_produtos,
  SUM(e.quantidade) AS stock_total
FROM categorias c
JOIN subcategorias sc ON sc.categoria_id = c.id
JOIN produtos p ON p.subcategoria_id = sc.id
LEFT JOIN estoques e ON e.produto_id = p.id
GROUP BY c.nome, sc.nome
ORDER BY stock_total DESC NULLS LAST;
```

## 🔍 Auditing

### Movimentações Suspeitas

```sql
-- Grandes quantidades
SELECT *
FROM movimentacao_estoque
WHERE quantidade > 100
ORDER BY timestamp DESC;

-- Duplicados potenciais (mesmo utilizador, produto, tipo em curto espaço)
SELECT 
  usuario,
  produto_id,
  tipo_movimentacao,
  COUNT(*),
  array_agg(timestamp) AS timestamps
FROM movimentacao_estoque
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY usuario, produto_id, tipo_movimentacao
HAVING COUNT(*) > 3;
```

### Produtos sem Código de Barras

```sql
SELECT p.*
FROM produtos p
LEFT JOIN product_barcodes pb ON pb.produto_id = p.id
WHERE pb.id IS NULL
  AND p.status = 'ativo';
```

## 🛠️ Troubleshooting

### Verificar Integridade de Stock

```sql
-- Comparar movimentações com stock actual
WITH entradas AS (
  SELECT produto_id, armazem_destino_id AS armazem_id, SUM(quantidade) AS total
  FROM movimentacao_estoque
  WHERE tipo_movimentacao IN ('entrada', 'transferencia')
  GROUP BY produto_id, armazem_destino_id
),
saidas AS (
  SELECT produto_id, armazem_origem_id AS armazem_id, SUM(quantidade) AS total
  FROM movimentacao_estoque
  WHERE tipo_movimentacao IN ('saida', 'transferencia')
  GROUP BY produto_id, armazem_origem_id
)
SELECT 
  e.produto_id,
  e.armazem_id,
  COALESCE(entradas.total, 0) AS total_entradas,
  COALESCE(saidas.total, 0) AS total_saidas,
  COALESCE(entradas.total, 0) - COALESCE(saidas.total, 0) AS calculado,
  e.quantidade AS stock_actual,
  (COALESCE(entradas.total, 0) - COALESCE(saidas.total, 0)) - e.quantidade AS diferenca
FROM estoques e
LEFT JOIN entradas ON entradas.produto_id = e.produto_id AND entradas.armazem_id = e.armazem_id
LEFT JOIN saidas ON saidas.produto_id = e.produto_id AND saidas.armazem_id = e.armazem_id
WHERE ABS((COALESCE(entradas.total, 0) - COALESCE(saidas.total, 0)) - e.quantidade) > 0.01;
```

### Ver Logs de Erros de Sync

```sql
SELECT *
FROM movimentacao_estoque
WHERE sync_status = 'erro'
ORDER BY timestamp DESC;
```

## 🗑️ Reset Completo (⚠️ CUIDADO)

```sql
-- ⚠️ APAGA TODOS OS DADOS - Usar apenas em desenvolvimento/testing

BEGIN;

TRUNCATE TABLE movimentacao_estoque CASCADE;
TRUNCATE TABLE estoques CASCADE;
TRUNCATE TABLE product_barcodes CASCADE;
TRUNCATE TABLE produtos CASCADE;
TRUNCATE TABLE subcategorias CASCADE;
TRUNCATE TABLE categorias CASCADE;
TRUNCATE TABLE fornecedores CASCADE;
TRUNCATE TABLE armazens CASCADE;

-- Reiniciar dados de exemplo
-- (copiar do script de migration inicial)

COMMIT;
```

---

**Nota:** Sempre fazer backup antes de executar scripts que modificam ou apagam dados!
