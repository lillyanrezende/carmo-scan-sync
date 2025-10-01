import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseNomeComercial } from "@/lib/parse-nome-comercial";
import * as XLSX from 'xlsx';

export default function ImportarProdutos() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    success: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  // Helper function to get or create reference data
  const getOrCreateReference = async (
    table: string,
    value: string | null
  ): Promise<number | null> => {
    if (!value) return null;

    try {
      // Check if exists
      const { data: existing, error: selectError } = await supabase
        .from(table as any)
        .select('id')
        .eq('nome', value)
        .maybeSingle();

      if (existing && 'id' in existing) return Number(existing.id);

      // Create new
      const { data: created, error: insertError } = await supabase
        .from(table as any)
        .insert({ nome: value })
        .select('id')
        .single();

      if (insertError) {
        console.error(`Erro ao criar ${table}:`, insertError);
        return null;
      }

      return created && 'id' in created ? Number(created.id) : null;
    } catch (error) {
      console.error(`Erro ao processar ${table}:`, error);
      return null;
    }
  };

  // Helper for tamanhos (uses "numero" instead of "nome")
  const getOrCreateTamanho = async (value: string | null): Promise<number | null> => {
    if (!value) return null;

    try {
      const { data: existing } = await supabase
        .from('tamanhos' as any)
        .select('id')
        .eq('numero', value)
        .maybeSingle();

      if (existing && 'id' in existing) return Number(existing.id);

      const { data: created, error } = await supabase
        .from('tamanhos' as any)
        .insert({ numero: value })
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar tamanho:', error);
        return null;
      }

      return created && 'id' in created ? Number(created.id) : null;
    } catch (error) {
      console.error('Erro ao processar tamanho:', error);
      return null;
    }
  };

  // Helper for subcategoria (needs categoria_id)
  const getOrCreateSubcategoria = async (
    subcategoriaName: string | null,
    categoriaName: string | null
  ): Promise<number | null> => {
    if (!subcategoriaName) return null;

    try {
      // First get or create categoria
      let categoriaId: number | null = null;
      if (categoriaName) {
        const { data: existingCat } = await supabase
          .from('categorias')
          .select('id')
          .eq('nome', categoriaName)
          .maybeSingle();

        if (existingCat && 'id' in existingCat) {
          categoriaId = Number(existingCat.id);
        } else {
          const { data: createdCat } = await supabase
            .from('categorias')
            .insert({ nome: categoriaName })
            .select('id')
            .single();
          categoriaId = createdCat && 'id' in createdCat ? Number(createdCat.id) : null;
        }
      }

      // Then get or create subcategoria
      const { data: existingSub } = await supabase
        .from('subcategorias')
        .select('id')
        .eq('nome', subcategoriaName)
        .maybeSingle();

      if (existingSub && 'id' in existingSub) return Number(existingSub.id);

      const { data: createdSub, error } = await supabase
        .from('subcategorias')
        .insert({ 
          nome: subcategoriaName,
          categoria_id: categoriaId 
        })
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar subcategoria:', error);
        return null;
      }

      return createdSub && 'id' in createdSub ? Number(createdSub.id) : null;
    } catch (error) {
      console.error('Erro ao processar subcategoria:', error);
      return null;
    }
  };

  // Helper for armazem
  const getOrCreateArmazem = async (value: string | null): Promise<number | null> => {
    if (!value) return null;

    try {
      const { data: existing } = await supabase
        .from('armazens')
        .select('id')
        .eq('nome', value)
        .maybeSingle();

      if (existing && 'id' in existing) return Number(existing.id);

      const { data: created, error } = await supabase
        .from('armazens')
        .insert({ 
          nome: value,
          codigo: value.substring(0, 20) // Generate a simple code
        })
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar armazem:', error);
        return null;
      }

      return created && 'id' in created ? Number(created.id) : null;
    } catch (error) {
      console.error('Erro ao processar armazem:', error);
      return null;
    }
  };

  const processExcel = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      // Ler o arquivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Dados do Excel:', jsonData);

      const total = jsonData.length;
      let success = 0;
      const errors: string[] = [];

      // Processar cada linha
      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        
        try {
          // Extrair dados
          const gtin = row['GTIN']?.toString().trim();
          const codigoInterno = row['Código Interno']?.toString().trim();
          const marca = row['Marca']?.toString().trim();
          const nomeComercial = row['Nome Comercial']?.toString().trim();
          const tipoProduto = row['Tipo de Produto']?.toString().trim();
          
          if (!gtin || !nomeComercial) {
            errors.push(`Linha ${i + 2}: GTIN ou Nome Comercial em falta`);
            continue;
          }

          // Parse do Nome Comercial
          const parsed = parseNomeComercial(nomeComercial);

          // Get or create all reference IDs
          const [
            subcategoriaId,
            designId,
            corId,
            tamanhoId,
            solaId,
            tipoPeleId,
            formaId,
            tipoConstrucaoId,
            armazemId
          ] = await Promise.all([
            getOrCreateSubcategoria(parsed.subcategoria, parsed.categoria),
            getOrCreateReference('designs', parsed.design),
            getOrCreateReference('cores', parsed.cor),
            getOrCreateTamanho(parsed.tamanho),
            getOrCreateReference('tipo_de_sola', parsed.sola),
            getOrCreateReference('tipo_de_pele', parsed.tipo_pele),
            getOrCreateReference('formas', parsed.forma_sapatos),
            getOrCreateReference('tipo_de_construcao', parsed.tipo_construcao),
            getOrCreateArmazem(parsed.armazem)
          ]);

          // Verificar se o produto já existe
          const { data: existingProduct } = await supabase
            .from('produtos')
            .select('id')
            .eq('sku', gtin)
            .maybeSingle();

          if (existingProduct) {
            // Atualizar produto existente
            const { error: updateError } = await supabase
              .from('produtos')
              .update({
                sku: codigoInterno || gtin,
                nome: parsed.nome || nomeComercial,
                nome_comercial: nomeComercial,
                tipo_produto: tipoProduto,
                marca: marca || parsed.categoria,
                subcategoria_id: subcategoriaId,
                designs_id: designId,
                cores_id: corId,
                tamanhos_id: tamanhoId,
                tipo_de_sola_id: solaId,
                tipo_de_pele_id: tipoPeleId,
                formas_id: formaId,
                tipo_de_construcao_id: tipoConstrucaoId,
                armazem_id: armazemId,
                atualizado_em: new Date().toISOString(),
              })
              .eq('id', existingProduct.id);

            if (updateError) {
              errors.push(`Linha ${i + 2} (${gtin}): ${updateError.message}`);
              continue;
            }

            // Criar/atualizar barcode
            const { error: barcodeError } = await supabase
              .from('product_barcodes')
              .upsert({
                produto_id: existingProduct.id,
                ean: gtin,
                nivel: 'unit',
                pack_qty: 1,
              }, {
                onConflict: 'ean',
              });

            if (barcodeError) {
              console.warn(`Aviso: Erro ao criar barcode para ${gtin}:`, barcodeError.message);
            }

            success++;
          } else {
            // Criar novo produto
            const { data: newProduct, error: insertError } = await supabase
              .from('produtos')
              .insert({
                sku: codigoInterno || gtin,
                nome: parsed.nome || nomeComercial,
                nome_comercial: nomeComercial,
                tipo_produto: tipoProduto,
                marca: marca || parsed.categoria,
                subcategoria_id: subcategoriaId,
                designs_id: designId,
                cores_id: corId,
                tamanhos_id: tamanhoId,
                tipo_de_sola_id: solaId,
                tipo_de_pele_id: tipoPeleId,
                formas_id: formaId,
                tipo_de_construcao_id: tipoConstrucaoId,
                armazem_id: armazemId,
                status: 'ativo',
              })
              .select('id')
              .single();

            if (insertError) {
              errors.push(`Linha ${i + 2} (${gtin}): ${insertError.message}`);
              continue;
            }

            // Criar barcode
            if (newProduct) {
              const { error: barcodeError } = await supabase
                .from('product_barcodes')
                .insert({
                  produto_id: newProduct.id,
                  ean: gtin,
                  nivel: 'unit',
                  pack_qty: 1,
                });

              if (barcodeError) {
                console.warn(`Aviso: Erro ao criar barcode para ${gtin}:`, barcodeError.message);
              }
            }

            success++;
          }
        } catch (error: any) {
          errors.push(`Linha ${i + 2}: ${error.message}`);
        }

        // Atualizar progresso
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setResults({ total, success, errors });

      if (success > 0) {
        toast({
          title: "Importação concluída",
          description: `${success} de ${total} produtos processados com sucesso`,
        });
      }

    } catch (error: any) {
      console.error('Erro ao processar Excel:', error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Importar Produtos do Excel
          </CardTitle>
          <CardDescription>
            Faça upload do arquivo Excel com os códigos de barras. O sistema irá extrair automaticamente as informações do campo "Nome Comercial".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Arquivo Excel (.xlsx)</label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={processing}
              />
              {file && !processing && (
                <Button onClick={processExcel} className="whitespace-nowrap">
                  <Upload className="w-4 h-4 mr-2" />
                  Processar
                </Button>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Ficheiro selecionado: {file.name}
              </p>
            )}
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>A processar...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <Alert variant={results.errors.length > 0 ? "default" : "default"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Processados: {results.success}/{results.total}</strong>
                  <p className="text-sm mt-1">
                    {results.success} produtos atualizados/criados com sucesso
                  </p>
                </AlertDescription>
              </Alert>

              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erros encontrados ({results.errors.length}):</strong>
                    <div className="mt-2 max-h-48 overflow-y-auto text-xs space-y-1">
                      {results.errors.slice(0, 20).map((error, idx) => (
                        <div key={idx} className="font-mono">• {error}</div>
                      ))}
                      {results.errors.length > 20 && (
                        <div className="italic">... e mais {results.errors.length - 20} erros</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="border rounded-lg p-4 bg-muted/50 text-sm space-y-2">
            <h4 className="font-medium">Formato esperado do Excel:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>GTIN</strong>: Código de barras EAN</li>
              <li><strong>Código Interno</strong>: SKU/código interno do produto (opcional, usa GTIN se vazio)</li>
              <li><strong>Marca</strong>: Marca do produto</li>
              <li><strong>Nome Comercial</strong>: Nome completo do produto (será guardado e parseado)</li>
              <li><strong>Tipo de Produto</strong>: Categoria/tipo do produto</li>
              <li className="text-xs mt-2">O <strong>Nome Comercial</strong> pode ter informações separadas por " - ":</li>
              <ul className="list-disc list-inside ml-6 text-xs">
                <li>Categoria - Subcategoria - Nome - Design - Cor - Tamanho - Sola - Tipo de pele - Forma de Sapatos - Tipo de Construção - Armazém</li>
              </ul>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
