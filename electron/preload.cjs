const { contextBridge, ipcRenderer } = require('electron');

/**
 * Electron Preload Script - Secure Context Bridge
 * Exposes safe APIs to the renderer process for Google Drive integration
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Google OAuth Sign-In
  googleSignIn: async () => {
    return await ipcRenderer.invoke('google-signin');
  },

  // Upload file to Google Drive
  uploadToDrive: async (options) => {
    return await ipcRenderer.invoke('upload-to-drive', options);
  },

  // Download file from Google Drive
  downloadFromDrive: async (fileId) => {
    return await ipcRenderer.invoke('download-from-drive', fileId);
  },

  // List available backups
  listDriveBackups: async () => {
    return await ipcRenderer.invoke('list-drive-backups');
  },

  // Handle OAuth callback
  handleOAuthCallback: async (code) => {
    return await ipcRenderer.invoke('oauth-callback', code);
  },

  // Get platform info
  getPlatform: async () => {
    return await ipcRenderer.invoke('get-platform');
  },

  // Open external URL
  openExternal: async (url) => {
    return await ipcRenderer.invoke('open-external', url);
  },

  // Sync to Drive (alias for uploadToDrive)
  syncToDrive: async (fileData) => {
    const fileName = `MyLab_GDrive_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const content = JSON.stringify(fileData, null, 2);
    return await ipcRenderer.invoke('upload-to-drive', { fileName, content });
  }
});

// Notify when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Electron Preload] Context bridge initialized');
});
