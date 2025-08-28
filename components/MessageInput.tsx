// components/MessageInput.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function MessageInput({ bottomPadding = 25 }: { bottomPadding?: number }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim() === "") return;
    console.log("Đã gửi:", text);
    setText("");
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
