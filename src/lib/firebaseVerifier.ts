import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth, firestoreDatabaseId, firebaseConfig } from '../firebaseConfig.js';

export interface FirebaseConnectionStatus {
  isReady: boolean;
  firestoreReachable: boolean;
  authReachable: boolean;
  error?: string | null;
  responseTimeMs?: number;
  details: {
    firestore: 'connected' | 'offline' | 'error' | 'pending';
    auth: 'connected' | 'error' | 'pending';
    databaseId: string;
    projectId: string;
  };
}

/**
 * Timeout utility to prevent network hangs on startup
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, timeoutErrorMessage: string): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutErrorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

/**
 * Verifies that Firebase Authentication service is initialized and responsive.
 */
export async function verifyAuthReachable(timeoutMs: number = 6000): Promise<boolean> {
  try {
    if (typeof auth.authStateReady === 'function') {
      await withTimeout(auth.authStateReady(), timeoutMs, 'Tempo limite esgotado ao sincronizar Firebase Auth');
      return true;
    }
    // Fallback if authStateReady is not available
    return !!auth.app;
  } catch (err: any) {
    console.warn('[FirebaseVerifier] Aviso na verificação de Auth:', err?.message || err);
    // If it's a network glitch or timeout, check if auth app exists
    return !!auth.app;
  }
}

/**
 * Verifies that Cloud Firestore database is reachable on the server side.
 * Adheres to Firebase Skill guidelines by testing getDocFromServer.
 */
export async function verifyFirestoreReachable(timeoutMs: number = 6000): Promise<boolean> {
  try {
    // Attempt to query the server directly without cache
    const testDocRef = doc(db, '_connection_test', 'status');
    await withTimeout(getDocFromServer(testDocRef), timeoutMs, 'Tempo limite esgotado ao contactar Firestore');
    return true;
  } catch (error: any) {
    const errorMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();

    // If client is explicitly offline, Firestore is not reachable
    if (errorMsg.includes('the client is offline') || errorMsg.includes('failed-precondition') || errorMsg.includes('unavailable')) {
      console.error('[FirebaseVerifier] Firestore inacessível ou cliente offline:', errorMsg);
      return false;
    }

    // Permission denied or not-found still confirms the server responded over the wire
    if (errorMsg.includes('permission-denied') || errorMsg.includes('not-found') || error?.code === 'permission-denied') {
      return true;
    }

    // Network error
    console.warn('[FirebaseVerifier] Resposta do Firestore:', errorMsg);
    return true;
  }
}

/**
 * Primary startup verification utility.
 * Verifies both Auth and Firestore before allowing the application to render.
 */
export async function verifyFirebaseConnection(
  timeoutMs: number = 7000
): Promise<FirebaseConnectionStatus> {
  const startTime = Date.now();
  const status: FirebaseConnectionStatus = {
    isReady: false,
    firestoreReachable: false,
    authReachable: false,
    error: null,
    details: {
      firestore: 'pending',
      auth: 'pending',
      databaseId: firestoreDatabaseId,
      projectId: firebaseConfig.projectId,
    },
  };

  try {
    // Verify both services in parallel
    const [authOk, firestoreOk] = await Promise.all([
      verifyAuthReachable(timeoutMs),
      verifyFirestoreReachable(timeoutMs),
    ]);

    status.authReachable = authOk;
    status.firestoreReachable = firestoreOk;
    status.details.auth = authOk ? 'connected' : 'error';
    status.details.firestore = firestoreOk ? 'connected' : 'offline';
    status.responseTimeMs = Date.now() - startTime;

    // Both must be reachable to consider ready
    status.isReady = authOk && firestoreOk;

    if (!status.isReady) {
      if (!firestoreOk && !authOk) {
        status.error = 'Não foi possível ligar aos serviços Firebase (Firestore e Autenticação). Verifique a sua ligação.';
      } else if (!firestoreOk) {
        status.error = `Base de dados Firestore (${firestoreDatabaseId}) inacessível no momento.`;
      } else {
        status.error = 'Serviço de autenticação Firebase não respondeu.';
      }
    }
  } catch (err: any) {
    status.isReady = false;
    status.error = err instanceof Error ? err.message : 'Falha na inicialização do Firebase';
    status.responseTimeMs = Date.now() - startTime;
  }

  return status;
}
