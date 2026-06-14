/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
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
  }
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
