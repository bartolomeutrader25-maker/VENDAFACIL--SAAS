import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton)
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

// Configure Google Auth Provider with Drive file scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to track ongoing sign in flow
let isSigningIn = false;
// In-memory cache for access token (MANDATORY: never store in localStorage)
let cachedAccessToken: string | null = null;

export interface DriveBackupFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
}

export interface BackupHistoryItem {
  id: string;
  timestamp: number;
  dateStr: string;
  destination: 'google_drive' | 'local_download' | 'both';
  status: 'success' | 'failed';
  driveFileId?: string;
  driveFileUrl?: string;
  fileName: string;
  fileSizeBytes?: number;
  totalSales: number;
  totalProducts: number;
  totalCustomers: number;
  triggerType: 'manual' | 'automatic_daily' | 'automatic_cash_close' | 'automatic_interval';
  errorMessage?: string;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'on_cash_close' | 'every_10_sales' | 'weekly';
  destination: 'google_drive' | 'local_download' | 'both';
  notifyOnCompletion: boolean;
  lastRunTimestamp: number | null;
  lastRunStatus: 'success' | 'failed' | null;
  nextScheduledTime?: string;
}

export const initGoogleDriveAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

export const signInWithGoogleForDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro ao autenticar com o Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const signOutGoogleDrive = async () => {
  await signOut(firebaseAuth);
  cachedAccessToken = null;
};

/**
 * Ensures the 'VendaFacil_Backups' folder exists in the user's Google Drive.
 */
export const getOrCreateBackupsFolder = async (accessToken: string): Promise<string> => {
  const query = encodeURIComponent("name = 'VendaFacil_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ao consultar pastas no Google Drive (${searchRes.status})`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'VendaFacil_Backups',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Pasta oficial de cópias de segurança do VendaFácil SaaS',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ao criar pasta no Google Drive (${createRes.status})`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
};

/**
 * Uploads a JSON backup to the user's Google Drive folder.
 */
export const uploadBackupToGoogleDrive = async (
  accessToken: string,
  backupData: any,
  companyName: string
): Promise<DriveBackupFile> => {
  const folderId = await getOrCreateBackupsFolder(accessToken);

  const cleanCompanyName = (companyName || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_');
  const now = new Date();
  const dateFormatted = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `Backup_${cleanCompanyName}_${dateFormatted}.json`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    description: `Backup VendaFácil SaaS: ${backupData.summary?.totalSales || 0} vendas, ${backupData.summary?.totalProducts || 0} produtos, ${backupData.summary?.totalCustomers || 0} clientes.`,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(backupData, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime,size';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ao enviar ficheiro para o Google Drive (${res.status})`);
  }

  return await res.json();
};

/**
 * Lists the most recent backups stored inside the VendaFacil_Backups folder.
 */
export const listRecentDriveBackups = async (accessToken: string): Promise<DriveBackupFile[]> => {
  try {
    const folderId = await getOrCreateBackupsFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,createdTime,size)&orderBy=createdTime desc&pageSize=15`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (e) {
    console.warn('Erro ao listar backups do Drive:', e);
    return [];
  }
};

/**
 * Triggers a direct local JSON download of the backup in the user's browser.
 */
export const downloadLocalJsonBackup = (backupData: any, companyName: string): { fileName: string; size: number } => {
  const cleanCompanyName = (companyName || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_');
  const now = new Date();
  const dateFormatted = now.toISOString().slice(0, 10);
  const fileName = `Backup_${cleanCompanyName}_${dateFormatted}.json`;

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { fileName, size: blob.size };
};

/**
 * Exports a clean CSV summary for Excel/Spreadsheets.
 */
export const downloadLocalCsvSummary = (backupData: any, companyName: string) => {
  const cleanCompanyName = (companyName || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  // 1. Sales CSV
  const sales = backupData.data?.sales || [];
  const salesHeaders = ['ID', 'Data', 'Cliente', 'Total', 'Metodo', 'Lucro', 'Estado'];
  const salesRows = sales.map((s: any) => [
    s.id,
    s.createdAt ? new Date(s.createdAt).toLocaleString('pt-PT') : '',
    `"${(s.customerName || 'Consumidor Final').replace(/"/g, '""')}"`,
    s.total || 0,
    s.paymentMethod || '',
    s.profit || 0,
    s.status || 'concluida'
  ]);

  const salesCsv = [
    salesHeaders.join(';'),
    ...salesRows.map((r: any[]) => r.join(';'))
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + salesCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Vendas_${cleanCompanyName}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ========================================================
// Backup Schedule & Local Storage Helpers
// ========================================================

const SCHEDULE_KEY_PREFIX = 'vf_backup_schedule_';
const HISTORY_KEY_PREFIX = 'vf_backup_history_';

export const getBackupScheduleConfig = (companyId: string): BackupScheduleConfig => {
  try {
    const raw = localStorage.getItem(`${SCHEDULE_KEY_PREFIX}${companyId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}

  return {
    enabled: true,
    frequency: 'daily',
    destination: 'both',
    notifyOnCompletion: true,
    lastRunTimestamp: null,
    lastRunStatus: null,
  };
};

export const saveBackupScheduleConfig = (companyId: string, config: BackupScheduleConfig): void => {
  try {
    localStorage.setItem(`${SCHEDULE_KEY_PREFIX}${companyId}`, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao gravar configurações de backup agendado:', e);
  }
};

export const getBackupHistory = (companyId: string): BackupHistoryItem[] => {
  try {
    const raw = localStorage.getItem(`${HISTORY_KEY_PREFIX}${companyId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
};

export const addBackupHistoryItem = (companyId: string, item: BackupHistoryItem): void => {
  try {
    const history = getBackupHistory(companyId);
    history.unshift(item);
    // Keep last 30 entries
    const trimmed = history.slice(0, 30);
    localStorage.setItem(`${HISTORY_KEY_PREFIX}${companyId}`, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Erro ao gravar histórico de backup:', e);
  }
};
