import { getCurrentUserData, updateUserAvatar} from "@/services/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ActionSheet from "react-native-actionsheet";
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';

export default function ProfileScreen(){
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const actionSheetRef = useRef<ActionSheet>(null);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);


    const pickFromCamera = async () => {
      try {
          console.log("📷 Opening camera...");
          
          // Request camera permissions
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
          if (cameraPermission.status !== 'granted') {
              Alert.alert('Lỗi', 'Cần cấp quyền sử dụng camera');
              return;
          }

          const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5, // Reduce quality more to keep base64 smaller
          });

          if (!result.canceled && result.assets[0]) {
              const imageUri = result.assets[0].uri;
              console.log("✅ Image captured:", imageUri);
              
              // Convert to base64 and upload
              const base64Image = await convertImageToBase64(imageUri);
              await uploadImageToFirestore(base64Image);
          }
      } catch (error: any) {
          console.error("❌ Error picking from camera:", error);
          Alert.alert("Lỗi", error.message || "Không thể chụp ảnh");
      }
    };

    const pickFromLibrary = async () => {
        try {
            console.log("📁 Opening library...");
            
            // Request media library permissions
            const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libraryPermission.status !== 'granted') {
                Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5, // Reduce quality more to keep base64 smaller
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                console.log("✅ Image selected:", imageUri);
                
                // Convert to base64 and upload
                const base64Image = await convertImageToBase64(imageUri);
                await uploadImageToFirestore(base64Image);
            }
        } catch (error: any) {
            console.error("❌ Error picking from library:", error);
            Alert.alert("Lỗi", error.message || "Không thể chọn ảnh từ thư viện");
        }
    };

  // Convert image to base64
  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
        console.log("🔄 Converting image to base64...");
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const base64WithPrefix = `data:image/jpeg;base64,${base64}`;
        console.log("✅ Image converted to base64, size:", base64WithPrefix.length);
        return base64WithPrefix;
    } catch (error) {
        console.error("❌ Error converting image to base64:", error);
        throw new Error("Không thể chuyển đổi ảnh");
    }
  };

    // Upload image using Firestore API
    const uploadImageToFirestore = async (base64Image: string) => {
      try {
          setUploadingImage(true);
          console.log("🔄 Uploading image to Firestore...");

          // Kiểm tra kích thước base64 (Firestore có giới hạn 1MB per field)
          if (base64Image.length > 1048576) { // 1MB
              throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh khác.");
          }

          // Update user avatar using firestoreService
          await updateUserAvatar(base64Image);

          // Update local state
          setUserData((prev: any) => ({
              ...prev,
              photoURL: base64Image
          }));

          setImage(base64Image);

          Toast.show({
              type: 'success',
              text1: 'Thành công',
              text2: 'Cập nhật ảnh đại diện thành công',
              position: 'bottom',
              visibilityTime: 3000,
          });

          console.log("✅ Image uploaded successfully to Firestore");

      } catch (error: any) {
          console.error("❌ Error uploading image:", error);
          const errorMessage = error.message || "Không thể cập nhật ảnh đại diện";
          
          Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: errorMessage,
              position: 'bottom',
              visibilityTime: 4000,
          });
      } finally {
          setUploadingImage(false);
      }
    };

    const fetchUserData = async () => {
      try {
          setLoading(true);
          
          console.log("🔍 Fetching current user data using Firestore API...");
          
          const userData = await getCurrentUserData();
          
          if (userData) {
            console.log("✅ Got user data:", {
              ...userData,
              photoURL: userData.photoURL 
                ? userData.photoURL.substring(0, 30) + "..."
                : null,
            });
                          setUserData(userData);
              
              // Set image from userData if exists
              if (userData.photoURL) {
                  setImage(userData.photoURL);
                  console.log("🖼️ Avatar loaded from Firestore");
              }
          } else {
              console.log("❌ User document not found");
              Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
          }

      } catch (error: any) {
          console.error("❌ Error fetching user data:", error);
          const errorMessage = error.message || 'Không thể tải thông tin người dùng';
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

    // Get avatar source - priority: local image > userData.photoURL > placeholder
    const getAvatarSource = () => {
      if (image) {
          return { uri: image };
      }
      if (userData?.photoURL) {
          return { uri: userData.photoURL };
      }
      return { uri: "https://via.placeholder.com/100/cccccc/666666?text=Avatar" };
  };
  
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
                  source={getAvatarSource()}
                  style={styles.avatar}
              />
              <TouchableOpacity 
                        style={[styles.cameraBtn, uploadingImage && styles.cameraBtnDisabled]}
                        disabled={uploadingImage}
                    >
                        {uploadingImage ? (
                            <Ionicons name="hourglass" size={18} color="#666" />
                        ) : (
                            <Ionicons 
                                onPress={() => actionSheetRef.current?.show()}
                                name="camera" 
                                size={18} 
                                color="#000" 
                            />
                        )}
                    </TouchableOpacity>

              <ActionSheet
                  ref={actionSheetRef}
                  title={"Thay đổi ảnh đại diện"}
                  options={["Chụp ảnh", "Chọn từ thư viện", "Hủy"]}
                  cancelButtonIndex={2}
                  onPress={(index) => {
                  if (uploadingImage) return;
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
            {uploadingImage && (
                    <Text style={styles.uploadingText}>Đang cập nhật ảnh...</Text>
                )}
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
      cameraBtnDisabled: {
        backgroundColor: "#f0f0f0",
    },
    uploadingText: { 
      color: "#666", 
      fontSize: 12, 
      marginTop: 5, 
      fontStyle: "italic" 
  },
      
})