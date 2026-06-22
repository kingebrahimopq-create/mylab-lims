/**
 * Drive Sync Service — offline-first sync with Firebase Storage
 */
import { triggerManualSync, getSyncState } from './firebase-storage-service';

export interface DriveSyncResult { success: boolean; message: string; fileId?: string; }
export interface SyncStatus { isOnline: boolean; lastSync: string | null; pendingCount: number; }

let _pendingQueue: any[] = [];
let _connectionListeners: ((online: boolean) => void)[] = [];
let _autoSyncProvider: (() => any) | null = null;

try {
  const stored = localStorage.getItem('lims_pending_syncs');
  if (stored) _pendingQueue = JSON.parse(stored);
} catch {}

function savePendingQueue() {
  try { localStorage.setItem('lims_pending_syncs', JSON.stringify(_pendingQueue)); } catch {}
}

// --- Connection Detection ---
export const isOnline = (): boolean => {
  try { return navigator.onLine; } catch { return true; }
};

export const onConnectionChange = (callback: (online: boolean) => void): (() => void) => {
  _connectionListeners.push(callback);
  const onOnline = () => { callback(true); };
  const onOffline = () => { callback(false); };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
  }
  return () => {
    _connectionListeners = _connectionListeners.filter(l => l !== callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    }
  };
};

export const getSyncStatus = (): SyncStatus => {
  const state = getSyncState();
  return {
    isOnline: isOnline(),
    lastSync: state.lastSync,
    pendingCount: _pendingQueue.length
  };
};

export const clearUserInfo = () => {
  try {
    localStorage.removeItem('firebase_access_token');
    localStorage.removeItem('fb_last_sync');
    localStorage.removeItem('fb_last_sync_hash');
  } catch {}
};

export const signInWithGoogle = async (): Promise<{ name: string; email: string; avatar: string } | null> => {
  try {
    const { googleSignInStorage } = await import('./firebase-storage-service');
    const user = await googleSignInStorage();
    return { name: user.displayName || '', email: user.email || '', avatar: user.photoURL || '' };
  } catch (e) {
    console.error('signInWithGoogle failed:', e);
    return null;
  }
};

export const syncDataToDrive = async (data: any): Promise<DriveSyncResult> => {
  if (!isOnline()) {
    _pendingQueue.push({ data, timestamp: new Date().toISOString() });
    savePendingQueue();
    return { success: false, message: '📴 وضع عدم الاتصال — تم حفظ البيانات للمزامنة لاحقاً' };
  }
  try {
    const ok = await triggerManualSync(data);
    if (ok) {
      return { success: true, message: `✅ تمت المزامنة مع Firebase Storage — ${new Date().toLocaleTimeString('ar-EG')}` };
    }
    _pendingQueue.push({ data, timestamp: new Date().toISOString() });
    savePendingQueue();
    return { success: false, message: '⚠️ فشلت المزامنة — تم حفظ البيانات للمزامنة لاحقاً' };
  } catch (e: any) {
    _pendingQueue.push({ data, timestamp: new Date().toISOString() });
    savePendingQueue();
    return { success: false, message: `❌ خطأ: ${e.message}` };
  }
};

export const downloadFromDrive = async (_fileId?: string): Promise<any | null> => {
  try {
    const { listBackups, downloadBackup } = await import('./firebase-storage-service');
    const backups = await listBackups();
    if (!backups.length) return null;
    const latest = backups.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
    return await downloadBackup(latest.path);
  } catch { return null; }
};

export const listDriveBackups = async () => {
  try {
    const { listBackups } = await import('./firebase-storage-service');
    return await listBackups();
  } catch { return []; }
};

export const processPendingSyncs = async (dataProvider: () => any): Promise<number> => {
  if (!isOnline() || _pendingQueue.length === 0) return 0;
  let synced = 0;
  const toSync = [..._pendingQueue];
  _pendingQueue = [];
  savePendingQueue();
  for (const item of toSync) {
    const result = await syncDataToDrive(item.data || dataProvider());
    if (result.success) synced++;
    else { _pendingQueue.push(item); }
  }
  savePendingQueue();
  // Also sync current data
  const current = dataProvider();
  const final = await syncDataToDrive(current);
  if (final.success) synced++;
  return synced;
};

export const getPendingSyncsCount = (): number => _pendingQueue.length;

export const setAutoSyncDataProvider = (provider: () => any) => {
  _autoSyncProvider = provider;
};
