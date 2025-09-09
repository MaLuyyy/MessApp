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
import { clearAuthState, saveAuthState } from '@/lib/authState';
import  CallProvider  from "@/providers/CallProvider";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const tabRoutes = ['home', 'notifi', 'settings'];
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const publicRoutes = ["/sign_in", "/sign_up", "/forget_pass"];
  const hasRedirected = useRef(false);
  const authInitialized = useRef(false);
  const authUnsubscribe = useRef<(() => void) | null>(null);
  const isProcessingAuth = useRef(false);

  // Reset redirect flag when changing to public routes
  useEffect(() => {
    if (publicRoutes.includes(pathname)) {
      hasRedirected.current = false;
      setCurrentUser(null); // Clear current user when on public routes
    }
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    
    // Clear any existing listener
    if (authUnsubscribe.current) {
      authUnsubscribe.current();
    }
    
    // Setup Firebase auth state listener
    authUnsubscribe.current = onAuthStateChanged(auth, async (user) => {
      if (!isMounted || isProcessingAuth.current) return;
      
      isProcessingAuth.current = true;
      
      console.log("=== AUTH STATE CHANGED ===");
      console.log("User:", user?.uid || "null");


      try {
        if (!user) {
          // No user logged in
          console.log("No user - clearing local auth state");
          setCurrentUser(null);
          await clearAuthState();
          
          // Only redirect if not already on public routes and haven't redirected yet
          if (!publicRoutes.includes(pathname) && !hasRedirected.current) {
            hasRedirected.current = true;
            console.log("Redirecting to sign_in");
            router.replace("/sign_in");
          }
        } else {
          // User is logged in
          console.log("User authenticated:", user.uid);
          setCurrentUser(user);
          
          // Save auth state
          await saveAuthState({
            uid: user.uid,
            email: user.email,
          });
          if (!hasRedirected.current && pathname !== "/sign_in") {
            await checkUserProfile(user, pathname, router, hasRedirected, isMounted);
          }
        }
        
      } catch (error) {
        console.error("Error in auth state handler:", error);
        setCurrentUser(null);
        
        // If error occurs and not on public route, redirect to sign_in
        if (!hasRedirected.current && !publicRoutes.includes(pathname)) {
          hasRedirected.current = true;
          router.replace("/sign_in");
        }
      } finally {
        // Set loading to false after processing
        if (isMounted) {
          authInitialized.current = true;
          console.log("Setting loading to false");
          setIsLoading(false);
          isProcessingAuth.current = false;
        }
      }
    });

    return () => {
      isMounted = false;
      isProcessingAuth.current = false;
      if (authUnsubscribe.current) {
        authUnsubscribe.current();
        authUnsubscribe.current = null;
      }
    };
  }, []); // Only run once when component mounts
  
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
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => backHandler.remove();
    }, [pathname])
  );

  // Show loading when fonts not loaded or checking auth
  if (!loaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }


  return (
    <CallProvider>
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
          <Stack.Screen name="search" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="change_pass" />
          <Stack.Screen name="forget_pass" />
          <Stack.Screen name="call" />
          <Stack.Screen name="chat"/>
        </Stack>
        {tabRoutes.includes(pathname.replace('/', '')) && <BottomNavigation />}
        <StatusBar style="auto" />
      </ThemeProvider>
    </CallProvider>
  );
}

// Helper function to check user profile
async function checkUserProfile(
  user: any,
  pathname: string,
  router: any,
  hasRedirected: React.MutableRefObject<boolean>,
  isMounted: boolean
) {
  if (!isMounted || hasRedirected.current) return;

  try {
    
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!isMounted || hasRedirected.current) return;

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
    const needsRedirectToHome = pathname === "/" || 
                               pathname === "/sign_in" || 
                               pathname === "/sign_up" ||
                               pathname === "/forget_pass";
                               
    if (needsRedirectToHome) {
      hasRedirected.current = true;
      router.replace("/home");
    } else {

    }
    
  } catch (error) {
    console.error("Error checking user profile:", error);
    
    if (error instanceof Error && 'code' in error && (error as any).code === 'permission-denied') {
      console.log("Permission denied - redirect to form_profile");
      if (pathname !== "/form_profile") {
        hasRedirected.current = true;
        router.replace("/form_profile");
      }
    } else {
      throw error;
    }
  }
}