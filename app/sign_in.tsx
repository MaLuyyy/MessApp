import { signIn } from "@/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import InputField from '../components/InputField';
import { db, auth } from "../lib/firebaseConfig";
import { saveAuthState } from "@/lib/authState";

export default function SignIn(){
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [biometricType, setBiometricType] = useState<null | 'finger' | 'face'>(null);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    // Clear any stale state when component mounts
    useEffect(() => {
        console.log("=== SIGN_IN COMPONENT MOUNTED ===");
        console.log("Current auth state:", auth.currentUser?.uid || "none");
        
        // Reset any loading states
        setLoading(false);
        
        const loadInitialData = async () => {
            // Load biometric setting
            const enabled = await AsyncStorage.getItem('biometricEnabled');
            setBiometricEnabled(enabled === 'true');
            
            // Load saved email for biometric
            const savedEmailForBio = await AsyncStorage.getItem('savedEmailForBio');
            if (savedEmailForBio) {
                setEmail(savedEmailForBio);
            }
        };
        
        loadInitialData();
    }, []);

    const handleSignIn = async (pass?: string) => {
        if (loading) return;
        
        // Basic validation
        if (!email.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập email');
            return;
        }
        
        if (!pass && !password.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
            return;
        }
        
        setLoading(true);
        
        try {
            console.log("Attempting sign in with email:", email);
            const user = await signIn(email, pass || password);
            console.log("Sign in successful, user:", user.uid);

            // Save credentials for biometric login
            await AsyncStorage.setItem('savedEmailForBio', email);
            await AsyncStorage.setItem('savedEmail', email);
            await AsyncStorage.setItem('savedPassword', pass || password);
            await AsyncStorage.setItem('savedPasswordForBio', pass || password);

            // Save auth state
            await saveAuthState({
                uid: user.uid,
                email: user.email,
            });

            Toast.show({
                type: 'success',
                text1: 'Đăng nhập thành công',
                position: 'bottom',
                visibilityTime: 2000, 
            });
            
            // Check user profile and redirect accordingly
            console.log("Checking user profile after sign in...");
            await checkUserProfileAndRedirect(user);
            
        } catch (error) {
            console.error("Sign in error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const checkUserProfileAndRedirect = async (user: any) => {
        try {
            console.log("Checking user profile for redirect...");
            
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                console.log("No user document - redirecting to form_profile");
                router.replace("/form_profile");
                return;
            }

            const data = userDoc.data();
            const requiredFields = ['username', 'fullname', 'numberphone', 'birthday'];
            const missingFields = requiredFields.filter(field => !data?.[field]);
            
            if (missingFields.length > 0) {
                console.log("Missing profile fields - redirecting to form_profile");
                router.replace("/form_profile");
                return;
            }

            // Profile complete - redirect to home
            console.log("Profile complete - redirecting to home");
            router.replace("/home");
            
        } catch (error) {
            console.error("Error checking user profile:", error);
            
            if (error instanceof Error && 'code' in error && (error as any).code === 'permission-denied') {
                console.log("Permission denied - redirecting to form_profile");
                router.replace("/form_profile");
            } else {
                // On error, default to home
                console.log("Error occurred, defaulting to home");
                router.replace("/home");
            }
        }
    };

    const authenticateWithBiometrics = async (method: string) => {
        try {
            const auth = await LocalAuthentication.authenticateAsync({
                promptMessage: `Xác thực bằng ${method}`,
                fallbackLabel: 'Nhập mật khẩu',
            });
        
            if (auth.success) {
                const savedPasswordForBio = await AsyncStorage.getItem('savedPasswordForBio');
                if (!savedPasswordForBio) {
                    Alert.alert('Không tìm thấy mật khẩu, vui lòng đăng nhập thủ công');
                    return;
                }
                await handleSignIn(savedPasswordForBio);
            }
        } catch (error) {
            console.error("Biometric auth error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Không thể xác thực sinh trắc học';
            Alert.alert('Lỗi', errorMessage);
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                Alert.alert('Thiết bị không hỗ trợ sinh trắc học');
                return;
            }
      
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) {
                Alert.alert('Chưa cài Face ID hoặc vân tay');
                return;
            }
      
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
            const options = supportedTypes.map((type) => {
                if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) return 'Vân tay';
                if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) return 'Face ID';
                if (type === LocalAuthentication.AuthenticationType.IRIS) return 'Quét mống mắt';
                return 'Khác';
            });
      
            if (options.length > 1) {
                Alert.alert(
                    'Chọn phương thức',
                    'Bạn muốn đăng nhập bằng?',
                    options.map((opt) => ({
                        text: opt,
                        onPress: () => authenticateWithBiometrics(opt),
                    }))
                );
            } else {
                authenticateWithBiometrics(options[0]);
            }
        } catch (err) {
            console.error("Biometric login error:", err);
            const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
            Alert.alert('Lỗi', errorMessage);
        }
    };

    useEffect(() => {
        const checkBiometricType = async () => {
            try {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasHardware || !isEnrolled) return; 
                
                const savedEmailForBio = await AsyncStorage.getItem('savedEmailForBio');
                if (!savedEmailForBio || savedEmailForBio !== email) {
                    setBiometricType(null);
                    return;
                }

                const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
                if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('finger');
                } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    setBiometricType('face');
                }
            } catch (err) {
                console.log('Biometric check error:', err);
            }
        };

        checkBiometricType();
    }, [email]);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Đăng Nhập</Text>

            <InputField 
                icon="mail" 
                placeholder="Email" 
                value={email} 
                onChangeText={setEmail}
                editable={!loading}
            />
            <InputField 
                icon="lock" 
                placeholder="Mật Khẩu" 
                secureTextEntry 
                value={password} 
                onChangeText={setPassword}
                editable={!loading}
            />
            
            <View style={styles.Row}>
                <TouchableOpacity 
                    onPress={() => router.push('/forget_pass')}
                    disabled={loading}
                >
                    <Text style={styles.forgot}>Quên mật khẩu?</Text>
                </TouchableOpacity>
                
                {biometricEnabled && biometricType === 'finger' && (
                    <TouchableOpacity 
                        onPress={handleBiometricLogin}
                        disabled={loading}
                    >
                        <Ionicons name="finger-print-outline" size={28} />
                    </TouchableOpacity>
                )}

                {biometricEnabled && biometricType === 'face' && (
                    <TouchableOpacity 
                        onPress={handleBiometricLogin}
                        disabled={loading}
                    >
                        <Ionicons name="scan-outline" size={28} /> 
                    </TouchableOpacity>
                )}
            </View>
            
            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={() => handleSignIn()}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
                </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.button2} 
                onPress={() => router.push('/sign_up')}
                disabled={loading}
            >
                <Text style={styles.buttonText2}>TẠO TÀI KHOẢN</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 40,
        color: '#593C1F',
    },
    forgot: {
        textAlign: 'left',
        fontSize: 14,
        color: 'blue',
    },
    button: {
        backgroundColor: '#0000FF',
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#FDB813',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 10,
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
        shadowOpacity: 0,
    },
    button2: {
        backgroundColor: '#DCDCDC',
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#DCDCDC',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonText2: {
        color: '#000000',
        fontWeight: 'bold',
    },
    Row: {
        justifyContent: 'space-between',
        flexDirection: 'row',
        paddingHorizontal: 17,
        marginTop: 17,
    },
    linkText: {
        textAlign: 'center',
        marginTop: 30,
        color: '#888',
    },
    loginWith: {
        marginTop: 20,
        textAlign: 'center',    
        marginBottom: 10,
    }
});