# Carmo Scan & Sync - Sistema de Gestão de Stock

Sistema completo de gestão de stock com leitura de código de barras desenvolvido para a **Sapataria do Carmo**.

## 📋 Visão Geral

**Carmo Scan & Sync** é uma Progressive Web App (PWA) que permite:
- Leitura de códigos de barras EAN/GTIN através da câmera
- Gestão de movimentações de stock (entradas, saídas, transferências)
- Operação offline com sincronização automática
- Validação de checksum EAN (módulo 10)
- Gestão de múltiplos armazéns
- Idempotência para evitar movimentações duplicadas

## 🏗️ Arquitectura

### Frontend (PWA)
- **Framework:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Barcode Scanner:** @zxing/library (camera API)
- **State Management:** React Hooks + AsyncStorage para offline
- **Backend Client:** Supabase JS Client

### Backend (Lovable Cloud/Supabase)
- **Database:** PostgreSQL com RLS (Row Level Security)
- **API:** Supabase Edge Functions (Deno/TypeScript)
- **Auth:** Supabase Auth (email/password)

### Estrutura de Pastas
```
├── docs/                          # Documentação
├── src/
│   ├── components/                # Componentes React
│   │   ├── ui/                    # shadcn components
│   │   ├── BarcodeScanner.tsx     # Scanner de câmera
│   │   ├── ProductInfo.tsx        # Ficha de produto
│   │   ├── MovementForm.tsx       # Formulário de movimentação
│   │   └── OfflineQueue.tsx       # Fila de sincronização
│   ├── pages/
│   │   ├── Auth.tsx               # Login/Signup
│   │   └── Dashboard.tsx          # Dashboard principal
│   ├── lib/
│   │   ├── ean-validator.ts       # Validação EAN/GTIN
│   │   └── offline-queue.ts       # Gestão fila offline
│   ├── hooks/
│   │   └── use-barcode-scanner.ts # Hook para scanner
│   └── integrations/supabase/     # Cliente Supabase (auto-gerado)
└── supabase/
    └── functions/
        ├── scan/                  # POST /scan - registar movimentação
        └── product/               # GET /product - consultar produto
```

## 🗄️ Base de Dados

### Tabelas Principais

**produtos**
- `id`, `sku` (único), `nome`, `descricao`
- `subcategoria_id`, `fornecedor_id`
- `marca`, `cor`, `tamanho`
- `preco_custo`, `preco_venda`, `status`

**product_barcodes**
- `id`, `produto_id`, `ean` (único)
- `nivel` (unit/box/pallet), `pack_qty`

**estoques**
- `id`, `produto_id`, `armazem_id`
- `quantidade`, `quantidade_reservada`
- UNIQUE(produto_id, armazem_id)

**movimentacao_estoque**
- `id`, `produto_id`
- `armazem_origem_id`, `armazem_destino_id`
- `tipo_movimentacao` (entrada/saida/transferencia)
- `quantidade`, `usuario`, `observacoes`
- `timestamp`, `sync_status`, `hash_idempotencia`

**armazens**
- `id`, `codigo` (único), `nome`, `morada`, `ativo`

**categorias** e **subcategorias**
- Hierarquia de categorização de produtos

**fornecedores**
- `id`, `codigo`, `nome`, `nif`, `contacto_email`, etc.

### RPC: `processar_movimentacao`

Função PostgreSQL que processa movimentações atomicamente:
- Valida parâmetros e tipo de movimentação
- Verifica stock disponível (para saídas)
- Atualiza tabela `estoques` (incrementa/decrementa)
- Insere registo em `movimentacao_estoque`
- Retorna JSON com resultado e stocks actualizados
- Implementa idempotência via `hash_idempotencia`

Parâmetros:
```sql
p_produto_id BIGINT,
p_origem_id BIGINT,
p_destino_id BIGINT,
p_quantidade DECIMAL,
p_tipo TEXT,
p_usuario TEXT,
p_observacoes TEXT,
p_timestamp TIMESTAMPTZ,
p_hash_idempotencia TEXT
```

