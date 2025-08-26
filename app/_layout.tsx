import BottomNavigation from '@/components/BottomNavigation';
import { useColorScheme } from '@/hooks/useColorScheme';
import { auth, db } from '@/lib/firebaseConfig';
import { DarkTheme, DefaultTheme, ThemeProvider, useFocusEffect } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, BackHandler, View } from 'react-native';
import { StackAnimationTypes } from 'react-native-screens';
import { getStoredAuthState, clearAuthState, saveAuthState } from '@/lib/authState';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const tabRoutes = ['home', 'notifi', 'settings'];
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const publicRoutes = ["/sign_in", "/sign_up", "/forget_pass"];
  const hasRedirected = useRef(false);
  const isInitializing = useRef(true);

  useEffect(() => {
    let isMounted = true;
    
    // Đợi Firebase Auth khởi tạo và restore persistent state
    const initializeAuth = async () => {
      try {
        console.log("=== INITIALIZING AUTH ===");
        console.log("Current pathname:", pathname);
        
        // Đợi Firebase Auth restore từ AsyncStorage (nếu có)
        // Firebase cần thời gian để restore persistent auth state
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setAuthInitialized(true);
      }
    };

    initializeAuth();

    // Lắng nghe Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted || !authInitialized) return;
      
      console.log("=== FIREBASE AUTH STATE CHANGED ===");
      console.log("User:", user?.uid || "undefined");
      console.log("Current pathname:", pathname);
      console.log("Has redirected:", hasRedirected.current);
      console.log("Is initializing:", isInitializing.current);

      try {
        if (!user) {
          // Không có user đăng nhập
          console.log("No user - clearing local auth state");
          await clearAuthState();
          
          // Chỉ redirect nếu không ở public routes và không đang trong quá trình khởi tạo
          if (!publicRoutes.includes(pathname) && !hasRedirected.current && !isInitializing.current) {
            hasRedirected.current = true;
            console.log("Redirecting to sign_in");
            router.replace("/sign_in");
          }
          return;
        }

        // User đã đăng nhập
        console.log("User authenticated:", user.uid);
        
        // Lưu/cập nhật auth state
        await saveAuthState({
          uid: user.uid,
          email: user.email,
        });

        console.log("Checking user profile...");
        
        // Kiểm tra user profile
        await checkUserProfile(user, pathname, router, hasRedirected, isMounted);
        
      } catch (error) {
        console.error("Error in auth state handler:", error);
        
        // Nếu có lỗi và không phải đang khởi tạo, redirect về sign_in
        if (!hasRedirected.current && !publicRoutes.includes(pathname) && !isInitializing.current) {
          hasRedirected.current = true;
          console.log("Error occurred, redirecting to sign_in");
          router.replace("/sign_in");
        }
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
          isInitializing.current = false;
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [authInitialized]); // Chỉ depend on authInitialized

  // Reset redirect flag khi chuyển sang public routes
  useEffect(() => {
    if (publicRoutes.includes(pathname)) {
      console.log("On public route, resetting redirect flag");
      hasRedirected.current = false;
    }
  }, [pathname]);
  
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (pathname === '/home') {
          Alert.alert(
            'Thoát ứng dụng',
            'Bạn có chắc muốn thoát?',
            [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Thoát', onPress: () => BackHandler.exitApp() },
            ]
          );
          return true;
        }
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => backHandler.remove();
    }, [pathname])
  );

  // Hiển thị loading khi đang check auth
  if (!loaded || checkingAuth || !authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={({ route }: any) => {
          const animation =
            tabRoutes.includes(route.name) && route.params?.animation
              ? (route.params.animation as StackAnimationTypes)
              : 'none';
      
          return {
            headerShown: false,
            animation,
          };
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="settings"/>
        <Stack.Screen name="sign_in" />
        <Stack.Screen name="sign_up" />
        <Stack.Screen name="form_profile" />
      </Stack>
      {tabRoutes.includes(pathname.replace('/', '')) && <BottomNavigation />}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Helper function để check user profile
async function checkUserProfile(
  user: any,
  pathname: string,
  router: any,
  hasRedirected: React.MutableRefObject<boolean>,
  isMounted: boolean
) {
  if (!isMounted || hasRedirected.current) return;

  try {
    console.log("Checking user profile for:", user.uid);
    
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!isMounted) return;

    if (!userDoc.exists()) {
      console.log("No user document - redirect to form_profile");
      if (pathname !== "/form_profile") {
        hasRedirected.current = true;
        router.replace("/form_profile");
      }
      return;
    }

    const data = userDoc.data();
    const requiredFields = ['username', 'fullname', 'numberphone', 'birthday'];
    const missingFields = requiredFields.filter(field => !data?.[field]);
    
    if (missingFields.length > 0) {
      console.log("Missing profile fields:", missingFields);
      if (pathname !== "/form_profile") {
        hasRedirected.current = true;
        router.replace("/form_profile");
      }
      return;
    }

    // Profile complete - redirect to home if needed
    if (pathname === "/" || pathname === "/sign_in" || pathname === "/sign_up") {
      console.log("Profile complete - redirect to home");
      hasRedirected.current = true;
      router.replace("/home");
    }
    
  } catch (error: any) {
    console.error("Error checking user profile:", error);
    
    if (error.code === 'permission-denied') {
      console.log("Permission denied - redirect to form_profile");
      if (pathname !== "/form_profile") {
        hasRedirected.current = true;
        router.replace("/form_profile");
      }
    } else {
      throw error; // Re-throw để handle ở level cao hơn
    }
  }
}