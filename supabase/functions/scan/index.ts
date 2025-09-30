// Edge Function: Processar Scan de Barcode
// Endpoint principal para registar movimentações de stock

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  sku_or_ean: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia';
  quantidade: number;
  armazem_origem_id?: number;
  armazem_destino_id?: number;
  usuario: string;
  observacoes?: string;
  timestamp?: string;
}

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

    // Parse request
    const body: ScanRequest = await req.json();
    console.log('Scan request received:', { ...body, usuario: body.usuario });

    // Validation
    if (!body.sku_or_ean || !body.tipo_movimentacao || !body.quantidade || !body.usuario) {
      throw new Error('Missing required fields: sku_or_ean, tipo_movimentacao, quantidade, usuario');
    }

    if (body.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    // Validate EAN if it looks like one (numeric and 8, 13, or 14 digits)
    const isEAN = /^\d{8}$|^\d{13}$|^\d{14}$/.test(body.sku_or_ean);
    if (isEAN && !validateEAN(body.sku_or_ean)) {
      throw new Error(`EAN inválido: checksum incorreto para ${body.sku_or_ean}`);
    }

    // Find product by SKU or EAN
    let produto_id: number;

    if (isEAN) {
      // Search by EAN
      const { data: barcode, error: barcodeError } = await supabase
        .from('product_barcodes')
        .select('produto_id')
        .eq('ean', body.sku_or_ean)
        .single();

      if (barcodeError || !barcode) {
        throw new Error(`Produto não encontrado para EAN: ${body.sku_or_ean}`);
      }

      produto_id = barcode.produto_id;
    } else {
      // Search by SKU
      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .select('id')
        .eq('sku', body.sku_or_ean)
        .single();

      if (produtoError || !produto) {
        throw new Error(`Produto não encontrado para SKU: ${body.sku_or_ean}`);
      }

      produto_id = produto.id;
    }

    // Generate idempotency hash (simple version: usuario + produto_id + timestamp within 30 seconds window)
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    const timestampWindow = Math.floor(timestamp.getTime() / 30000); // 30-second windows
    const hashIdempotencia = `${body.usuario}-${produto_id}-${body.tipo_movimentacao}-${timestampWindow}`;

    // Call RPC function to process movement
    const { data, error } = await supabase.rpc('processar_movimentacao', {
      p_produto_id: produto_id,
      p_origem_id: body.armazem_origem_id ?? null,
      p_destino_id: body.armazem_destino_id ?? null,
      p_quantidade: body.quantidade,
      p_tipo: body.tipo_movimentacao,
      p_usuario: body.usuario,
      p_observacoes: body.observacoes ?? null,
      p_timestamp: timestamp.toISOString(),
      p_hash_idempotencia: hashIdempotencia,
    });

    if (error) {
      console.error('RPC error:', error);
      throw error;
    }

    console.log('Movement processed successfully:', data);

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in scan function:', error);
    
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        details: error.hint || error.details,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// EAN/GTIN Validator (Modulo 10 checksum)
function validateEAN(ean: string): boolean {
  if (!/^\d+$/.test(ean)) return false;
  if (![8, 13, 14].includes(ean.length)) return false;

  const digits = ean.split('').map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  let multiplier = (ean.length % 2 === 0) ? 3 : 1;

  for (const digit of digits) {
    sum += digit * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}
