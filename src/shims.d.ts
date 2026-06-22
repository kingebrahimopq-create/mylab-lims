declare module '*.json' {
  const value: any;
  export default value;
}

interface Window {
  electronAPI?: {
    googleSignIn: () => Promise<{ success: boolean; name?: string; email?: string; avatar?: string; accessToken?: string; error?: string }>;
    listDriveBackups: () => Promise<any[]>;
    downloadFromDrive: (id: string) => Promise<any>;
  };
}
