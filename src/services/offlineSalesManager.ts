import { Sale, Product } from '../types/index.js';
import {
  saveOfflineSaleToIDB,
  getPendingOfflineSalesFromIDB,
  removeOfflineSaleFromIDB,
  saveOfflineAuthToIDB,
  registerBackgroundSync,
} from '../lib/offlineIndexedDB.js';
import { firestoreSyncService } from './firestoreSyncService.js';

export interface PendingOfflineSale {
  id: string;
  localId: string;
  createdAt: string;
  payload: any;
  salePreview: Sale;
  synced: boolean;
  syncError?: string;
}

const QUEUE_KEY = 'vf_offline_sales_queue';
const CACHED_PRODUCTS_KEY = 'vf_cached_products_catalog';

class OfflineSalesManager {
  private queue: PendingOfflineSale[] = [];
  private isSyncing: boolean = false;
  private listeners: Array<(queue: PendingOfflineSale[]) => void> = [];
  private syncListeners: Array<(isSyncing: boolean) => void> = [];
  private lastSyncTimestamp: string | null = null;

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      this.lastSyncTimestamp = localStorage.getItem('vf_last_sync_time');

      // Hydrate queue from IndexedDB to ensure consistency with Service Worker
      this.syncQueueFromIndexedDB();

      // Listen to network restoration (immediate fallback alongside Service Worker sync)
      window.addEventListener('online', () => {
        console.log('[OfflineSalesManager] Conexão de rede restabelecida. Disparando sincronização...');
        this.triggerBackgroundSync();
        this.syncPendingSales();
      });

