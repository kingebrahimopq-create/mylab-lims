/**
 * Drive Sync Service - Unified cross-platform Google Drive sync
 * Handles sync for both Electron (Windows) and Capacitor (Android) environments
 * Uses OAuth 2.0 flow with dynamic token management
 */

import { Capacitor } from '@capacitor/core';

// Types
export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  message: string;
  timestamp: string;
}

export interface SyncStatus {
  connected: boolean;
  platform: 'electron' | 'android' | 'web';
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  lastSync?: string;
}

// Platform detection
const detectPlatform = (): 'electron' | 'android' | 'web' => {
  // Check if running in Electron
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return 'electron';
  }
  // Check if running as Capacitor native app
  if (Capacitor.isNativePlatform()) {
    return 'android';
  }
  return 'web';
};

// Singleton instance
let currentPlatform = detectPlatform();
let syncInProgress = false;
let cachedUserInfo: { name: string; email: string; avatar: string } | null = null;

// Detect online/offline status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Listen for connection changes
export const onConnectionChange = (callback: (online: boolean) => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
  const lastSync = localStorage.getItem('drive_last_sync');
  const savedUser = localStorage.getItem('drive_user_info');
  let userInfo: { name?: string; email?: string; avatar?: string } = {};

  if (savedUser) {
    try {
      userInfo = JSON.parse(savedUser);
    } catch { /* ignore */ }
  }

  return {
    connected: !!userInfo.email,
    platform: currentPlatform,
    userEmail: userInfo.email,
    userName: userInfo.name,
    userAvatar: userInfo.avatar,
    lastSync: lastSync || undefined
  };
};

/**
 * Save user info to localStorage
 */
const saveUserInfo = (user: { name: string; email: string; avatar: string }) => {
  cachedUserInfo = user;
  localStorage.setItem('drive_user_info', JSON.stringify(user));
};

/**
 * Clear user info
 */
export const clearUserInfo = () => {
  cachedUserInfo = null;
  localStorage.removeItem('drive_user_info');
  localStorage.removeItem('drive_last_sync');
  localStorage.removeItem('drive_pending_sync');
};

/**
 * Sign in with Google - routes to correct platform handler
 */
