// Firebase konfigürasyon dosyası
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase konfigürasyonu
const firebaseConfig = {
    apiKey: "AIzaSyBIVdbwXpF9maxzuqvCvRzCPRN5-Z1vpx8",
    authDomain: "lights-out-52c71.firebaseapp.com",
    projectId: "lights-out-52c71",
    storageBucket: "lights-out-52c71.firebasestorage.app",
    messagingSenderId: "869468370913",
    appId: "1:869468370913:web:fb9354e605be54a93dc4a0",
    measurementId: "G-Y71JXENZ2K"
  };

// Firebase'i başlat (duplicate app hatasını önle)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Authentication'ı başlat
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Eğer zaten initialize edilmişse, mevcut auth'u al
  auth = getAuth(app);
}

export { auth };
export default app;
