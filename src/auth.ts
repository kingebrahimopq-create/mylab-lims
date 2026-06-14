import { Capacitor } from '@capacitor/core';
  import { initializeApp, getApps } from 'firebase/app';
  import {
    getAuth, signInWithPopup, GoogleAuthProvider,
    signInWithCredential, onAuthStateChanged, User
  } from 'firebase/auth';
  import firebaseConfig from '../firebase-applet-config.json';

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const webProvider = new GoogleAuthProvider();
  webProvider.addScope('https://www.googleapis.com/auth/drive.file');
  webProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  webProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
  webProvider.setCustomParameters({ prompt: 'select_account' });

  let cachedAccessToken: string | null = null;

  export const initAuth = (
    onAuthSuccess?: (user: User, token: string) => void,
    onAuthFailure?: () => void
  ) => {
    return onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const storedToken = localStorage.getItem('firebase_access_token');
        if (storedToken) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, storedToken);
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        localStorage.removeItem('firebase_access_token');
        if (onAuthFailure) onAuthFailure();
      }
    });
  };

  /**
   * Cross-platform Google Sign-In:
   * - Electron (Windows): native OAuth via electronAPI
   * - Android Capacitor: @capacitor-firebase/authentication → Chrome Custom Tabs (NOT WebView)
   * - Web: signInWithPopup
   */
  export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
    // Windows - Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const result = await (window as any).electronAPI.googleSignIn();
      if (result?.accessToken) {
        localStorage.setItem('firebase_access_token', result.accessToken);
        cachedAccessToken = result.accessToken;
      }
      return result ? { user: { displayName: result.name, email: result.email, photoURL: result.avatar } as User, accessToken: result.accessToken || '' } : null;
    }

    // Android native — Chrome Custom Tabs via @capacitor-firebase/authentication
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('لم يتم استقبال idToken من Google');
      const credential = GoogleAuthProvider.credential(idToken);
      const fbResult = await signInWithCredential(auth, credential);
      const accessToken = result.credential?.accessToken || '';
      if (accessToken) {
        cachedAccessToken = accessToken;
        localStorage.setItem('firebase_access_token', accessToken);
      }
      return { user: fbResult.user, accessToken };
    }

    // Web — standard popup
    const result = await signInWithPopup(auth, webProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      localStorage.setItem('firebase_access_token', cachedAccessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  };

  export const handleAuthRedirectResult = async () => null; // kept for compat

  export const getAccessToken = async (): Promise<string | null> =>
    cachedAccessToken || localStorage.getItem('firebase_access_token');

  export const logout = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut();
      } catch {}
    }
    await auth.signOut();
    cachedAccessToken = null;
    localStorage.removeItem('firebase_access_token');
  };
  