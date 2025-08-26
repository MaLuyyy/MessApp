import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';

// Keys để lưu trạng thái đăng nhập
const AUTH_STATE_KEY = 'userAuthState';
const LAST_LOGIN_TIME_KEY = 'lastLoginTime';
const APP_VERSION_KEY = 'appVersion';

// Phiên bản app hiện tại (tăng lên khi có breaking changes)
const CURRENT_APP_VERSION = '1.0.1'; // Tăng version để clear old state

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

// Xóa trạng thái đăng nhập (khi logout)
export const clearAuthState = async () => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_STATE_KEY, 
      LAST_LOGIN_TIME_KEY, 
      APP_VERSION_KEY,
      'savedEmail',
      'savedPassword'
    ]);
    console.log('Auth state cleared');
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

// Đăng xuất hoàn toàn
export const performLogout = async () => {
  try {
    console.log('Performing logout...');
    
    // Đăng xuất từ Firebase
    await signOut(auth);
    
    // Xóa tất cả auth state
    await clearAuthState();
    
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Error during logout:', error);
    // Vẫn clear local state ngay cả khi Firebase logout failed
    await clearAuthState();
    throw error;
  }
};

// Debug function để xem tất cả auth data
export const debugAuthState = async () => {
  try {
    const keys = [AUTH_STATE_KEY, LAST_LOGIN_TIME_KEY, APP_VERSION_KEY, 'savedEmail'];
    const values = await AsyncStorage.multiGet(keys);
    
    console.log('=== AUTH STATE DEBUG ===');
    values.forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log('========================');
    
    return Object.fromEntries(values);
  } catch (error) {
    console.error('Error debugging auth state:', error);
    return {};
  }
};