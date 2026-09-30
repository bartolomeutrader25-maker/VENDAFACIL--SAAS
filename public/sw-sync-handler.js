/**
 * Service Worker Background Sync Handler for VendaFácil
 * Runs in WorkerGlobalScope (Service Worker context)
 */

const DB_NAME = 'vendafacil_offline_db';
const DB_VERSION = 1;
const STORE_SALES = 'offline_sales';
const STORE_AUTH = 'offline_auth';

/**
 * Opens the offline IndexedDB database within Service Worker
 */
function openIDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      return reject(new Error('IndexedDB indisponível no Service Worker'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        db.createObjectStore(STORE_SALES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUTH)) {
        db.createObjectStore(STORE_AUTH, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Reads all pending offline sales from IndexedDB
 */
async function getPendingSalesFromIDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readonly');
    const store = tx.objectStore(STORE_SALES);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      const pending = all.filter((s) => !s.synced);
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads cached authentication credentials from IndexedDB
 */
async function getAuthFromIDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUTH, 'readonly');
    const store = tx.objectStore(STORE_AUTH);
    const req = store.get('auth');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Marks a sale as synced or removes it in IndexedDB
 */
async function markSaleSyncedInIDB(db, saleId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const delReq = store.delete(saleId);
    delReq.onsuccess = () => resolve();
    delReq.onerror = () => reject(delReq.error);
  });
}

/**
 * Executes background sync for all queued offline sales
 */
async function syncOfflineSalesInBackground() {
  console.log('[SW BackgroundSync] A iniciar sincronização de vendas em segundo plano...');
  let db;
  try {
    db = await openIDB();
  } catch (err) {
    console.error('[SW BackgroundSync] Erro ao abrir IndexedDB:', err);
    return;
  }

  const [pendingSales, authData] = await Promise.all([
    getPendingSalesFromIDB(db).catch(() => []),
    getAuthFromIDB(db).catch(() => null),
  ]);

  if (!pendingSales || pendingSales.length === 0) {
    console.log('[SW BackgroundSync] Nenhuma venda offline pendente na fila.');
    return;
  }

  console.log(`[SW BackgroundSync] ${pendingSales.length} venda(s) offline encontradas para sincronização.`);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (authData?.token) {
    headers['Authorization'] = authData.token.startsWith('Bearer ') ? authData.token : `Bearer ${authData.token}`;
  }
  if (authData?.companyId) {
    headers['x-company-id'] = authData.companyId;
  }
  if (authData?.userId) {
    headers['x-user-id'] = authData.userId;
  }

  let syncedCount = 0;
  const syncedSalesList = [];

  for (const item of pendingSales) {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...item.payload,
          offlineLocalId: item.localId || item.id,
        }),
      });

      if (response.ok) {
        const savedSale = await response.json();
        await markSaleSyncedInIDB(db, item.id);
        syncedCount++;
        syncedSalesList.push({
          localId: item.localId || item.id,
          savedSale,
          companyId: authData?.companyId || item.salePreview?.companyId,
        });
        console.log(`[SW BackgroundSync] Venda ${item.localId} sincronizada com sucesso no backend.`);
      } else {
        console.warn(`[SW BackgroundSync] Resposta ${response.status} ao sincronizar venda ${item.localId}`);
      }
    } catch (err) {
      console.error(`[SW BackgroundSync] Falha de rede ao enviar venda ${item.localId}:`, err);
    }
  }

  // Broadcast completion message to all open client tabs/windows
  if (self.clients && self.clients.matchAll) {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETED',
        syncedCount,
        syncedSales: syncedSalesList,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`[SW BackgroundSync] Ciclo finalizado. Total sincronizado: ${syncedCount}/${pendingSales.length}.`);
}

// 1. Listen to Background Sync API event ('sync')
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-sales') {
    console.log('[SW Event] Evento sync recebido para tag: sync-offline-sales');
    event.waitUntil(syncOfflineSalesInBackground());
  }
});

// 2. Listen to explicit message triggers from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
    console.log('[SW Event] Mensagem TRIGGER_BACKGROUND_SYNC recebida do cliente');
    event.waitUntil(syncOfflineSalesInBackground());
  }
});