## 🔌 API (Edge Functions)

### POST /scan

Processa movimentação de stock.

**Request:**
```json
{
  "sku_or_ean": "5601234567890",
  "tipo_movimentacao": "entrada|saida|transferencia",
  "quantidade": 1,
  "armazem_origem_id": 1,     // nullable
  "armazem_destino_id": 2,    // nullable
  "usuario": "nome_operador",
  "observacoes": "...",       // opcional
  "timestamp": "2025-09-30T12:00:00Z"
}
```

**Response:**
```json
{
  "ok": true,
  "movimentacao_id": 123,
  "produto_id": 456,
  "estoques": [
    {
      "armazem_id": 1,
      "armazem_nome": "Armazém Principal",
      "quantidade": 50
    }
  ]
}
```

**Validações:**
- EAN checksum (se aplicável)
- Produto existe (SKU ou EAN)
- Quantidade > 0
- Stock suficiente (para saídas)
- Armazéns válidos conforme tipo
- Idempotência (janela de 30 segundos)

**Errors:**
- `400`: Validação falhou
- `401`: Não autenticado
- `404`: Produto não encontrado

### GET /product?sku=XXX

Consulta produto e stock.

**Query Params:**
- `sku`: SKU do produto OU
- `ean`: EAN do produto

**Response:**
```json
{
  "ok": true,
  "produto": {
    "id": 1,
    "sku": "SAP001",
    "nome": "Sapato Preto 42",
    "descricao": "...",
    "marca": "...",
    "cor": "Preto",
    "tamanho": "42",
    "status": "ativo",
    "subcategorias": { ... },
    "fornecedores": { ... },
    "barcodes": [{ "ean": "...", ... }]
  },
  "estoques": [
    {
      "quantidade": 50,
      "quantidade_reservada": 5,
      "armazens": {
        "id": 1,
        "nome": "Armazém Principal",
        ...
      }
    }
  ],
  "stock_total": 50
}
```

## 🔒 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS activado:
- **Leitura:** Permitida para utilizadores autenticados
- **Escrita:** Apenas via Edge Functions (service_role)

### Autenticação

- Supabase Auth (email/password)
- Auto-confirm email activado (para testing)
- JWT tokens nas headers das requests
- Session management automático

### Validações

**Cliente:**
- Input validation (zod schemas)
- EAN checksum validation
- Encoding para URLs (encodeURIComponent)

**Servidor:**
- Validação de schema
- Validação de negócio (stock, armazéns)
- Sanitização de inputs
- RLS policies

## 📱 Funcionalidades Offline

### Fila de Sincronização

Implementada via `localStorage`:
- **Add:** Movimentações guardadas localmente quando offline
- **Sync:** Tentativa automática de reenvio quando online
- **Retry:** Backoff exponencial (max 5 tentativas)
- **Idempotência:** Hash único evita duplicados
- **Status:** Pendente / Sincronizado / Erro

### Detecção de Rede

Monitora `navigator.onLine` e eventos `online`/`offline`:
- Indicador visual no header
- Sincronização automática quando volta online
- Botão manual para forçar sincronização

## 🧪 Testing

### Fluxo de Teste Manual

1. **Setup Inicial:**
   - Criar conta (signup)
   - Adicionar produtos de teste via SQL ou backend UI
   - Adicionar armazéns

2. **Scan & Movement:**
   - Clicar "Ler Código de Barras"
   - Permitir acesso à câmera
   - Ler código (ou inserir manualmente)
   - Ver ficha do produto
   - Selecionar tipo de movimentação
   - Submeter

3. **Offline Mode:**
   - Desactivar Wi-Fi/rede
   - Tentar scan e movimentação
   - Ver item na fila offline
   - Reactivar rede
   - Verificar sincronização automática

4. **Verificação Backend:**
   - Verificar tabelas `estoques` e `movimentacao_estoque`
   - Confirmar quantidades actualizadas
   - Ver logs nas Edge Functions

