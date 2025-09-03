import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { clearListeners } from "./listenerManager";

// Keys để lưu trạng thái đăng nhập
const AUTH_STATE_KEY = 'userAuthState';
const LAST_LOGIN_TIME_KEY = 'lastLoginTime';
const APP_VERSION_KEY = 'appVersion';

// Phiên bản app hiện tại (tăng lên khi có breaking changes)
const CURRENT_APP_VERSION = '1.0.2'; // Tăng version để clear old state

// Lưu trạng thái đăng nhập (chỉ để tracking, Firebase sẽ handle persistence chính)
export const saveAuthState = async (userData: any) => {
  try {
    const authState = {
      isLoggedIn: true,
      user: userData,
      timestamp: new Date().getTime(),
      appVersion: CURRENT_APP_VERSION
    };
    
    await AsyncStorage.multiSet([
      [AUTH_STATE_KEY, JSON.stringify(authState)],
      [LAST_LOGIN_TIME_KEY, new Date().getTime().toString()],
      [APP_VERSION_KEY, CURRENT_APP_VERSION]
    ]);
    
    console.log('Local auth state saved (for tracking)');
  } catch (error) {
    console.error('Error saving local auth state:', error);
  }
};

// Lấy trạng thái đăng nhập đã lưu (deprecated - Firebase handles persistence now)
export const getStoredAuthState = async () => {
  try {
    // Với Firebase persistence, function này chỉ dùng để check compatibility
    const storedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);
    if (storedVersion !== CURRENT_APP_VERSION) {
      console.log('App version changed, clearing old local state');
      await clearAuthState();
      return null;
    }

    const authState = await AsyncStorage.getItem(AUTH_STATE_KEY);
    if (!authState) {
      console.log('No local auth state found');
      return null;
    }

    const parsedState = JSON.parse(authState);
    console.log('Local auth state found (for reference only)');
    return parsedState;
    
  } catch (error) {
    console.error('Error getting stored auth state:', error);
    await clearAuthState();
    return null;
  }
};

// Xóa trạng thái đăng nhập (khi logout) - giữ lại biometric data
export const clearAuthState = async () => {
  try {
    const keysToRemove = [
      AUTH_STATE_KEY, 
      LAST_LOGIN_TIME_KEY, 
      APP_VERSION_KEY,
      'savedEmail',
      'savedPassword'
      // Không xóa 'savedEmailForBio' và 'savedPasswordForBio' để biometric login hoạt động
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('Auth state cleared - removed keys:', keysToRemove);
    console.log('Biometric data preserved for future logins');
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

// Kiểm tra xem phiên đăng nhập có còn hợp lệ không
export const isAuthStateValid = async () => {
  try {
    const lastLoginTime = await AsyncStorage.getItem(LAST_LOGIN_TIME_KEY);
    if (!lastLoginTime) {
      console.log('No login time found');
      return false;
    }

    const now = new Date().getTime();
    const loginTime = parseInt(lastLoginTime);
    
    // Phiên đăng nhập hợp lệ trong 7 ngày
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const isValid = (now - loginTime) < sevenDays;
    
    console.log(`Auth state validity: ${isValid} (${Math.floor((now - loginTime) / (1000 * 60 * 60))} hours old)`);
    return isValid;
    
  } catch (error) {
    console.error('Error checking auth state validity:', error);
    return false;
  }
};

// Cập nhật thời gian đăng nhập cuối
export const updateLastLoginTime = async () => {
  try {
    await AsyncStorage.setItem(LAST_LOGIN_TIME_KEY, new Date().getTime().toString());
    console.log('Last login time updated');
  } catch (error) {
    console.error('Error updating last login time:', error);
  }
};

// Đăng xuất hoàn toàn - với retry mechanism
export const performLogout = async () => {
  try {
    clearListeners(); // ⬅️ hủy toàn bộ onSnapshot
    await signOut(auth);
    await clearAuthState();
  } catch (error) {
    console.error('Logout error:', error);
    await clearAuthState(); // Vẫn clear dù có lỗi
  }
};
// Force logout - for emergency situations
export const forceLogout = async () => {
  console.log('=== FORCE LOGOUT ===');
  
  try {
    // Clear everything immediately
    await clearAuthState();
    
    // Try to sign out from Firebase but don't wait
    signOut(auth).catch(error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Force logout - Firebase signOut error (ignored):', errorMessage);
    });
    
    console.log('Force logout completed');
  } catch (error) {
    console.error('Error during force logout:', error);
  }
};

// Xóa hoàn toàn tất cả data kể cả biometric - dùng khi cần reset hoàn toàn
export const clearAllAuthData = async () => {
  try {
    const allKeysToRemove = [
      AUTH_STATE_KEY, 
      LAST_LOGIN_TIME_KEY, 
      APP_VERSION_KEY,
      'savedEmail',
      'savedPassword',
      'savedEmailForBio',
      'savedPasswordForBio',
      'biometricEnabled'
    ];
    
    await AsyncStorage.multiRemove(allKeysToRemove);
    console.log('All auth data cleared including biometric data');
  } catch (error) {
    console.error('Error clearing all auth data:', error);
  }
};

// Debug function để xem tất cả auth data
export const debugAuthState = async () => {
  try {
    const keys = [
      AUTH_STATE_KEY, 
      LAST_LOGIN_TIME_KEY, 
      APP_VERSION_KEY, 
      'savedEmail',
      'savedEmailForBio',
      'biometricEnabled'
    ];
    const values = await AsyncStorage.multiGet(keys);
    
    console.log('=== AUTH STATE DEBUG ===');
    console.log('Firebase auth user:', auth.currentUser?.uid || 'null');
    values.forEach(([key, value]) => {
      console.log(`${key}: ${value || 'null'}`);
    });
    console.log('========================');
    
    return {
      firebaseUser: auth.currentUser?.uid || null,
      localStorage: Object.fromEntries(values)
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error debugging auth state:', error);
    return { error: errorMessage };
  }
};