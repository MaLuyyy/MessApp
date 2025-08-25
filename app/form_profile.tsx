import InputField from "@/components/InputField";
import { useRouter } from "expo-router";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { auth, db } from "../lib/firebaseConfig";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export default function FormInfoScreen(){
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [fullname, setFullname] = useState("");
    const [numberphone, setNumberphone] = useState("");
    const [birthday, setBirthday] = useState("");
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);


    const handleConfirm = (date: Date) => {
        setBirthday(date.toISOString().split("T")[0]); // yyyy-mm-dd
        setDatePickerVisibility(false);
      };


    const handleSave = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return Alert.alert("Lỗi", "Bạn chưa đăng nhập");

            // ✅ Validate dữ liệu trước khi gửi lên Firestore
            if (!username || !fullname || !numberphone || !birthday) {
              return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            }
            // Username: chỉ cho phép chữ + số, dài ít nhất 3 ký tự
            const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
            if (!usernameRegex.test(username)) {
              return Alert.alert("Lỗi", "Username chỉ được chứa chữ, số, dấu gạch dưới và tối thiểu 3 ký tự");
            }
            // Fullname: chỉ chứa chữ (có dấu) và khoảng trắng
            const fullnameRegex = /^[\p{L}\s]+$/u;
            if (!fullnameRegex.test(fullname)) {
              return Alert.alert("Lỗi", "Họ và tên chỉ được chứa chữ cái và khoảng trắng");
            }
            // Số điện thoại VN: 10 số, bắt đầu bằng 0
            const phoneRegex = /^(0\d{9}|(\+84)\d{9})$/;
            if (!phoneRegex.test(numberphone)) {
              return Alert.alert("Lỗi", "Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)");
            }
            // Check username tồn tại chưa
            const q1 = query(collection(db, "users"), where("username", "==", username));
            const snap1 = await getDocs(q1);
            if (!snap1.empty) {
            return Alert.alert("Lỗi", "Username đã được sử dụng");
            }

            // Check số điện thoại tồn tại chưa
            const q2 = query(collection(db, "users"), where("numberphone", "==", numberphone));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) {
            return Alert.alert("Lỗi", "Số điện thoại đã được sử dụng");
            }

            await setDoc(doc(db, "users", user.uid), {
                username,
                fullname,
                numberphone,
                birthday
            }, { merge: true });
    
            Alert.alert("Thành công", "Lưu thông tin thành công");
            //router.replace("Home");
        } catch (error: any) {
            Alert.alert("Lỗi", error.message);
        }
    };

    return(
        <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Thông tin cá nhân</Text>

      <InputField icon="mail" placeholder="Tên người dùng" value={username} onChangeText={setUsername} />
      <InputField icon="mail" placeholder="Họ và Tên" value={fullname} onChangeText={setFullname} />
      <InputField icon="mail" placeholder="Số điện thoại" value={numberphone} onChangeText={setNumberphone} />

      <TouchableOpacity onPress={() => setDatePickerVisibility(true)}>
        <InputField icon="calendar" placeholder="Ngày sinh" value={birthday} editable={false} />
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={() => setDatePickerVisibility(false)}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Xác nhận thông tin</Text>
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
    button: {
      backgroundColor: '#FDB813',
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
  });