export const signInWithGoogle = async (): Promise<{
  name: string;
  email: string;
  avatar: string;
  accessToken?: string;
} | null> => {
  currentPlatform = detectPlatform();

  try {
    if (currentPlatform === 'electron') {
      // Use Electron's native Google OAuth
      const result = await (window as any).electronAPI.googleSignIn();
      if (result) {
        saveUserInfo({
          name: result.name,
          email: result.email,
          avatar: result.avatar
        });
        return result;
      }
    } else {
      // Web + Android Capacitor: use Firebase popup (works in WebView)
      const mod = await import('./firebase-storage-service');
      const user = await mod.googleSignInStorage();
      if (user) {
        const info = {
          name: user.displayName || user.email || 'مستخدم',
          email: user.email || '',
          avatar: user.photoURL || ''
        };
        saveUserInfo(info);
        return info;
      }
    }
    return null;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

/**
 * Upload data to Google Drive
 */
export const syncDataToDrive = async (
  data: any,
  fileName?: string
): Promise<DriveSyncResult> => {
  if (syncInProgress) {
    return {
      success: false,
      message: 'عملية مزامنة أخرى قيد التنفيذ...',
      timestamp: new Date().toISOString()
    };
  }

  // Check online status
  if (!isOnline()) {
    // Save to pending queue for later sync
    const pendingSyncs = JSON.parse(localStorage.getItem('drive_pending_sync') || '[]');
    pendingSyncs.push({
      data,
      fileName: fileName || `MyLab_Backup_${new Date().toISOString().split('T')[0]}.json`,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('drive_pending_sync', JSON.stringify(pendingSyncs));

    return {
      success: false,
      message: '⚠️ لا يوجد اتصال بالإنترنت. تم حفظ البيانات في قائمة الانتظار للمزامنة التلقائية عند استعادة الاتصال.',
      timestamp: new Date().toISOString()
    };
  }

  syncInProgress = true;
  currentPlatform = detectPlatform();

  try {
    const backupFileName = fileName || `MyLab_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileContent = JSON.stringify(data, null, 2);

    if (currentPlatform === 'electron') {
      // Use Electron's native Google Drive API
      const result = await (window as any).electronAPI.uploadToDrive({
        fileName: backupFileName,
        content: fileContent
      });

      if (result?.success) {
        localStorage.setItem('drive_last_sync', new Date().toISOString());
        syncInProgress = false;
        return {
          success: true,
          fileId: result.fileId,
          message: '✓ تم رفع النسخة الاحتياطية بنجاح إلى Google Drive!',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(result?.message || 'Upload failed');
      }
    } else {
      // Web fallback using Firebase Auth token
      const token = localStorage.getItem('firebase_access_token');
      if (!token) {
        throw new Error('No access token available');
      }

      const metadata = {
        name: backupFileName,
        mimeType: 'application/json'
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!res.ok) throw new Error('Google Drive upload failed');

      const result = await res.json();
      localStorage.setItem('drive_last_sync', new Date().toISOString());

      syncInProgress = false;
      return {
        success: true,
        fileId: result.id,
        message: '✓ تم رفع النسخة الاحتياطية بنجاح إلى Google Drive!',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error: any) {
    console.error('Sync error:', error);

    // Save to pending queue for retry
    const pendingSyncs = JSON.parse(localStorage.getItem('drive_pending_sync') || '[]');
    pendingSyncs.push({
      data,
      fileName: fileName || `MyLab_Backup_${new Date().toISOString().split('T')[0]}.json`,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('drive_pending_sync', JSON.stringify(pendingSyncs));

    syncInProgress = false;
    return {
      success: false,
      message: `❌ فشلت المزامنة: ${error.message || 'خطأ غير معروف'}. تم حفظ البيانات للمزامنة اللاحقة.`,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Download data from Google Drive
 */
export const downloadFromDrive = async (fileId?: string): Promise<any | null> => {
  if (!isOnline()) {
    throw new Error('لا يوجد اتصال بالإنترنت');
  }

  currentPlatform = detectPlatform();

  try {
    if (currentPlatform === 'electron') {
      return await (window as any).electronAPI.downloadFromDrive(fileId);
    } else {
      const token = localStorage.getItem('firebase_access_token');
      if (!token) throw new Error('No access token');

      // If no fileId, search for latest backup
      let targetFileId = fileId;
      if (!targetFileId) {
        const searchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name contains 'MyLab_Backup' and mimeType='application/json'&orderBy=createdTime desc&pageSize=1`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const searchData = await searchRes.json();
        if (searchData.files?.length > 0) {
          targetFileId = searchData.files[0].id;
        }
      }

      if (!targetFileId) return null;

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${targetFileId}?alt=media`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Download failed');
      return await res.json();
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

/**
 * List backups from Google Drive
 */
export const listDriveBackups = async (): Promise<Array<{
  id: string;
  name: string;
  createdTime: string;
  size: string;
}>> => {
  if (!isOnline()) return [];

  currentPlatform = detectPlatform();

  try {
    if (currentPlatform === 'electron') {
      return await (window as any).electronAPI.listDriveBackups();
    } else {
      const token = localStorage.getItem('firebase_access_token');
      if (!token) return [];

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains 'MyLab_Backup' and mimeType='application/json'&orderBy=createdTime desc`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!res.ok) return [];
      const data = await res.json();
      return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        createdTime: f.createdTime,
        size: f.size || 'unknown'
      }));
    }
  } catch {
    return [];
  }
};

/**
 * Process pending syncs (offline queue)
 */
export const processPendingSyncs = async (dataProvider: () => any): Promise<number> => {
  if (!isOnline()) return 0;

  const pendingSyncs = JSON.parse(localStorage.getItem('drive_pending_sync') || '[]');
  if (pendingSyncs.length === 0) return 0;

  let processed = 0;
  const remaining: typeof pendingSyncs = [];

  for (const sync of pendingSyncs) {
    try {
      const result = await syncDataToDrive(sync.data, sync.fileName);
      if (result.success) {
        processed++;
      } else {
        remaining.push(sync);
      }
    } catch {
      remaining.push(sync);
    }
  }

  localStorage.setItem('drive_pending_sync', JSON.stringify(remaining));

  // Update last sync attempt
  if (processed > 0) {
    localStorage.setItem('drive_last_sync', new Date().toISOString());
  }

  return processed;
};

/**
 * Get pending syncs count
 */
export const getPendingSyncsCount = (): number => {
  const pendingSyncs = JSON.parse(localStorage.getItem('drive_pending_sync') || '[]');
  return pendingSyncs.length;
};

// Auto-sync on connection restore
let autoSyncCallback: (() => any) | null = null;

export const setAutoSyncDataProvider = (provider: () => any) => {
  autoSyncCallback = provider;
};

// Listen for connection restore
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Connection restored - checking pending syncs...');
    if (autoSyncCallback) {
      const count = getPendingSyncsCount();
      if (count > 0) {
        console.log(`Processing ${count} pending syncs...`);
        await processPendingSyncs(autoSyncCallback);
      }
    }
  });
}
