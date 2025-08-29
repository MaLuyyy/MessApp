import { getCurrentUserData } from "@/services/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ActionSheet from "react-native-actionsheet";

export default function ProfileScreen(){
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const actionSheetRef = useRef<ActionSheet>(null);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);


    const pickFromCamera = async () => {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
      };

      const pickFromLibrary = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
      };
      const fetchUserData = async () => {
        try {
            setLoading(true);
            
            console.log("🔍 Fetching current user data...");
            
            const userData = await getCurrentUserData();
            
            if (userData) {
                console.log("✅ Got user data:", userData);
                setUserData(userData);
            } else {
                console.log("❌ User document not found");
                Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
            }

        } catch (error) {
            console.error("❌ Error fetching user data:", error);
            const errorMessage = error instanceof Error ? error.message : 'Không thể tải thông tin người dùng';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);
      
    if (loading) {
      return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text>Đang tải...</Text>
          </View>
      );
    }

    return(
        <View style={styles.container}>
          <View style={styles.header}>
              <Ionicons name="arrow-back" size={24} color={'#0000FF'}  onPress={() => router.back()} />
              <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
          </View>
            {/* Avatar + Info */}
          <View style={styles.profile}>
            <View style={styles.avatarWrapper}>
              <Image
                  source={{
                  uri: userData?.photoURL || "https://via.placeholder.com/100",
                  }}
                  style={styles.avatar}
              />
              <TouchableOpacity style={styles.cameraBtn}>
                  <Ionicons onPress={() => actionSheetRef.current?.show()}
                  name="camera" size={18} color="#000" />
              </TouchableOpacity>

              <ActionSheet
                  ref={actionSheetRef}
                  title={"Thay đổi ảnh đại diện"}
                  options={["Chụp ảnh", "Chọn từ thư viện", "Hủy"]}
                  cancelButtonIndex={2}
                  onPress={(index) => {
                  if (index === 0) pickFromCamera();
                  if (index === 1) pickFromLibrary();
                  }}
              />
            </View>
            <Text style={styles.name}>
                {userData?.fullname || "Chưa có tên"}
            </Text>
            <Text style={styles.username}>
                @{userData?.username || userData?.email?.split("@")[0]}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Tên</Text>
              <Text style={styles.value}>{userData?.fullname || "Chưa có tên"}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.label}>Tên người dùng</Text>
              <Text style={styles.value}>@{userData?.username}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.label}>Số điện thoại</Text>
              <Text style={styles.value}>{userData?.numberphone || "Chưa có"}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.label}>Tiểu sử</Text>
              <Text style={styles.value}>{userData?.bio || "Chưa có"}</Text>
            </View>
          </View>
                



        </View>
    )   
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingTop: 50,
      paddingBottom: 10,
    },
    headerTitle: { fontSize: 24, fontWeight: "600", marginLeft: 70 },
    profile: { alignItems: "center", marginVertical: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#ddd" },
    cameraBtn: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 3, // bóng nhẹ Android
        shadowColor: "#000", // bóng iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      name: { fontSize: 18, fontWeight: "600", marginTop: 10 },
      username: { color: "#666", marginTop: 2 },
      avatarWrapper: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      },
      infoSection: {
        width: "90%",
        marginTop: 20,
        alignSelf: "center",
      },
      infoBox: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#fff",
      },
      label: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
      },
      value: {
        fontSize: 15,
        color: "#000",
      },
      
      
})