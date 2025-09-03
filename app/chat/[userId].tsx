// app/chat/[userID].tsx
import MessageInput from "@/components/MessageInput";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Keyboard, SafeAreaView, StyleSheet, Text, TouchableWithoutFeedback, View, Image, FlatList } from "react-native";
import { auth, db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { addListener } from "@/lib/listenerManager";


interface Message {
  id: string;
  senderId: string;
  text?: string;
  type: "text" | "image";
  imageUrl?: string;
  createdAt: any; // Firestore timestamp
}

interface DateSeparator {
  id: string;
  type: "date";
  label: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { fullname, userId } = useLocalSearchParams();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const currentUserId = auth.currentUser?.uid;
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
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
    if (!currentUserId || !userId) {
      console.log("Missing user IDs:", { 
        currentUserId, 
        userId: userId,
        authUser: auth.currentUser?.uid 
      });
      return;
    }

    const otherUserId = userId as string;
    const chatId = [currentUserId, otherUserId].sort().join("_");

    type ChatItem = Message | DateSeparator;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc") // ✅ Đổi từ "asc" thành "desc" để tin nhắn mới nhất ở đầu
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rawMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 🔹 Group theo ngày
        const grouped = groupMessagesWithDates(rawMessages);
        setMessages(grouped);
      },
      (error) => {
        console.error("❌ Error listening to messages:", error);
      }
    );
    addListener(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, [currentUserId, userId]);

 // 🔹 Group messages theo ngày
 const groupMessagesWithDates = (rawMessages: any[]) => {
  const grouped: any[] = [];
  let lastDate: string | null = null;

  const sortedMessages = [...rawMessages].reverse();

  sortedMessages.forEach((msg) => {
    const date = msg.createdAt?.toDate
      ? msg.createdAt.toDate()
      : new Date(msg.createdAt);

    const dateStr = date.toDateString();

    if (dateStr !== lastDate) {
      grouped.push({
        id: `date-${dateStr}`,
        type: "date",
        label: formatDateLabel(date),
      });
      lastDate = dateStr;
    }

    grouped.push(msg);
  });

  return grouped.reverse();
};

  const renderMessage = ({ item }: { item: any }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      );
    }
  
    const isMe = item.senderId === currentUserId;
  
    if (item.type === "text") {
      return (
        <View style={[
          styles.message, 
          isMe ? styles.myMessage : styles.theirMessage
        ]}>
          <Text style={{ color: isMe ? "#fff" : "#000" }}>{item.text}</Text>
          <Text style={[
            styles.messageTime, 
            { color: isMe ? "rgba(255,255,255,0.7)" : "#999" }
          ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      );
    }
  
    if (item.type === "image") {
      return (
        <View style={[
          styles.message, 
          isMe ? styles.myMessage : styles.theirMessage
        ]}>
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          <Text style={[
            styles.messageTime, 
            { color: isMe ? "rgba(255,255,255,0.7)" : "#999" }
          ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      );
    }
  
    return null;
  };
  
  // 🔹 Format ngày giống Messenger
  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hôm nay";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    }
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // 🔹 Format giờ
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ 
            padding: 10,
          }}
          inverted={true} // ✅ Quan trọng: Hiển thị từ cuối lên đầu
          showsVerticalScrollIndicator={false}
        />
      </TouchableWithoutFeedback>
      
      <View style={[styles.chatWrapper, {marginBottom: keyboardVisible ? keyboardHeight : 0}]} >     
        <MessageInput />
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
    padding: 12,
    marginVertical: 2,
    borderRadius: 15,
  },
  myMessage: {
    backgroundColor: "#1a73e8",
    alignSelf: "flex-end",
    borderTopRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 4,
  },
  dateSeparator: {
    alignSelf: "center",
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  
});