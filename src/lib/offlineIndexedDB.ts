/**
 * IndexedDB helper for Offline Sales & Background Sync.
 * Works seamlessly in both Window (main thread) and Service Worker (WorkerGlobalScope) environments.
 */

export interface OfflineSaleRecord {
  id: string;
  localId: string;
  createdAt: string;
  payload: any;
  salePreview: any;
  synced: boolean;
  syncError?: string;
  retryCount?: number;
}

export interface OfflineAuthRecord {
  key: string; // 'auth'
  token?: string;
  companyId?: string;
  userId?: string;
  updatedAt: string;
}

const DB_NAME = 'vendafacil_offline_db';
const DB_VERSION = 1;
const STORE_SALES = 'offline_sales';
const STORE_AUTH = 'offline_auth';

/**
 * Opens or upgrades the IndexedDB database
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado neste ambiente.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_SALES)) {
        const salesStore = db.createObjectStore(STORE_SALES, { keyPath: 'id' });
        salesStore.createIndex('synced', 'synced', { unique: false });
        salesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_AUTH)) {
        db.createObjectStore(STORE_AUTH, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates an offline sale in IndexedDB
 */
export async function saveOfflineSaleToIDB(sale: OfflineSaleRecord): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const req = store.put(sale);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all pending (unsynced) offline sales from IndexedDB
 */
export async function getPendingOfflineSalesFromIDB(): Promise<OfflineSaleRecord[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readonly');
    const store = tx.objectStore(STORE_SALES);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OfflineSaleRecord[] = req.result || [];
      const pending = all.filter((s) => !s.synced);
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Marks a sale as synced or deletes it from IndexedDB
 */
export async function removeOfflineSaleFromIDB(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves current authentication credentials in IndexedDB so the Service Worker can authenticate background sync requests
 */
export async function saveOfflineAuthToIDB(authData: {
  token?: string;
  companyId?: string;
  userId?: string;
}): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUTH, 'readwrite');
      const store = tx.objectStore(STORE_AUTH);
      const record: OfflineAuthRecord = {
        key: 'auth',
        token: authData.token,
        companyId: authData.companyId,
        userId: authData.userId,
        updatedAt: new Date().toISOString(),
      };
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineIndexedDB] Não foi possível gravar credenciais para sync em background:', err);
  }
}

/**
 * Retrieves cached authentication credentials from IndexedDB
 */
export async function getOfflineAuthFromIDB(): Promise<OfflineAuthRecord | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUTH, 'readonly');
      const store = tx.objectStore(STORE_AUTH);
      const req = store.get('auth');

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Requests the browser to register a Background Sync tag with the Service Worker.
 * When connectivity is restored, the browser fires the 'sync' event inside the Service Worker.
 */
export async function registerBackgroundSync(tag: string = 'sync-offline-sales'): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'sync' in reg) {
        await (reg as any).sync.register(tag);
        console.log(`[BackgroundSync] Registado evento de background sync: '${tag}'`);
        return true;
      }
    } catch (err) {
      console.warn('[BackgroundSync] Falha ao registar background sync:', err);
    }
  }

  return false;
}
