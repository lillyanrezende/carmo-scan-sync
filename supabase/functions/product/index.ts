// Edge Function: Consultar Produto
// Endpoint para obter informações de produto e stock

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Parse query parameters
    const url = new URL(req.url);
    const skuOrEan = url.searchParams.get('sku') || url.searchParams.get('ean');

    if (!skuOrEan) {
      throw new Error('Missing required parameter: sku or ean');
    }

    console.log('Product lookup:', skuOrEan);

    // Determine if it's an EAN (numeric and 8, 13, or 14 digits)
    const isEAN = /^\d{8}$|^\d{13}$|^\d{14}$/.test(skuOrEan);

    let produto_id: number;
    let produto: any;

    if (isEAN) {
      // Search by EAN
      const { data: barcode, error: barcodeError } = await supabase
        .from('product_barcodes')
        .select('produto_id, ean, nivel, pack_qty')
        .eq('ean', skuOrEan)
        .single();

      if (barcodeError || !barcode) {
        throw new Error(`Produto não encontrado para EAN: ${skuOrEan}`);
      }

      produto_id = barcode.produto_id;

      // Get product details
      const { data: produtoData, error: produtoError } = await supabase
        .from('produtos')
        .select(`
          id,
          sku,
          nome,
          descricao,
          marca,
          cor,
          tamanho,
          preco_custo,
          preco_venda,
          status,
          subcategorias (
            id,
            nome,
            categorias (
              id,
              nome
            )
          ),
          fornecedores (
            id,
            codigo,
            nome
          )
        `)
        .eq('id', produto_id)
        .single();

      if (produtoError || !produtoData) {
        throw new Error(`Erro ao carregar dados do produto`);
      }

      produto = {
        ...produtoData,
        barcode: barcode,
      };
    } else {
      // Search by SKU
      const { data: produtoData, error: produtoError } = await supabase
        .from('produtos')
        .select(`
          id,
          sku,
          nome,
          descricao,
          marca,
          cor,
          tamanho,
          preco_custo,
          preco_venda,
          status,
          subcategorias (
            id,
            nome,
            categorias (
              id,
              nome
            )
          ),
          fornecedores (
            id,
            codigo,
            nome
          )
        `)
        .eq('sku', skuOrEan)
        .single();

      if (produtoError || !produtoData) {
        throw new Error(`Produto não encontrado para SKU: ${skuOrEan}`);
      }

      produto = produtoData;
      produto_id = produtoData.id;

      // Get barcodes
      const { data: barcodes } = await supabase
        .from('product_barcodes')
        .select('ean, nivel, pack_qty')
        .eq('produto_id', produto_id);

      produto.barcodes = barcodes || [];
    }

    // Get stock information
    const { data: estoques, error: estoqueError } = await supabase
      .from('estoques')
      .select(`
        quantidade,
        quantidade_reservada,
        atualizado_em,
        armazens (
          id,
          codigo,
          nome,
          morada
        )
      `)
      .eq('produto_id', produto_id);

    if (estoqueError) {
      console.error('Error loading stock:', estoqueError);
    }

    const result = {
      ok: true,
      produto: produto,
      estoques: estoques || [],
      stock_total: estoques?.reduce((sum, e) => sum + parseFloat(e.quantidade || '0'), 0) || 0,
    };

    console.log('Product found:', { id: produto_id, sku: produto.sku, nome: produto.nome });

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in product function:', error);
    
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
