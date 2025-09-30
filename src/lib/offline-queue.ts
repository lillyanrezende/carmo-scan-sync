// Offline Queue Manager para operações pendentes
export interface QueuedMovement {
  id: string;
  sku_or_ean: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia';
  quantidade: number;
  armazem_origem_id?: number;
  armazem_destino_id?: number;
  usuario: string;
  observacoes?: string;
  timestamp: string;
  retry_count: number;
  status: 'pendente' | 'sincronizado' | 'erro';
  error_message?: string;
}

const QUEUE_KEY = 'carmo_scan_queue';
const MAX_RETRIES = 5;

export class OfflineQueue {
  static getQueue(): QueuedMovement[] {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static saveQueue(queue: QueuedMovement[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  static addMovement(movement: Omit<QueuedMovement, 'id' | 'retry_count' | 'status'>): string {
    const queue = this.getQueue();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMovement: QueuedMovement = {
      ...movement,
      id,
      retry_count: 0,
      status: 'pendente',
    };

    queue.push(queuedMovement);
    this.saveQueue(queue);
    
    console.log('Movement added to offline queue:', id);
    return id;
  }

  static markSuccess(id: string): void {
    const queue = this.getQueue();
    const updated = queue.map(m => 
      m.id === id ? { ...m, status: 'sincronizado' as const } : m
    );
    this.saveQueue(updated);
  }

  static markError(id: string, error: string): void {
    const queue = this.getQueue();
    const updated = queue.map(m => 
      m.id === id ? { 
        ...m, 
        status: 'erro' as const, 
        retry_count: m.retry_count + 1,
        error_message: error
      } : m
    );
    this.saveQueue(updated);
  }

  static getPendingMovements(): QueuedMovement[] {
    return this.getQueue().filter(m => 
      m.status === 'pendente' && m.retry_count < MAX_RETRIES
    );
  }

  static clearSyncedMovements(): void {
    const queue = this.getQueue();
    const filtered = queue.filter(m => m.status !== 'sincronizado');
    this.saveQueue(filtered);
  }

  static getStats() {
    const queue = this.getQueue();
    return {
      total: queue.length,
      pendente: queue.filter(m => m.status === 'pendente').length,
      sincronizado: queue.filter(m => m.status === 'sincronizado').length,
      erro: queue.filter(m => m.status === 'erro').length,
    };
  }
}
