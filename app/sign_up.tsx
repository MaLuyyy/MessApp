import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import InputField from '../components/InputField';
import { signUp } from '../lib/auth';
import { auth, db} from '@/lib/firebaseConfig';
import Toast from 'react-native-toast-message';

export default function CreateAccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            Alert.alert('Lỗi', 'Email không hợp lệ');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu không trùng khớp');
            return;
        }
    try {

        const userCredential = await signUp(email, password);
        const user = userCredential.user;
    
        // ✅ Lưu họ tên vào Firestore theo uid
        await setDoc(doc(db, 'users', user.uid), {
          email: email,
          createdAt: new Date(),
        });
        Toast.show({
            type: 'success',
            text1: 'Đăng kí thành công',
            position: 'bottom',
            visibilityTime: 3000, // (ms)
            });
            await auth.signOut();
            setTimeout(() => {
                router.replace('/sign_in');
              }, 1000);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>Tạo Tài Khoản</Text>

      <InputField icon="mail" placeholder="Email" value={email} onChangeText={setEmail} />
      <InputField icon="lock" placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} />
      <InputField icon="lock" placeholder="Nhập lại mật khẩu" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>ĐĂNG KÍ</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/sign_in')}>
        <Text style={styles.linkText}>ĐĂNG NHẬP</Text>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
    color: '#593C1F',
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
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#888',
  },
});
