import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { OfflineQueue as OfflineQueueManager, QueuedMovement } from "@/lib/offline-queue";

export function OfflineQueue() {
  const [queue, setQueue] = useState<QueuedMovement[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    refreshQueue();
    
    // Refresh queue every 3 seconds
    const interval = setInterval(refreshQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const refreshQueue = () => {
    setQueue(OfflineQueueManager.getQueue());
  };

  const syncQueue = async () => {
    setSyncing(true);
    const pending = OfflineQueueManager.getPendingMovements();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro",
          description: "Não autenticado",
          variant: "destructive",
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const movement of pending) {
        try {
          const { data: response, error: invokeError } = await supabase.functions.invoke('scan', {
            body: {
              sku_or_ean: movement.sku_or_ean,
              tipo_movimentacao: movement.tipo_movimentacao,
              quantidade: movement.quantidade,
              armazem_origem_id: movement.armazem_origem_id,
              armazem_destino_id: movement.armazem_destino_id,
              usuario: movement.usuario,
              observacoes: movement.observacoes,
              timestamp: movement.timestamp,
            },
          });

          if (invokeError) {
            throw new Error(invokeError.message || 'Erro ao chamar função');
          }

          if (!response || !response.ok) {
            throw new Error(response?.error || 'Erro desconhecido');
          }

          OfflineQueueManager.markSuccess(movement.id);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to sync movement ${movement.id}:`, error);
          OfflineQueueManager.markError(movement.id, error.message);
          errorCount++;
        }
      }

      // Clear synced movements
      OfflineQueueManager.clearSyncedMovements();

      if (successCount > 0) {
        toast({
          title: "✅ Sincronização Completa",
          description: `${successCount} movimentação(ões) sincronizada(s)`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "⚠️ Erros de Sincronização",
          description: `${errorCount} movimentação(ões) falharam`,
          variant: "destructive",
        });
      }

      refreshQueue();
    } finally {
      setSyncing(false);
    }
  };

  const clearQueue = () => {
    if (confirm('Tem certeza que deseja limpar a fila? Movimentações pendentes serão perdidas.')) {
      OfflineQueueManager.saveQueue([]);
      refreshQueue();
      toast({
        title: "Fila Limpa",
        description: "Todas as movimentações foram removidas",
      });
    }
  };

  const stats = OfflineQueueManager.getStats();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          <CardTitle>Fila de Sincronização</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={syncQueue}
            disabled={syncing || stats.pendente === 0 || !navigator.onLine}
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizar...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar ({stats.pendente})
              </>
            )}
          </Button>
          {stats.total > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearQueue}
              disabled={syncing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-warning">{stats.pendente}</div>
            <div className="text-xs text-muted-foreground">Pendente</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-success">{stats.sincronizado}</div>
            <div className="text-xs text-muted-foreground">Sincronizado</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-danger">{stats.erro}</div>
            <div className="text-xs text-muted-foreground">Erro</div>
          </div>
        </div>

        {/* Queue Items */}
        {queue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma movimentação pendente</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queue.map((movement) => (
              <div
                key={movement.id}
                className="p-3 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{movement.sku_or_ean}</div>
                    <div className="text-sm text-muted-foreground">
                      {movement.tipo_movimentacao.charAt(0).toUpperCase() + 
                       movement.tipo_movimentacao.slice(1)} • {movement.quantidade} unidades
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(movement.timestamp).toLocaleString('pt-PT')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {movement.status === 'pendente' && (
                      <Badge variant="outline" className="text-warning">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                    {movement.status === 'sincronizado' && (
                      <Badge variant="outline" className="text-success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Sincronizado
                      </Badge>
                    )}
                    {movement.status === 'erro' && (
                      <Badge variant="outline" className="text-danger">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Erro
                      </Badge>
                    )}
                  </div>
                </div>
                {movement.error_message && (
                  <div className="text-xs text-danger bg-danger/10 p-2 rounded">
                    {movement.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!navigator.onLine && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
            ⚠️ Sem conexão à Internet. A sincronização será automática quando houver conexão.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