### Testes Automatizados (TODO)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Frontend (PWA)

O frontend está publicado automaticamente via Lovable:
- URL: `https://[project-id].lovableproject.com`
- Build automático em cada push
- PWA installable (manifest.json)

### Edge Functions

Deploy automático quando código é pushed:
```bash
# Lovable Cloud deploya automaticamente
# Não é necessário fazer deploy manual
```

### Variáveis de Ambiente

**IMPORTANTE:** As seguintes variáveis são geridas automaticamente pelo Lovable Cloud:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

**Não** é necessário criar ficheiros `.env` - tudo é configurado automaticamente.

## 📝 Regras de Negócio

### Movimentações

**Entrada:**
- Requer `armazem_destino_id`
- Incrementa stock no destino

**Saída:**
- Requer `armazem_origem_id`
- Verifica stock disponível
- Decrementa stock na origem
- Rejeita se `stock < quantidade`

**Transferência:**
- Requer `armazem_origem_id` E `armazem_destino_id`
- Verifica stock na origem
- Decrementa origem, incrementa destino
- Operação atómica (rollback em caso de erro)

### Validação EAN

Algoritmo Módulo 10:
```
1. Multiplicar dígitos alternadamente por 3 e 1 (da direita para esquerda)
2. Somar todos os produtos
3. Calcular checksum: (10 - (soma % 10)) % 10
4. Comparar com último dígito
```

Suportado: EAN-8, EAN-13, GTIN-14

## 🔧 Manutenção

### Adicionar Produtos

```sql
-- Via SQL
INSERT INTO produtos (sku, nome, ...) VALUES (...);
INSERT INTO product_barcodes (produto_id, ean) VALUES (...);

-- Ou via Lovable Cloud UI (Manage Cloud > Database)
```

### Ajustar Stock Manualmente

```sql
UPDATE estoques 
SET quantidade = 100 
WHERE produto_id = X AND armazem_id = Y;
```

### Ver Movimentações

```sql
SELECT 
  m.*,
  p.nome AS produto,
  ao.nome AS origem,
  ad.nome AS destino
FROM movimentacao_estoque m
JOIN produtos p ON p.id = m.produto_id
LEFT JOIN armazens ao ON ao.id = m.armazem_origem_id
LEFT JOIN armazens ad ON ad.id = m.armazem_destino_id
ORDER BY m.timestamp DESC
LIMIT 50;
```

## 🐛 Troubleshooting

### Câmera não funciona
- Verificar permissões do browser
- Usar HTTPS (camera API requer secure context)
- Testar em diferentes browsers

### Movimentações não sincronizam
- Verificar conexão à Internet
- Ver console logs (F12)
- Verificar fila offline (botão "Sincronizar")
- Ver logs das Edge Functions no Lovable Cloud

### EAN inválido
- Verificar se código tem 8, 13 ou 14 dígitos
- Confirmar checksum
- Testar com EAN conhecido (ex: produto comercial)

### Stock negativo
- Verificar constraint `quantidade >= 0` na tabela `estoques`
- Ver logs da função `processar_movimentacao`

## 📞 Suporte

**Desenvolvido para:** Sapataria do Carmo  
**Stack:** React + Supabase (Lovable Cloud)  
**Versão:** 1.0.0

---

## 🎯 Próximos Passos (Roadmap)

- [ ] Histórico de movimentações (página dedicada)
- [ ] Relatórios e analytics
- [ ] Exportação para Excel/PDF
- [ ] Gestão de utilizadores e permissões
- [ ] Integração WooCommerce (webhooks)
- [ ] Integração KeyInvoice (API)
- [ ] Notificações push
- [ ] Scanner de etiquetas impressas
- [ ] Modo tablet/kiosk optimizado
- [ ] Testes automatizados completos

## 📚 Links Úteis

- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)
- [Supabase Docs](https://supabase.com/docs)
- [ZXing Library](https://github.com/zxing-js/library)
- [shadcn/ui](https://ui.shadcn.com/)
