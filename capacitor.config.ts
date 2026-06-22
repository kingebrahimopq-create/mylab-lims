import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mylab.lims',
  appName: 'MyLab LIMS',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;
