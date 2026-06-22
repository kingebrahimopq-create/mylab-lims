/**
 * Firebase Storage Backup Service v3
 * Cross-platform Google Sign-In:
 * - Android: @capacitor-firebase/authentication (Chrome Custom Tabs)
 * - Web: signInWithPopup
 * - Windows: Electron IPC
 */
import { Capacitor } from '@capacitor/core';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signInWithCredential,
  onAuthStateChanged, signOut, User
} from 'firebase/auth';
import {
  getStorage, ref, uploadString, getDownloadURL, listAll, getMetadata, deleteObject
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const fbStorage = getStorage(fbApp);

const gProvider = new GoogleAuthProvider();
gProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
gProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
gProvider.setCustomParameters({ prompt: 'select_account' });

export interface BackupEntry { fileName: string; path: string; uploadedAt: string; sizeBytes: number; }
export interface SyncState { isSignedIn: boolean; user: { name: string; email: string; avatar: string } | null; lastSync: string | null; pendingChanges: boolean; }

let _currentUser: User | null = null;
let _lastSyncHash: string | null = null;
try { _lastSyncHash = localStorage.getItem('fb_last_sync_hash'); } catch {}
let _autoSyncTimer: ReturnType<typeof setInterval> | null = null;
let _dataProvider: (() => any) | null = null;
let _onSyncStateChange: ((s: SyncState) => void) | null = null;

function hashData(data: any): string {
  const str = JSON.stringify(data); let h = 0;
  for (let i = 0; i < Math.min(str.length, 10000); i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h.toString(16);
}
function _hasPendingChanges() { return _dataProvider ? hashData(_dataProvider()) !== _lastSyncHash : false; }
function _notifyState() {
  if (!_onSyncStateChange) return;
  _onSyncStateChange({ isSignedIn: !!_currentUser, user: _currentUser ? { name: _currentUser.displayName || _currentUser.email || 'مستخدم', email: _currentUser.email || '', avatar: _currentUser.photoURL || '' } : null, lastSync: localStorage.getItem('fb_last_sync'), pendingChanges: _hasPendingChanges() });
}

export const initStorageAuth = (onStateChange: (s: SyncState) => void) => {
  _onSyncStateChange = onStateChange;
  return onAuthStateChanged(fbAuth, (user) => { _currentUser = user; _notifyState(); });
};

export const googleSignInStorage = async (): Promise<User> => {
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error('فشل استقبال بيانات Google — حاول مرة أخرى');
    const cred = GoogleAuthProvider.credential(idToken);
    const fbResult = await signInWithCredential(fbAuth, cred);
    if (result.credential?.accessToken) localStorage.setItem('firebase_access_token', result.credential.accessToken);
    _currentUser = fbResult.user; _notifyState();
    return fbResult.user;
  }
  const result = await signInWithPopup(fbAuth, gProvider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (cred?.accessToken) localStorage.setItem('firebase_access_token', cred.accessToken);
  _currentUser = result.user; _notifyState();
  return result.user;
};

export const handleStorageRedirectResult = async (): Promise<User | null> => null;

export const googleSignOutStorage = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch {}
  }
  await signOut(fbAuth);
  _currentUser = null;
  _notifyState();
  if (_autoSyncTimer) { clearInterval(_autoSyncTimer); _autoSyncTimer = null; }
};

export const startAutoSync = (dataProvider: () => any, intervalMs = 300000) => {
  _dataProvider = dataProvider;
  if (_autoSyncTimer) clearInterval(_autoSyncTimer);
  _autoSyncTimer = setInterval(async () => {
    if (_currentUser && _hasPendingChanges()) {
      await triggerManualSync(dataProvider());
    }
  }, intervalMs);
};

export const triggerManualSync = async (data: any): Promise<boolean> => {
  if (!_currentUser) return false;
  try {
    const json = JSON.stringify(data);
    const fileName = `backups/mylab_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const storageRef = ref(fbStorage, fileName);
    await uploadString(storageRef, json, 'raw', { contentType: 'application/json' });
    _lastSyncHash = hashData(data);
    const now = new Date().toISOString();
    try { localStorage.setItem('fb_last_sync', now); localStorage.setItem('fb_last_sync_hash', _lastSyncHash); } catch {}
    _notifyState();
    return true;
  } catch (e) {
    console.error('Firebase sync failed:', e);
    return false;
  }
};

export const listBackups = async (): Promise<BackupEntry[]> => {
  if (!_currentUser) return [];
  try {
    const listRef = ref(fbStorage, 'backups/');
    const result = await listAll(listRef);
    const entries = await Promise.all(result.items.map(async (item) => {
      try {
        const meta = await getMetadata(item);
        return { fileName: item.name, path: item.fullPath, uploadedAt: meta.timeCreated, sizeBytes: meta.size };
      } catch { return null; }
    }));
    return entries.filter(Boolean) as BackupEntry[];
  } catch { return []; }
};

export const downloadBackup = async (filePath: string): Promise<any | null> => {
  if (!_currentUser) return null;
  try {
    const storageRef = ref(fbStorage, filePath);
    const url = await getDownloadURL(storageRef);
    const res = await fetch(url);
    return await res.json();
  } catch { return null; }
};

export const getSyncState = (): SyncState => ({
  isSignedIn: !!_currentUser,
  user: _currentUser ? { name: _currentUser.displayName || _currentUser.email || 'مستخدم', email: _currentUser.email || '', avatar: _currentUser.photoURL || '' } : null,
  lastSync: (() => { try { return localStorage.getItem('fb_last_sync'); } catch { return null; } })(),
  pendingChanges: _hasPendingChanges()
});
