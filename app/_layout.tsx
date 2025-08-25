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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const tabRoutes = ['home', 'notifi', 'setting'];
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const publicRoutes = ["/sign_in", "/sign_up", "/forget_pass"];
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Reset redirect flag khi pathname thay đổi
    if (publicRoutes.includes(pathname)) {
      hasRedirected.current = false;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged fired, user:", user?.uid);

      try {
        if (!user) {
          // User không đăng nhập
          if (!hasRedirected.current && !publicRoutes.includes(pathname)) {
            hasRedirected.current = true;
            console.log("Chưa đăng nhập → /sign_in");
            router.replace("/sign_in");
          }
          setCheckingAuth(false);
          return;
        }

        console.log("Đã login, check Firestore...");
        
        // Lấy user document từ Firestore
        const userDocRef = doc(db, "users", user.uid);
        let userDoc;
        
        try {
          userDoc = await getDoc(userDocRef);
          console.log("Firestore lấy xong:", userDoc.exists());
        } catch (firestoreError) {
          console.error("Lỗi Firestore:", firestoreError);
          // Nếu lỗi Firestore, redirect về form_profile
          if (!hasRedirected.current && pathname !== "/form_profile") {
            hasRedirected.current = true;
            console.log("Lỗi Firestore → /form_profile");
            router.replace("/form_profile");
          }
          return;
        }

        if (!userDoc.exists()) {
          // Document không tồn tại
          if (!hasRedirected.current && pathname !== "/form_profile") {
            hasRedirected.current = true;
            console.log("Không có document → /form_profile");
            router.replace("/form_profile");
          }
        } else {
          const data = userDoc.data();
          
          if (!data?.username || !data?.fullname || !data?.numberphone || !data?.birthday) {
            // Thiếu profile
            if (!hasRedirected.current && pathname !== "/form_profile") {
              hasRedirected.current = true;
              console.log("Thiếu profile → /form_profile");
              router.replace("/form_profile");
            }
          } else {
            // Đủ profile
            if (!hasRedirected.current && (pathname === "/" || publicRoutes.includes(pathname))) {
              hasRedirected.current = true;
              console.log("Redirect → /home");
              router.replace("/home");
            }
          }
        }
      } catch (error) {
        console.error("Lỗi check auth:", error);
        
        // Nếu lỗi permissions và user đã đăng nhập, redirect về form_profile
        if (user && !hasRedirected.current && pathname !== "/form_profile") {
          hasRedirected.current = true;
          console.log("Lỗi permissions → /form_profile");
          router.replace("/form_profile");
        } else if (!user && !hasRedirected.current && !publicRoutes.includes(pathname)) {
          hasRedirected.current = true;
          router.replace("/sign_in");
        }
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pathname, router]);
  
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Nếu đang ở tab home thì thoát app
        if (pathname === '/home') {
          Alert.alert(
            'Thoát ứng dụng',
            'Bạn có chắc muốn thoát?',
            [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Thoát', onPress: () => BackHandler.exitApp() },
            ]
          );
          return true; // chặn hành vi mặc định
        }

        // Nếu ở tab khác -> chặn back về tab trước
        return true; // chặn hoàn toàn
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => backHandler.remove();
    }, [pathname])
  );

  if (!loaded || checkingAuth) {
    // Loading trong khi chờ kiểm tra auth
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
        <Stack.Screen name="sign_in" />
        <Stack.Screen name="sign_up" />
        <Stack.Screen name="form_profile" />
      </Stack>
      {tabRoutes.includes(pathname.replace('/', '')) && <BottomNavigation />}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}