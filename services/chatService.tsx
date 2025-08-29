// services/chatService.ts
import { auth, db } from "@/lib/firebaseConfig";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

export const sendMessage = async (recipientId: string, text: string, type: string = "text") => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error("User not authenticated");

  const chatId = [currentUserId, recipientId].sort().join("_");
  
  const messageData = {
    type,
    text: text.trim(),
    senderId: currentUserId,
    recipientId,
    createdAt: serverTimestamp(),
    isRead: false,
  };

  try {
    // Thêm message
    await addDoc(collection(db, "chats", chatId, "messages"), messageData);
    console.log("✅ Message sent successfully");
    
    return { success: true, chatId };
  } catch (error) {
    console.error("❌ Error sending message:", error);
    throw error;
  }
};

export const markMessageAsRead = async (chatId: string, messageId: string) => {
  try {
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    await updateDoc(messageRef, { isRead: true });
    console.log("✅ Message marked as read");
  } catch (error) {
    console.error("❌ Error marking message as read:", error);
    throw error;
  }
};

export const generateChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("_");
};