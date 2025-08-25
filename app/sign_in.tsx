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
import { db } from "../lib/firebaseConfig"; // db = getFirestore(app)
import { saveAuthState } from "@/lib/authState";

export default function SignIn(){
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [biometricType, setBiometricType] = useState<null | 'finger' | 'face'>(null);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadBiometricSetting = async () => {
          const enabled = await AsyncStorage.getItem('biometricEnabled');
          setBiometricEnabled(enabled === 'true');
        };
        loadBiometricSetting();
      }, []);

    useEffect(() => {
        const loadSavedEmail = async () => {
          const savedEmail = await AsyncStorage.getItem('savedEmail');
          if (savedEmail) {
            setEmail(savedEmail);
          }
        };
        loadSavedEmail();
      }, []);    

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
      
          // Lấy danh sách loại sinh trắc học hỗ trợ
          const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
          // Chuyển thành tên hiển thị
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
        } catch (err: any) {
          Alert.alert('Lỗi', err.message);
        }
      };

    const handleSignIn = async (pass?: string) => {
        if (loading) return;
        try {
            const user = await signIn(email, pass || password);      

            // Lưu email và password để sử dụng cho biometric login
            await AsyncStorage.setItem('savedEmail', email);
            await AsyncStorage.setItem('savedPassword', pass || password);

            // Lưu trạng thái đăng nhập
            await saveAuthState({
                uid: user.uid,
                email: user.email,
            });

            Toast.show({
                type: 'success',
                text1: 'Đăng nhập thành công',
                position: 'bottom',
                visibilityTime: 3000, 
            });
        } catch (error: any) {
            Alert.alert('Lỗi', error.message);
        }finally {
            setLoading(false);
        }
    };
     
    const authenticateWithBiometrics = async (method: string) => {
    const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: `Xác thực bằng ${method}`,
        fallbackLabel: 'Nhập mật khẩu',
    });
    
    if (auth.success) {
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        if (!savedPassword) {
        Alert.alert('Không tìm thấy mật khẩu, vui lòng đăng nhập thủ công');
        return;
        }
        handleSignIn(savedPassword);
    }
    };

    useEffect(() => {
        const checkBiometricType = async () => {
          try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) return; 
            // Ss
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            if (!savedEmail || savedEmail !== email) {
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
            console.log('Lỗi:', err);
          }
        };
    
        checkBiometricType();
      }, [email]);


    return (
        <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Đăng Nhập</Text>

        <InputField icon="mail" placeholder="Email" value={email} onChangeText={setEmail} />
        <InputField icon="lock" placeholder="Mật Khẩu" secureTextEntry value={password} onChangeText={setPassword} />
        <View style={styles.Row}>
            <TouchableOpacity onPress={() => router.replace('/forget_pass')}>
            <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>
            {biometricEnabled && biometricType === 'finger' && (
            <TouchableOpacity onPress={handleBiometricLogin}>
                <Ionicons name="finger-print-outline" size={28} />
            </TouchableOpacity>
            )}

            {biometricEnabled && biometricType === 'face' && (
            <TouchableOpacity onPress={handleBiometricLogin}>
                <Ionicons name="scan-outline" size={28} /> 
            </TouchableOpacity>
            )}
            
        </View>
        <TouchableOpacity style={styles.button} onPress={() => {
            AsyncStorage.setItem('savedPassword', password);
            handleSignIn();
            }}>
            <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button2} onPress={() => router.replace('/sign_up')}>
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
    Row:{
      justifyContent:'space-between',
      flexDirection:'row',
      paddingHorizontal:17,
      marginTop:17,
    },
    linkText: {
        textAlign: 'center',
        marginTop: 30,
        color: '#888',
    },
    loginWith:{
        marginTop: 20,
        textAlign: 'center',    
        marginBottom:10,
    }
  })