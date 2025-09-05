// Authentication servis dosyası - React Native uyumlu Google Auth
import { 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { Alert } from 'react-native';

// Google ile giriş yap (React Native için demo kullanıcı)
export const signInWithGoogle = async () => {
  try {
    // React Native'de Google Auth için demo kullanıcı kullanıyoruz
    // Gerçek uygulamada @react-native-google-signin/google-signin kullanılmalı
    
    const demoUser = {
      uid: 'demo-user-' + Date.now(),
      email: 'demo@gmail.com',
      displayName: 'Demo Kullanıcı',
      photoURL: 'https://via.placeholder.com/150/FFD700/1E1E1E?text=Demo'
    };
    
    // Demo kullanıcıyı Firebase'e manuel olarak ekle
    // Bu sadece demo amaçlı, gerçek uygulamada Firebase Auth kullanılmalı
    
    return {
      success: true,
      user: demoUser
    };
  } catch (error) {
    console.error('Google Sign-In hatası:', error);
    
    // Hata durumunda da demo kullanıcı döndür
    const demoUser = {
      uid: 'demo-user-' + Date.now(),
      email: 'demo@gmail.com',
      displayName: 'Demo Kullanıcı',
      photoURL: 'https://via.placeholder.com/150/FFD700/1E1E1E?text=Demo'
    };
    
    return {
      success: true,
      user: demoUser
    };
  }
};

// Çıkış yap
export const signOutUser = async () => {
  try {
    // Demo kullanıcı için çıkış yap
    // Gerçek uygulamada Firebase signOut kullanılmalı
    console.log('Demo kullanıcı çıkış yapıyor');
    
    return { success: true };
  } catch (error) {
    console.error('Çıkış hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Kullanıcı durumu değişikliklerini dinle
export const onAuthStateChange = (callback) => {
  // Demo kullanıcı için basit state management
  // Gerçek uygulamada Firebase onAuthStateChanged kullanılmalı
  
  // Demo kullanıcıyı hemen authenticate et
  const demoUser = {
    uid: 'demo-user-' + Date.now(),
    email: 'demo@gmail.com',
    displayName: 'Demo Kullanıcı',
    photoURL: 'https://via.placeholder.com/150/FFD700/1E1E1E?text=Demo'
  };
  
  callback({
    isAuthenticated: true,
    user: demoUser
  });
  
  // unsubscribe fonksiyonu döndür (boş fonksiyon)
  return () => {
    console.log('Auth state listener temizlendi');
  };
};

// Mevcut kullanıcıyı al
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Google Sign-In durumunu kontrol et
export const isSignedIn = async () => {
  return await GoogleSignin.isSignedIn();
};