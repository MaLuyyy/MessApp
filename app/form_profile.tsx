import InputField from "@/components/InputField";
import { useRouter } from "expo-router";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from 'react-native-toast-message';
import { auth, db } from "../lib/firebaseConfig";

export default function FormInfoScreen(){
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [fullname, setFullname] = useState("");
    const [numberphone, setNumberphone] = useState("");
    const [birthday, setBirthday] = useState("");
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [loading, setLoading] = useState(false);

    // Debug logging
    useEffect(() => {
        console.log("=== FORM PROFILE DEBUG ===");
        console.log("Current user:", auth.currentUser?.uid);
        console.log("Auth state:", auth.currentUser ? "logged in" : "logged out");
        
        if (!auth.currentUser) {
            console.log("No user found, redirecting to sign_in");
            router.replace("/sign_in");
        }
    }, []);

    const handleConfirm = (date: Date) => {
        setBirthday(date.toISOString().split("T")[0]); // yyyy-mm-dd
        setDatePickerVisibility(false);
    };

    const handleSave = async () => {
        if (loading) return;

        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Lỗi", "Bạn chưa đăng nhập");
                return;
            }

            // ✅ Validate dữ liệu trước khi gửi lên Firestore
            if (!username || !fullname || !numberphone || !birthday) {
                Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
                return;
            }

            // Username: chỉ cho phép chữ + số, dài ít nhất 3 ký tự
            const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
            if (!usernameRegex.test(username)) {
                Alert.alert("Lỗi", "Username chỉ được chứa chữ, số, dấu gạch dưới và tối thiểu 3 ký tự");
                return;
            }

            // Fullname: chỉ chứa chữ (có dấu) và khoảng trắng
            const fullnameRegex = /^[\p{L}\s]+$/u;
            if (!fullnameRegex.test(fullname)) {
                Alert.alert("Lỗi", "Họ và tên chỉ được chứa chữ cái và khoảng trắng");
                return;
            }

            // Số điện thoại VN: 10 số, bắt đầu bằng 0
            const phoneRegex = /^(0\d{9}|(\+84)\d{9})$/;
            if (!phoneRegex.test(numberphone)) {
                Alert.alert("Lỗi", "Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)");
                return;
            }

            setLoading(true);

             // 🔍 Kiểm tra username có bị trùng không
            const usernameQuery = query(
                collection(db, "users"),
                where("username", "==", username)
            );
            const usernameSnapshot = await getDocs(usernameQuery);

            if (!usernameSnapshot.empty) {
                const existsOther = usernameSnapshot.docs.some(doc => doc.id !== user.uid);
                if (existsOther) {
                    Alert.alert("Lỗi", "Tên người dùng đã được sử dụng");
                    setLoading(false);
                    return;
                }
            }

            // 🔍 Kiểm tra số điện thoại có bị trùng không
            const phoneQuery = query(
                collection(db, "users"),
                where("numberphone", "==", numberphone)
            );
            const phoneSnapshot = await getDocs(phoneQuery);

            if (!phoneSnapshot.empty) {
                const existsOther = phoneSnapshot.docs.some(doc => doc.id !== user.uid);
                if (existsOther) {
                    Alert.alert("Lỗi", "Số điện thoại đã được sử dụng");
                    setLoading(false);
                    return;
                }
            }


            try {
                // Lưu thông tin với merge: true để giữ lại data cũ
                console.log("Saving user profile...");
                await setDoc(doc(db, "users", user.uid), {
                    username,
                    fullname,
                    numberphone,
                    birthday,
                    updatedAt: new Date(),
                }, { merge: true });

                Toast.show({
                    type: 'success',
                    text1: 'Thành công',
                    text2: 'Lưu thông tin thành công',
                    position: 'bottom',
                    visibilityTime: 3000,
                });

                // Redirect về home sau 1 giây
                setTimeout(() => {
                    router.replace("/home");
                }, 1000);

            } catch (firestoreError: any) {
                console.error("Firestore error:", firestoreError);
                
                if (firestoreError.code === 'permission-denied') {
                    Alert.alert("Lỗi", "Không có quyền truy cập. Vui lòng đăng nhập lại.");
                    // Có thể logout user và redirect về sign_in
                    await auth.signOut();
                    router.replace("/sign_in");
                } else {
                    Alert.alert("Lỗi", "Không thể lưu thông tin: " + firestoreError.message);
                }
            }

        } catch (error: any) {
            console.error("General error:", error);
            Alert.alert("Lỗi", error.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    return(
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Thông tin cá nhân</Text>

            <InputField 
                icon="user" 
                placeholder="Tên người dùng" 
                value={username} 
                onChangeText={setUsername}
                editable={!loading}
            />
            <InputField 
                icon="users" 
                placeholder="Họ và Tên" 
                value={fullname} 
                onChangeText={setFullname}
                editable={!loading}
            />
            <InputField 
                icon="phone" 
                placeholder="Số điện thoại" 
                value={numberphone} 
                onChangeText={setNumberphone}
                editable={!loading}
            />

            <TouchableOpacity 
                onPress={() => setDatePickerVisibility(true)}
                disabled={loading}
            >
                <InputField 
                    icon="calendar" 
                    placeholder="Ngày sinh" 
                    value={birthday} 
                    editable={false} 
                />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={() => setDatePickerVisibility(false)}
                maximumDate={new Date()} // Không cho chọn ngày tương lai
            />

            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={handleSave}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? "ĐANG LƯU..." : "XÁC NHẬN THÔNG TIN"}
                </Text>
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
    buttonDisabled: {
        backgroundColor: '#cccccc',
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});