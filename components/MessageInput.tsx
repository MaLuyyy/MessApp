// components/MessageInput.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "@/lib/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";


export default function MessageInput({ bottomPadding = 35,  currentUserId = auth.currentUser?.uid}: { bottomPadding?: number ; currentUserId?: string }) {
  const [text, setText] = useState("");
  const { userID } = useLocalSearchParams(); 

  const handleSend = async () => {
    if (text.trim() === "") return;

    try {
      // tạo chatId cố định theo 2 user
      const chatId = [currentUserId, userID].sort().join("_");

      await addDoc(collection(db, "chats", chatId, "messages"), {
        type: "text",
        text,
        senderId: currentUserId,
        createdAt: serverTimestamp(),
      });

      setText("");
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* Icon bên trái */}
      <View style={styles.leftIcons}>
        <TouchableOpacity>
          <Ionicons name="camera" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="image" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="mic" size={24} color="#1a73e8" />
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
