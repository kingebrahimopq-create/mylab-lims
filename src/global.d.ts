declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      GEMINI_API_KEY?: string;
      DATABASE_URL?: string;
      MONGODB_URI?: string;
      FIREBASE_API_KEY?: string;
      FIREBASE_AUTH_DOMAIN?: string;
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_STORAGE_BUCKET?: string;
      FIREBASE_MESSAGING_SENDER_ID?: string;
      FIREBASE_APP_ID?: string;
      FIREBASE_MEASUREMENT_ID?: string;
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      PRINTER_IP_ADDRESS?: string;
      PRINTER_CONNECTION_TYPE?: string;
      PRINTER_PORT?: string;
      JWT_SECRET?: string;
      SESSION_SECRET?: string;
      DEFAULT_LAB_NAME_AR?: string;
      DEFAULT_LAB_NAME_EN?: string;
      DEFAULT_DOCTOR_NAME?: string;
      DEFAULT_CURRENCY?: string;
    }
  }

  interface Window {
    __LIMS_CONFIG__: {
      labName: string;
      version: string;
      features: {
        ai: boolean;
        printing: boolean;
        googleDrive: boolean;
        qrVerification: boolean;
        biometric: boolean;
      };
    };
    // Electron API for Google Drive integration
    electronAPI?: {
      googleSignIn: () => Promise<{
        success: boolean;
        name?: string;
        email?: string;
        avatar?: string;
        accessToken?: string;
        error?: string;
      }>;
      uploadToDrive: (options: { fileName: string; content: string }) => Promise<{
        success: boolean;
        fileId?: string;
        message?: string;
        error?: string;
      }>;
      downloadFromDrive: (fileId?: string) => Promise<any>;
      listDriveBackups: () => Promise<Array<{
        id: string;
        name: string;
        createdTime: string;
        size: string;
      }>>;
      handleOAuthCallback: (code: string) => Promise<{ success: boolean; tokens?: any; error?: string }>;
      getPlatform: () => Promise<{
        platform: string;
        version: string;
        isPackaged: boolean;
      }>;
      openExternal: (url: string) => Promise<void>;
      syncToDrive: (fileData: any) => Promise<{
        success: boolean;
        fileId?: string;
        message?: string;
        error?: string;
      }>;
    };
  }
}

export {};
