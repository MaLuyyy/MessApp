// components/ChatList.tsx
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChatItem {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: any;
  lastMessageType: string;
  isRead: boolean;
}

export default function ChatList() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) {
      console.log("No current user for chat list");
      return;
    }

    console.log("🔍 Setting up chat list listener for user:", currentUserId);
    
    // Lắng nghe tất cả các collection chats
    const chatsRef = collection(db, "chats");
    
    const unsubscribe = onSnapshot(chatsRef, async (snapshot) => {
      try {
        const chatPromises: Promise<ChatItem | null>[] = [];
        
        snapshot.docs.forEach((chatDoc) => {
          const chatId = chatDoc.id;
          
          // Kiểm tra xem chatId có chứa currentUserId không
          if (chatId.includes(currentUserId)) {
            const promise = processChatDocument(chatId, currentUserId);
            chatPromises.push(promise);
          }
        });

        const chatResults = await Promise.all(chatPromises);
        const validChats = chatResults.filter((chat): chat is ChatItem => chat !== null);
        
        // Sắp xếp theo thời gian tin nhắn mới nhất
        validChats.sort((a, b) => {
          if (!a.lastMessageTime || !b.lastMessageTime) return 0;
          return b.lastMessageTime.seconds - a.lastMessageTime.seconds;
        });

        console.log(`📋 Found ${validChats.length} chats for current user`);
        setChats(validChats);
        
      } catch (error) {
        console.error("Error processing chat list:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log("🧹 Cleaning up chat list listener");
      unsubscribe();
    };
  }, [currentUserId]);

  // Xử lý từng chat document
  const processChatDocument = async (chatId: string, currentUserId: string): Promise<ChatItem | null> => {
    try {
      // Lấy userId của người khác từ chatId
      const userIds = chatId.split("_");
      const otherUserId = userIds.find(id => id !== currentUserId);
      
      if (!otherUserId) {
        console.log("Could not find other user in chatId:", chatId);
        return null;
      }

      // Lấy tin nhắn mới nhất từ subcollection messages
      const messagesRef = collection(db, "chats", chatId, "messages");
      const lastMessageQuery = query(messagesRef, orderBy("createdAt", "desc"));
      
      return new Promise((resolve) => {
        const unsubMessages = onSnapshot(lastMessageQuery, async (messagesSnapshot) => {
          try {
            if (messagesSnapshot.empty) {
              resolve(null);
              return;
            }

            const lastMessageDoc = messagesSnapshot.docs[0];
            const lastMessageData = lastMessageDoc.data();

            // Lấy thông tin user khác
            const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
            const otherUserData = otherUserDoc.exists() ? otherUserDoc.data() : null;

            const chatItem: ChatItem = {
              chatId,
              otherUserId,
              otherUserName: otherUserData?.fullname || otherUserData?.username || "Unknown User",
              otherUserAvatar: otherUserData?.photoURL,
              lastMessage: lastMessageData.type === "text" 
                ? lastMessageData.text 
                : lastMessageData.type === "image" 
                  ? "📷 Hình ảnh" 
                  : "Tin nhắn",
              lastMessageTime: lastMessageData.createdAt,
              lastMessageType: lastMessageData.type,
              isRead: lastMessageData.senderId === currentUserId || lastMessageData.isRead === true,
            };

            resolve(chatItem);
          } catch (error) {
            console.error("Error processing message data:", error);
            resolve(null);
          }
        });

        // Cleanup subscription after first result
        setTimeout(() => unsubMessages(), 1000);
      });

    } catch (error) {
      console.error("Error in processChatDocument:", error);
      return null;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes}p`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => {
        console.log("📱 Opening chat with:", item.otherUserName);
        router.push({
          pathname: "/chat/[userId]",
          params: { 
            userId: item.otherUserId,
            fullname: item.otherUserName 
          }
        });
      }}
    >
      <Image
        source={{ 
          uri: item.otherUserAvatar || "https://via.placeholder.com/50x50/cccccc/666666?text=👤" 
        }}
        style={styles.avatar}
      />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.userName}>{item.otherUserName}</Text>
          <Text style={styles.timeText}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text 
          style={[
            styles.lastMessage,
            !item.isRead && styles.unreadMessage
          ]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải danh sách chat...</Text>
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
        <Text style={styles.emptySubText}>Tìm kiếm bạn bè để bắt đầu chat</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      renderItem={renderChatItem}
      keyExtractor={(item) => item.chatId}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  unreadMessage: {
    fontWeight: "500",
    color: "#000",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a73e8",
    marginLeft: 8,
  },
});