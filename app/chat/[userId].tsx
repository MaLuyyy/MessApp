// app/chat/[userID].tsx
import MessageInput from "@/components/MessageInput";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function ChatScreen() {
  const router = useRouter();
  const { fullname } = useLocalSearchParams();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height); // lấy chiều cao bàn phím
    });
  
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
  
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header cố định */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#0000FF"
            onPress={() => router.back()}
          />
          <Text style={styles.headerTitle}>{fullname}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 20, paddingRight: 20 }}>
          <Ionicons name="call" size={24} color="#0000FF" />
          <Ionicons name="videocam" size={24} color="#0000FF" />
        </View>
      </View>
      <View style={styles.messages}>
        </View>

      {/* Messages + input bar */}
      <View
        style={[styles.chatWrapper, {marginBottom: keyboardVisible ? keyboardHeight + 10 : 0}]}
       
      >
        {/* Messages list */}
      

        {/* Input bar có padding dynamic */}
        <MessageInput
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 50,
  },
  chatWrapper: {
    backgroundColor: '#fff',
 
  },
  messages: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
