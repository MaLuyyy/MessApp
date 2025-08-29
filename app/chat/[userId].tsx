// app/chat/[userID].tsx
import MessageInput from "@/components/MessageInput";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, SafeAreaView, StyleSheet, Text, TouchableWithoutFeedback, View, Image, FlatList } from "react-native";
import { auth, db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

export default function ChatScreen() {
  const router = useRouter();
  const { fullname, userID } = useLocalSearchParams();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const currentUserId = auth.currentUser?.uid;
  const [messages, setMessages] = useState<any[]>([]);

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

  useEffect(() => {
    const chatId = [currentUserId, userID].sort().join("_");

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [userID]);

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUserId;

    if (item.type === "text") {
      return (
        <View style={[styles.message, isMe ? styles.myMessage : styles.theirMessage]}>
          <Text style={{ color: isMe ? "#fff" : "#000" }}>{item.text}</Text>
        </View>
      );
    }

    if (item.type === "image") {
      return (
        <View style={[styles.message, isMe ? styles.myMessage : styles.theirMessage]}>
          <Image source={{ uri: item.imageUrl }} style={{ width: 200, height: 200, borderRadius: 10 }} />
        </View>
      );
    }

    return null;
  };


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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10 }}
        />
      </TouchableWithoutFeedback>
      <View style={[styles.chatWrapper, {marginBottom: keyboardVisible ? keyboardHeight : 0}]} >     
        <MessageInput/>
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
  message: {
    maxWidth: "70%",
    padding: 10,
    marginVertical: 5,
    borderRadius: 15,
  },
  myMessage: {
    backgroundColor: "#1a73e8",
    alignSelf: "flex-end",
    borderTopRightRadius: 0,
  },
  theirMessage: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
  },
});
