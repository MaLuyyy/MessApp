import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import InputField from '../components/InputField';
import { sendPass } from '../lib/auth';
import Toast from 'react-native-toast-message';

export default function ForgetPassScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    if (!email || !email.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Vui lòng nhập email hợp lệ',
        position: 'bottom',
        visibilityTime: 3000, // (ms)
      });
      return;
    }
    try {
      await sendPass(email);
      Toast.show({
        type: 'info',
        text1: 'Vui lòng kiểm tra email để đặt lại mật khẩu',
        position: 'bottom',
        visibilityTime: 3000, // (ms)
      });
      
      router.replace('/sign_in');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Quên mật khẩu</Text>

      <InputField icon="mail" placeholder="Email" value={email} onChangeText={setEmail} />

      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Reset mật khẩu</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/sign_in')}>
        <Text style={styles.linkText}>Quay lại đăng nhập</Text>
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
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
    color: '#593C1F',
  },
  forgot: {
    textAlign: 'right',
    marginVertical: 8,
    color: '#888',
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
