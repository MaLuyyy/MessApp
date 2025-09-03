// components/MessageInput.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "@/lib/firebaseConfig";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";

export default function MessageInput({ bottomPadding = 35 }: { bottomPadding?: number }) {
  const [text, setText] = useState("");
  const { userId } = useLocalSearchParams(); 
  const currentUserId = auth.currentUser?.uid;
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
  
    //const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;
  
    const chatId = [currentUserId, userId].sort().join("_");
  
    // 1. Thêm tin nhắn vào messages
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUserId,
      text,
      type: "text",
      createdAt: serverTimestamp(),
    });
  
    // 2. Update chat metadata
    await setDoc(doc(db, "chats", chatId), {
      participants: [currentUserId, userId],
      lastMessage: text,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  
    setText("");
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

   // ✅ Chọn ảnh từ thư viện & gửi từng ảnh
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // 👈 chọn nhiều ảnh
      quality: 0.7,
    });

    if (result.canceled || !currentUserId) return;

    const chatId = [currentUserId, userId].sort().join("_");

    for (const asset of result.assets) {
      try {
        const base64Data = await convertImageToBase64(asset.uri);
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: currentUserId,
          type: "image",
          imageUrl: base64Data,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("❌ Error sending image:", err);
      }
    }

    // cập nhật lastMessage là "📷 Đã gửi ảnh"
    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [currentUserId, userId],
        lastMessage:
          result.assets.length > 1
            ? ` Đã gửi ${result.assets.length} ảnh`
            : " Đã gửi một ảnh",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

// ✅ Chụp ảnh từ camera
const handlePickCamera = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    //base64: false, // mình vẫn convert thủ công để thống nhất
  });

  if (result.canceled || !currentUserId) return;

  const chatId = [currentUserId, userId].sort().join("_");

  try {
    const asset = result.assets[0];
    const base64Data = await convertImageToBase64(asset.uri);

    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUserId,
      type: "image",
      imageUrl: base64Data,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [currentUserId, userId],
        lastMessage: "Đã gửi một ảnh",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("❌ Error sending camera image:", err);
  }
};

const startRecording = async () => {
  try {
    console.log("🎤 Requesting permissions...");
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== "granted") {
      alert("Cần cấp quyền micro để ghi âm");
      return;
    }

    console.log("🎤 Starting recording...");
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
    console.log("✅ Recording started");
  } catch (err) {
    console.error("❌ Error starting recording:", err);
  }
};

const stopRecording = async () => {
  console.log("🛑 Stopping recording...");
  if (!recording) return;
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  setRecording(null);

  if (!uri || !auth.currentUser) return;
  const currentUserId = auth.currentUser.uid;
  const chatId = [currentUserId, userId].sort().join("_");

  try {
    // convert file audio thành base64
    const base64Audio = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUserId,
      type: "audio",
      audioUrl: `data:audio/m4a;base64,${base64Audio}`,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [currentUserId, userId],
        lastMessage: "Đã gửi tin nhắn thoại",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("❌ Error sending audio:", err);
  }
};

  
  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* Icon bên trái */}
      <View style={styles.leftIcons}>
        <TouchableOpacity onPress={handlePickCamera}>
          <Ionicons name="camera" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickImage}>
          <Ionicons name="image" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording}>
          <Ionicons name="mic" size={24} color={recording ? "red" : "#1a73e8"}  />
        </TouchableOpacity>
      </View>

      {/* Ô nhập */}
      <TextInput
        style={styles.input}
        placeholder="Nhắn tin"
        value={text}
        onChangeText={setText}
      />

      {/* Icon bên phải */}
      <View style={styles.rightIcons}>
        <TouchableOpacity>
          <Ionicons name="happy" size={24} color="#1a73e8" />
        </TouchableOpacity>
        {text.trim() === "" ? (
          <TouchableOpacity>
            <Ionicons name="thumbs-up" size={24} color="#1a73e8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSend}>
            <Ionicons name="send" size={24} color="#1a73e8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  leftIcons: {
    flexDirection: "row",
    gap: 10,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
});