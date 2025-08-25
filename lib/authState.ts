// lib/authState.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';

// Key để lưu trạng thái đăng nhập
const AUTH_STATE_KEY = 'userAuthState';
const LAST_LOGIN_TIME_KEY = 'lastLoginTime';

// Lưu trạng thái đăng nhập
export const saveAuthState = async (userData: any) => {
  try {
    const authState = {
      isLoggedIn: true,
      user: userData,
      timestamp: new Date().getTime()
    };
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
    await AsyncStorage.setItem(LAST_LOGIN_TIME_KEY, new Date().getTime().toString());
    console.log('Auth state saved successfully');
  } catch (error) {
    console.error('Error saving auth state:', error);
  }
};

// Lấy trạng thái đăng nhập đã lưu
export const getStoredAuthState = async () => {
  try {
    const authState = await AsyncStorage.getItem(AUTH_STATE_KEY);
    if (authState) {
      return JSON.parse(authState);
    }
    return null;
  } catch (error) {
    console.error('Error getting stored auth state:', error);
    return null;
  }
};

// Xóa trạng thái đăng nhập (khi logout)
export const clearAuthState = async () => {
  try {
    await AsyncStorage.multiRemove([AUTH_STATE_KEY, LAST_LOGIN_TIME_KEY]);
    console.log('Auth state cleared');
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

// Kiểm tra xem phiên đăng nhập có còn hợp lệ không (tùy chọn)
export const isAuthStateValid = async () => {
  try {
    const lastLoginTime = await AsyncStorage.getItem(LAST_LOGIN_TIME_KEY);
    if (!lastLoginTime) return false;

    const now = new Date().getTime();
    const loginTime = parseInt(lastLoginTime);
    
    // Phiên đăng nhập hợp lệ trong 30 ngày (có thể điều chỉnh)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    return (now - loginTime) < thirtyDays;
  } catch (error) {
    console.error('Error checking auth state validity:', error);
    return false;
  }
};

// Đăng xuất hoàn toàn
export const performLogout = async () => {
  try {
    await signOut(auth);
    await clearAuthState();
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};
