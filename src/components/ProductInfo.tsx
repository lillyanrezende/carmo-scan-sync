import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductInfoProps {
  code: string;
}

interface ProductData {
  produto: any;
  estoques: any[];
  stock_total: number;
}

export function ProductInfo({ code }: ProductInfoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductData | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Não autenticado");
        }

        // Determine if code is SKU or EAN
        const isEAN = /^\d{8}$|^\d{13}$|^\d{14}$/.test(code);
        const queryParam = isEAN ? `ean=${code}` : `sku=${code}`;

        const response = await supabase.functions.invoke(`product?${queryParam}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          throw response.error;
        }

        if (!response.data || !response.data.ok) {
          throw new Error(response.data?.error || 'Produto não encontrado');
        }

        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching product:', err);
        setError(err.message || 'Erro ao carregar produto');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [code]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'Produto não encontrado'}</AlertDescription>
      </Alert>
    );
  }

  const { produto, estoques, stock_total } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{produto.nome}</CardTitle>
              <p className="text-sm text-muted-foreground">SKU: {produto.sku}</p>
            </div>
          </div>
          <Badge variant={produto.status === 'ativo' ? 'default' : 'secondary'}>
            {produto.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Details */}
        {produto.descricao && (
          <p className="text-sm text-muted-foreground">{produto.descricao}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {produto.marca && (
            <div>
              <span className="font-medium">Marca:</span> {produto.marca}
            </div>
          )}
          {produto.cor && (
            <div>
              <span className="font-medium">Cor:</span> {produto.cor}
            </div>
          )}
          {produto.tamanho && (
            <div>
              <span className="font-medium">Tamanho:</span> {produto.tamanho}
            </div>
          )}
          {produto.subcategorias && (
            <div>
              <span className="font-medium">Categoria:</span>{" "}
              {produto.subcategorias.categorias?.nome} / {produto.subcategorias.nome}
            </div>
          )}
        </div>

        {/* Stock Information */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Stock Disponível</h3>
          
          <div className="mb-3 p-3 bg-accent rounded-lg">
            <div className="text-2xl font-bold text-foreground">{stock_total}</div>
            <div className="text-sm text-muted-foreground">Total em Stock</div>
          </div>

          {estoques.length > 0 && (
            <div className="space-y-2">
              {estoques.map((estoque: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <span className="text-sm font-medium">
                    {estoque.armazens.nome}
                  </span>
                  <Badge variant="outline">{estoque.quantidade} unidades</Badge>
                </div>
              ))}
            </div>
          )}

          {estoques.length === 0 && (
            <Alert>
              <AlertDescription>
                Sem stock em nenhum armazém
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