      // Listen to Service Worker Background Sync broadcasts
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', async (event) => {
          if (event.data && event.data.type === 'BACKGROUND_SYNC_COMPLETED') {
            console.log('[OfflineSalesManager] Background Sync do Service Worker concluído:', event.data);

            // Replicate synced sales to Cloud Firestore
            if (Array.isArray(event.data.syncedSales)) {
              for (const s of event.data.syncedSales) {
                if (s.savedSale && s.companyId) {
                  firestoreSyncService.persistSaleToFirestore(s.companyId, s.savedSale, s.localId).catch((err) => {
                    console.warn('[OfflineSalesManager] Falha ao persistir venda do SW no Firestore:', err);
                  });
                }
              }
            }

            await this.syncQueueFromIndexedDB();
            this.lastSyncTimestamp = event.data.timestamp || new Date().toISOString();
            try {
              localStorage.setItem('vf_last_sync_time', this.lastSyncTimestamp!);
            } catch {}
            this.notifyListeners();
            this.notifySyncListeners();
          }
        });
      }
    }
  }

  /**
   * Synchronizes in-memory and localStorage queue with IndexedDB
   */
  public async syncQueueFromIndexedDB() {
    if (typeof window === 'undefined') return;
    try {
      const idbSales = await getPendingOfflineSalesFromIDB();
      if (Array.isArray(idbSales)) {
        // Merge or replace
        const idbMap = new Map(idbSales.map((s) => [s.id, s]));
        // Keep pending items
        this.queue = idbSales.map((s) => ({
          id: s.id,
          localId: s.localId,
          createdAt: s.createdAt,
          payload: s.payload,
          salePreview: s.salePreview,
          synced: s.synced,
          syncError: s.syncError,
        }));
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
        this.notifyListeners();
      }
    } catch (err) {
      console.warn('[OfflineSalesManager] Aviso ao sincronizar com IndexedDB:', err);
    }
  }

  private loadQueue() {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (e) {
      console.error('[OfflineSalesManager] Erro ao carregar fila offline:', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.error('[OfflineSalesManager] Erro ao salvar fila offline:', e);
    }
  }

  public subscribe(callback: (queue: PendingOfflineSale[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.queue);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public subscribeSync(callback: (isSyncing: boolean) => void): () => void {
    this.syncListeners.push(callback);
    callback(this.isSyncing);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTimestamp;
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb([...this.queue]));
  }

  private notifySyncListeners() {
    this.syncListeners.forEach((cb) => cb(this.isSyncing));
  }

  public getPendingQueue(): PendingOfflineSale[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((s) => !s.synced).length;
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Cache local products for offline access and stock updates
   */
  public cacheProducts(products: Product[]) {
    if (typeof window === 'undefined' || !Array.isArray(products)) return;
    try {
      localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      // quota limit
    }
  }

  public getCachedProducts(): Product[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(CACHED_PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Optimistically decrements local cached stock when an offline sale occurs
   */
  private updateLocalProductStock(items: Array<{ productId: string; quantity: number }>) {
    try {
      const cached = this.getCachedProducts();
      if (!cached.length) return;

      const updated = cached.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (item) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock - item.quantity),
          };
        }
        return p;
      });

      this.cacheProducts(updated);
    } catch (e) {
      console.warn('Erro ao atualizar estoque local:', e);
    }
  }

  /**
   * Enqueues an offline sale, saves to IndexedDB and registers background sync
   */
  public enqueueSale(
    payload: any,
    currentUser: { id: string; name: string } | null,
    company: { id: string; name: string; currency?: string } | null,
    productsList: Product[]
  ): Sale {
    const timestamp = Date.now();
    const localId = `offline-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    const saleNumber = `VF-OFF-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${timestamp.toString().slice(-4)}`;

    // Build items with name, costPrice, etc.
    let calculatedSubtotal = 0;
    let calculatedProfit = 0;

    const items = (payload.items || []).map((it: any, idx: number) => {
      const product = productsList.find((p) => p.id === it.productId);
      const unitPrice = Number(it.unitPrice || product?.salePrice || product?.sellingPrice || 0);
      const costPrice = Number(product?.costPrice || 0);
      const quantity = Number(it.quantity || 1);
      const subtotal = unitPrice * quantity;
      const profit = (unitPrice - costPrice) * quantity;

      calculatedSubtotal += subtotal;
      calculatedProfit += profit;

      return {
        id: `item-${localId}-${idx}`,
        productId: it.productId,
        productName: it.productName || product?.name || 'Produto',
        quantity,
        unitPrice,
        costPrice,
        subtotal,
        unit: product?.unit || 'un',
      };
    });

    const discount = Number(payload.discount || 0);
    const total = Math.max(0, calculatedSubtotal - discount);
    const profit = Math.max(0, calculatedProfit - discount);

    const salePreview: Sale = {
      id: localId,
      saleNumber,
      companyId: company?.id || 'comp-offline',
      userId: currentUser?.id || 'offline-usr',
      userName: currentUser?.name || 'Operador (Modo Offline)',
      customerId: payload.customerId,
      customerName: payload.customerName,
      items,
      subtotal: calculatedSubtotal,
      discount,
      total,
      profit,
      paymentMethod: payload.paymentMethod || 'dinheiro',
      paymentStatus: 'pago',
      paidAmount: payload.paidAmount !== undefined ? Number(payload.paidAmount) : total,
      changeAmount: payload.changeAmount !== undefined ? Number(payload.changeAmount) : 0,
      notes: (payload.notes ? payload.notes + ' ' : '') + `[Offline ID: ${localId}]`,
      createdAt: new Date().toISOString(),
    };

    const pendingItem: PendingOfflineSale = {
      id: localId,
      localId,
      createdAt: salePreview.createdAt,
      payload: {
        ...payload,
        offlineLocalId: localId,
        offlineTimestamp: timestamp,
      },
      salePreview,
      synced: false,
    };

    this.queue.unshift(pendingItem);
    this.saveQueue();

    // 1. Decrement local inventory
    this.updateLocalProductStock(payload.items || []);

    // 2. Persist to IndexedDB so the Service Worker has access
    saveOfflineSaleToIDB(pendingItem).catch((err) =>
      console.warn('[OfflineSalesManager] Falha ao gravar no IndexedDB:', err)
    );

    // 3. Save auth credentials in IndexedDB for the Service Worker
    const token = localStorage.getItem('vf_auth_token') || undefined;
    const companyId = company?.id || localStorage.getItem('vf_selected_company_id') || undefined;
    const userId = currentUser?.id || localStorage.getItem('vf_user_id') || undefined;
    saveOfflineAuthToIDB({ token, companyId, userId });

    // 4. Register Background Sync with Service Worker
    registerBackgroundSync('sync-offline-sales');

    return salePreview;
  }

  /**
   * Prompts the Service Worker to run background sync or registers the sync tag
   */
  public async triggerBackgroundSync(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Try SyncManager
    const registered = await registerBackgroundSync('sync-offline-sales');

    // 2. Post direct message to Service Worker controller
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TRIGGER_BACKGROUND_SYNC',
      });
      return true;
    }

    return registered;
  }

  /**
   * Syncs pending sales to the server API and replicates to Cloud Firestore
   */
  public async syncPendingSales(apiCreateSaleFn?: (payload: any) => Promise<any>): Promise<{
    syncedCount: number;
    failedCount: number;
  }> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0 };
    }

    if (!this.isOnline()) {
      return { syncedCount: 0, failedCount: this.getPendingCount() };
    }

    const pending = this.queue.filter((s) => !s.synced);
    if (pending.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notifySyncListeners();
    let syncedCount = 0;
    let failedCount = 0;

    // Default fetch execution
    const executeSync =
      apiCreateSaleFn ||
      (async (payload: any) => {
        const token = localStorage.getItem('vf_auth_token');
        const companyId = localStorage.getItem('vf_selected_company_id');
        const userId = localStorage.getItem('vf_user_id');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        if (companyId) headers['x-company-id'] = companyId;
        if (userId) headers['x-user-id'] = userId;

        const res = await fetch('/api/sales', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao sincronizar venda');
        }
        return res.json();
      });

    for (const item of pending) {
      try {
        const savedSale = await executeSync(item.payload);
        item.synced = true;
        item.syncError = undefined;
        syncedCount++;

        // Remove from IndexedDB
        await removeOfflineSaleFromIDB(item.id).catch(() => {});

        // Replicate directly to Cloud Firestore
        const compId =
          item.salePreview?.companyId ||
          savedSale?.companyId ||
          localStorage.getItem('vf_selected_company_id') ||
          'comp-default';

        if (savedSale && compId) {
          firestoreSyncService
            .persistSaleToFirestore(compId, savedSale, item.localId)
            .catch((err) => {
              console.warn('[OfflineSalesManager] Aviso na persistência Cloud Firestore:', err);
            });
        }
      } catch (err: any) {
        console.error(`[OfflineSalesManager] Falha ao sincronizar venda ${item.localId}:`, err);
        item.syncError = err?.message || 'Erro de sincronização';
        failedCount++;
      }
    }

    // Retain only unsynced or failed items
    this.queue = this.queue.filter((item) => !item.synced);
    this.saveQueue();
    this.isSyncing = false;
    this.lastSyncTimestamp = new Date().toISOString();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vf_last_sync_time', this.lastSyncTimestamp);
      } catch {}
    }
    this.notifySyncListeners();

    return { syncedCount, failedCount };
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineSalesManager = new OfflineSalesManager();
