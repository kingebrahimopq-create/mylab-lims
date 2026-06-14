const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Google OAuth configuration (will be set from the app)
let googleOAuthClient = null;
let cachedTokens = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false
    },
    titleBarStyle: 'default',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Setup IPC handlers for Google Drive integration
 */
function setupIpcHandlers() {
  // Google Sign-In via OAuth (loopback redirect — no demo mode)
    ipcMain.handle('google-signin', async () => {
      try {
        // Check if we have stored tokens that are still valid
        const storedTokens = loadStoredTokens();
        if (storedTokens && storedTokens.access_token && storedTokens.expiry_date > Date.now()) {
          const userInfo = await fetchGoogleUserInfo(storedTokens.access_token);
          if (userInfo.email) {
            return {
              success: true,
              name: userInfo.name,
              email: userInfo.email,
              avatar: userInfo.picture || '',
              accessToken: storedTokens.access_token
            };
          }
        }

        const clientId = getGoogleClientId();
        if (!clientId) {
          return {
            success: false,
            error: 'GOOGLE_CLIENT_ID غير مضبوط. يرجى الاتصال بالدعم الفني لإعداد التطبيق.'
          };
        }

        // Use loopback redirect URI (RFC 8252 – OAuth for native apps)
        const http = require('http');
        const { OAuth2Client } = require('google-auth-library');

        return await new Promise((resolve) => {
          const server = http.createServer();
          server.listen(0, '127.0.0.1', async () => {
            const port = server.address().port;
            const redirectUri = `http://127.0.0.1:${port}`;

            googleOAuthClient = new OAuth2Client(
              clientId,
              process.env.GOOGLE_CLIENT_SECRET || '',
              redirectUri
            );

            const authorizeUrl = googleOAuthClient.generateAuthUrl({
              access_type: 'offline',
              scope: [
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
              ],
              prompt: 'select_account'
            });

            shell.openExternal(authorizeUrl);

            const timeout = setTimeout(() => {
              server.close();
              resolve({ success: false, error: 'انتهت مهلة تسجيل الدخول (دقيقتان). يرجى المحاولة مجدداً.' });
            }, 120000);

            server.on('request', async (req, res) => {
              try {
                const urlObj = new URL(req.url, `http://127.0.0.1:${port}`);
                const code = urlObj.searchParams.get('code');
                const errorParam = urlObj.searchParams.get('error');

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                if (code) {
                  res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px;direction:rtl"><h2>✓ تم تسجيل الدخول بنجاح!</h2><p>يمكنك إغلاق هذه النافذة والعودة للتطبيق.</p></body></html>');
                } else {
                  res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px;direction:rtl"><h2>تم إلغاء تسجيل الدخول</h2></body></html>');
                }

                clearTimeout(timeout);
                server.close();

                if (errorParam || !code) {
                  resolve({ success: false, error: errorParam || 'لم يتم استلام رمز التفويض.' });
                  return;
                }

                const { tokens } = await googleOAuthClient.getToken(code);
                cachedTokens = tokens;
                storeTokens(tokens);

                const userInfo = await fetchGoogleUserInfo(tokens.access_token);
                resolve({
                  success: true,
                  name: userInfo.name || 'مستخدم',
                  email: userInfo.email || '',
                  avatar: userInfo.picture || '',
                  accessToken: tokens.access_token
                });
              } catch (err) {
                resolve({ success: false, error: err.message });
              }
            });

            server.on('error', (err) => {
              resolve({ success: false, error: 'فشل إنشاء خادم OAuth المحلي: ' + err.message });
            });
          });
        });
      } catch (error) {
        console.error('Google sign-in error:', error);
        return { success: false, error: error.message };
      }
    });

      // Upload to Google Drive
  ipcMain.handle('upload-to-drive', async (event, { fileName, content }) => {
    try {
      const tokens = loadStoredTokens();
      const accessToken = tokens?.access_token;

      if (!accessToken) {
        // Demo mode: save locally
        const backupDir = path.join(app.getPath('documents'), 'MyLab_Backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = path.join(backupDir, fileName);
        fs.writeFileSync(backupPath, content, 'utf8');
        return {
          success: true,
          fileId: 'local_' + Date.now(),
          message: 'Backup saved locally (demo mode)'
        };
      }

      // Real upload to Google Drive using fetch
      const { google } = require('googleapis');
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [] // Will use root
      };

      const media = {
        mimeType: 'application/json',
        body: content
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, createdTime'
      });

      return {
        success: true,
        fileId: response.data.id,
        message: 'Upload successful'
      };
    } catch (error) {
      console.error('Upload error:', error);
      // Fallback: save locally
      try {
        const backupDir = path.join(app.getPath('documents'), 'MyLab_Backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = path.join(backupDir, fileName);
        fs.writeFileSync(backupPath, content, 'utf8');
        return {
          success: true,
          fileId: 'local_fallback_' + Date.now(),
          message: 'Saved locally due to upload error'
        };
      } catch {
        return { success: false, error: error.message };
      }
    }
  });

  // Download from Google Drive
  ipcMain.handle('download-from-drive', async (event, fileId) => {
    try {
      const tokens = loadStoredTokens();
      if (!tokens?.access_token) {
        return null;
      }

      const { google } = require('googleapis');
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: tokens.access_token });

      const drive = google.drive({ version: 'v3', auth });

      let targetFileId = fileId;

      // If no fileId, search for latest
      if (!targetFileId) {
        const res = await drive.files.list({
          q: "name contains 'MyLab_Backup' and mimeType='application/json'",
          orderBy: 'createdTime desc',
          pageSize: 1,
          fields: 'files(id, name)'
        });
        if (res.data.files && res.data.files.length > 0) {
          targetFileId = res.data.files[0].id;
        }
      }

      if (!targetFileId) return null;

      const response = await drive.files.get(
        { fileId: targetFileId, alt: 'media' },
        { responseType: 'json' }
      );

      return response.data;
    } catch (error) {
      console.error('Download error:', error);
      return null;
    }
  });

  // List backups from Google Drive
  ipcMain.handle('list-drive-backups', async () => {
    try {
      const tokens = loadStoredTokens();
      if (!tokens?.access_token) {
        // Fallback: list local backups
        const backupDir = path.join(app.getPath('documents'), 'MyLab_Backups');
        if (!fs.existsSync(backupDir)) return [];
        const files = fs.readdirSync(backupDir)
          .filter(f => f.startsWith('MyLab_Backup'))
          .map(f => ({
            id: 'local_' + f,
            name: f,
            createdTime: fs.statSync(path.join(backupDir, f)).mtime.toISOString(),
            size: fs.statSync(path.join(backupDir, f)).size.toString()
          }));
        return files;
      }

      const { google } = require('googleapis');
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: tokens.access_token });

      const drive = google.drive({ version: 'v3', auth });

      const res = await drive.files.list({
        q: "name contains 'MyLab_Backup' and mimeType='application/json'",
        orderBy: 'createdTime desc',
        fields: 'files(id, name, createdTime, size)'
      });

      return (res.data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        createdTime: f.createdTime,
        size: f.size || 'unknown'
      }));
    } catch {
      // Fallback: list local backups
      try {
        const backupDir = path.join(app.getPath('documents'), 'MyLab_Backups');
        if (!fs.existsSync(backupDir)) return [];
        return fs.readdirSync(backupDir)
          .filter(f => f.startsWith('MyLab_Backup'))
          .map(f => ({
            id: 'local_' + f,
            name: f,
            createdTime: fs.statSync(path.join(backupDir, f)).mtime.toISOString(),
            size: fs.statSync(path.join(backupDir, f)).size.toString()
          }));
      } catch {
        return [];
      }
    }
  });

  // Handle OAuth callback
  ipcMain.handle('oauth-callback', async (event, code) => {
    try {
      if (googleOAuthClient && code) {
        const { tokens } = await googleOAuthClient.getToken(code);
        cachedTokens = tokens;
        storeTokens(tokens);
        return { success: true, tokens };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get platform info
  ipcMain.handle('get-platform', () => {
    return {
      platform: process.platform,
      version: app.getVersion(),
      isPackaged: app.isPackaged
    };
  });

  // Open external link
  ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
  });
}

// Token storage helpers
function getTokenPath() {
  return path.join(app.getPath('userData'), 'google-tokens.json');
}

function storeTokens(tokens) {
  try {
    fs.writeFileSync(getTokenPath(), JSON.stringify(tokens, null, 2));
  } catch (e) {
    console.error('Failed to store tokens:', e);
  }
}

function loadStoredTokens() {
  try {
    const tokenPath = getTokenPath();
    if (fs.existsSync(tokenPath)) {
      return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load tokens:', e);
  }
  return null;
}

function getGoogleClientId() {
  // Try to load from config file
  try {
    const configPath = path.join(app.getPath('userData'), 'google-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.clientId;
    }
  } catch { /* ignore */ }

  // Fallback to environment
  return process.env.GOOGLE_CLIENT_ID || null;
}

async function fetchGoogleUserInfo(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return await res.json();
  } catch (e) {
    return { name: 'User', email: '', picture: '' };
  }
}
