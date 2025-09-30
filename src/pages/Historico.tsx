import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, Package, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Movimentacao {
  id: number;
  produto_id: number;
  tipo_movimentacao: string;
  quantidade: number;
  usuario: string;
  timestamp: string;
  observacoes?: string;
  produtos?: {
    sku: string;
    nome: string;
  };
  armazem_origem?: {
    nome: string;
  };
  armazem_destino?: {
    nome: string;
  };
}

export default function Historico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMovimentacoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("movimentacao_estoque")
        .select(`
          id,
          produto_id,
          tipo_movimentacao,
          quantidade,
          usuario,
          timestamp,
          observacoes,
          produtos (sku, nome),
          armazem_origem:armazens!movimentacao_estoque_armazem_origem_id_fkey (nome),
          armazem_destino:armazens!movimentacao_estoque_armazem_destino_id_fkey (nome)
        `)
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      // Note: This requires admin privileges
      const { error } = await supabase
        .from("movimentacao_estoque")
        .delete()
        .neq("id", 0); // Delete all records

      if (error) throw error;

      toast({
        title: "Histórico apagado",
        description: "Todo o histórico de movimentações foi removido",
      });
      
      setMovimentacoes([]);
    } catch (error: any) {
      console.error("Erro ao apagar histórico:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível apagar o histórico. Verifique as permissões.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadMovimentacoes();
  }, []);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "📥";
      case "saida":
        return "📤";
      case "transferencia":
        return "🔄";
      default:
        return "📦";
    }
  };

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "bg-green-100 text-green-800 border-green-200";
      case "saida":
        return "bg-red-100 text-red-800 border-red-200";
      case "transferencia":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {movimentacoes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Apagar Histórico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar todo o histórico?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todo o histórico de movimentações será permanentemente removido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-2">Histórico de Movimentações</h1>
          <p className="text-muted-foreground">
            Últimas 100 movimentações de stock registadas
          </p>
        </Card>

        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">A carregar histórico...</span>
            </div>
          </Card>
        ) : movimentacoes.length === 0 ? (
          <Card className="p-8">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Sem movimentações registadas. Comece a escanear produtos para ver o histórico aqui.
              </AlertDescription>
            </Alert>
          </Card>
        ) : (
          <div className="space-y-3">
            {movimentacoes.map((mov) => (
              <Card key={mov.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl mt-1">
                      {getTipoIcon(mov.tipo_movimentacao)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getTipoBadgeClass(mov.tipo_movimentacao)}`}>
                          {mov.tipo_movimentacao.toUpperCase()}
                        </span>
                        <span className="font-medium">
                          {mov.produtos?.nome || `Produto #${mov.produto_id}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>SKU: {mov.produtos?.sku || 'N/A'}</span>
                        <span>•</span>
                        <span className="font-medium">Qtd: {mov.quantidade}</span>
                      </div>

                      {(mov.armazem_origem || mov.armazem_destino) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {mov.armazem_origem && (
                            <span>De: {mov.armazem_origem.nome}</span>
                          )}
                          {mov.armazem_origem && mov.armazem_destino && (
                            <ArrowRight className="w-4 h-4" />
                          )}
                          {mov.armazem_destino && (
                            <span>Para: {mov.armazem_destino.nome}</span>
                          )}
                        </div>
                      )}

                      {mov.observacoes && (
                        <p className="text-sm text-muted-foreground italic">
                          {mov.observacoes}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{mov.usuario}</span>
                        <span>•</span>
                        <span>{format(new Date(mov.timestamp), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
