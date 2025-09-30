import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, X } from "lucide-react";
import { OfflineQueue } from "@/lib/offline-queue";

interface MovementFormProps {
  code: string;
  userName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type TipoMovimentacao = "entrada" | "saida" | "transferencia";

export function MovementForm({ code, userName, onComplete, onCancel }: MovementFormProps) {
  const [loading, setLoading] = useState(false);
  const [armazens, setArmazens] = useState<any[]>([]);
  const [tipo, setTipo] = useState<TipoMovimentacao>("entrada");
  const [quantidade, setQuantidade] = useState("1");
  const [origemId, setOrigemId] = useState<string>("");
  const [destinoId, setDestinoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    // Fetch warehouses
    async function fetchArmazens() {
      const { data } = await supabase
        .from("armazens")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (data) {
        setArmazens(data);
        
        // Set defaults
        if (data.length > 0) {
          if (tipo === "entrada" || tipo === "transferencia") {
            setDestinoId(data[0].id.toString());
          }
          if (tipo === "saida" || tipo === "transferencia") {
            setOrigemId(data[0].id.toString());
          }
        }
      }
    }

    fetchArmazens();
  }, []);

  useEffect(() => {
    // Reset warehouse selections when type changes
    if (armazens.length > 0) {
      const firstId = armazens[0].id.toString();
      
      if (tipo === "entrada") {
        setDestinoId(firstId);
        setOrigemId("");
      } else if (tipo === "saida") {
        setOrigemId(firstId);
        setDestinoId("");
      } else {
        if (!origemId) setOrigemId(firstId);
        if (!destinoId) setDestinoId(armazens[1]?.id.toString() || firstId);
      }
    }
  }, [tipo, armazens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const qtd = parseFloat(quantidade);
      if (isNaN(qtd) || qtd <= 0) {
        throw new Error("Quantidade inválida");
      }

      const movimento = {
        sku_or_ean: code,
        tipo_movimentacao: tipo,
        quantidade: qtd,
        armazem_origem_id: origemId ? parseInt(origemId) : undefined,
        armazem_destino_id: destinoId ? parseInt(destinoId) : undefined,
        usuario: userName,
        observacoes: observacoes || undefined,
        timestamp: new Date().toISOString(),
      };

      // Try to send immediately if online
      const { data: { session } } = await supabase.auth.getSession();
      
      if (navigator.onLine && session) {
        try {
          const response = await supabase.functions.invoke('scan', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: movimento,
          });

          if (response.error) {
            throw response.error;
          }

          if (!response.data.ok) {
            throw new Error(response.data.error);
          }

          toast({
            title: "✅ Movimentação Registada",
            description: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} de ${qtd} unidades`,
          });

          // Play success sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPTgjMGHm7A7+OZURAMBEVL');
          audio.play().catch(() => {});

          onComplete();
        } catch (error) {
          console.error('Online submission failed, queuing:', error);
          // If online submission fails, queue it
          OfflineQueue.addMovement(movimento);
          
          toast({
            title: "📥 Movimentação em Fila",
            description: "Será sincronizada quando possível",
          });

          onComplete();
        }
      } else {
        // Offline - add to queue
        OfflineQueue.addMovement(movimento);
        
        toast({
          title: "📥 Movimentação em Fila Offline",
          description: "Será sincronizada quando houver conexão",
        });

        onComplete();
      }
    } catch (error: any) {
      console.error('Movement error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao registar movimentação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = () => {
    switch (tipo) {
      case "entrada":
        return <ArrowDownCircle className="w-5 h-5 text-success" />;
      case "saida":
        return <ArrowUpCircle className="w-5 h-5 text-danger" />;
      case "transferencia":
        return <ArrowRightLeft className="w-5 h-5 text-warning" />;
    }
  };

  const getTipoColor = () => {
    switch (tipo) {
      case "entrada": return "text-success";
      case "saida": return "text-danger";
      case "transferencia": return "text-warning";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {getTipoIcon()}
          <CardTitle>Registar Movimentação</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Movimentação</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimentacao)}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">
                  <span className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-success" />
                    Entrada
                  </span>
                </SelectItem>
                <SelectItem value="saida">
                  <span className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-danger" />
                    Saída
                  </span>
                </SelectItem>
                <SelectItem value="transferencia">
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-warning" />
                    Transferência
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(tipo === "saida" || tipo === "transferencia") && (
            <div className="space-y-2">
              <Label htmlFor="origem">Armazém de Origem</Label>
              <Select value={origemId} onValueChange={setOrigemId}>
                <SelectTrigger id="origem">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {armazens.map((arm) => (
                    <SelectItem key={arm.id} value={arm.id.toString()}>
                      {arm.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(tipo === "entrada" || tipo === "transferencia") && (
            <div className="space-y-2">
              <Label htmlFor="destino">Armazém de Destino</Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger id="destino">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {armazens.map((arm) => (
                    <SelectItem key={arm.id} value={arm.id.toString()}>
                      {arm.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              min="0.01"
              step="0.01"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione notas sobre esta movimentação..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              variant={
                tipo === "entrada" ? "default" :
                tipo === "saida" ? "destructive" : "secondary"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                `Registar ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
