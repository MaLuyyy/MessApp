import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { auth, db } from "@/lib/firebaseConfig";
import { webrtcService, CallData } from "@/services/webrtcService";
import IncomingCallModal from "@/components/IncomingCallModal";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

interface CallContextType {
  isInCall: boolean;
  currentCall: CallData | null;
  startCall: (calleeId: string, type: "audio" | "video") => Promise<void>;
  endCall: () => void;
}

const CallContext = createContext<CallContextType>({
  isInCall: false,
  currentCall: null,
  startCall: async () => {},
  endCall: () => {},
});

export const useCall = () => useContext(CallContext);

const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);

  const currentUserId = auth.currentUser?.uid;
  const router = useRouter();

  useEffect(() => {
    if (!currentUserId) return;

    console.log("🎧 Global WebRTC listener init:", currentUserId);
    webrtcService.listenForIncomingCalls(currentUserId);

    webrtcService.onIncomingCall = async (callData) => {
      console.log("📞 Incoming call received:", callData);

      // 🔎 Lấy info người gọi (caller) từ Firestore
      const callerSnap = await getDoc(doc(db, "users", callData.callerId));
      if (callerSnap.exists()) {
        callData.callerName = callerSnap.data().fullname;
        callData.callerPhoto = callerSnap.data().photoURL;
      }

      if (!isInCall) {
        setIncomingCall(callData);
      } else {
        if (callData.id) {
          webrtcService.rejectCall(callData.id);
        }
      }
    };

    return () => {
      webrtcService.stopListeningForIncomingCalls();
    };
  }, [currentUserId, isInCall]);

  const startCall = async (calleeId: string, type: "audio" | "video") => {
    try {
      let callerName = "Người dùng";
      let calleeName = "Đang gọi...";
      let calleePhoto = "";

      // Lấy tên caller
      if (currentUserId) {
        const snap = await getDoc(doc(db, "users", currentUserId));
        if (snap.exists()) {
          callerName = snap.data().fullname || callerName;
        }
      }

      // Lấy tên callee (người được gọi)
      const calleeSnap = await getDoc(doc(db, "users", calleeId));
      if (calleeSnap.exists()) {
        calleeName = calleeSnap.data().fullname;
        calleePhoto = calleeSnap.data().photoURL;
      }

      const callData = await webrtcService.startCall(
        calleeId,
        currentUserId!,
        callerName,
        type
      );

      // 🟢 Lưu thông tin call và điều hướng
      const fullCallData = {
        ...callData,
        calleeName,
        calleePhoto,
      };

      setCurrentCall(fullCallData);
      setIsInCall(true);

      // 🚀 Điều hướng đến màn hình cuộc gọi
      router.push(`/call/${callData.id}` as any);

    } catch (err) {
      Alert.alert("Lỗi", "Không thể bắt đầu cuộc gọi");
      console.error("❌ startCall error:", err);
    }
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      if (incomingCall.id) {
        await webrtcService.acceptCall(incomingCall.id);
      }
      setCurrentCall(incomingCall);
      setIsInCall(true);
      setIncomingCall(null);

      // 🚀 Điều hướng đến màn hình cuộc gọi khi chấp nhận
      router.push(`/call/${incomingCall.id}` as any);

    } catch (err) {
      Alert.alert("Lỗi", "Không thể chấp nhận cuộc gọi");
      setIncomingCall(null);
    }
  };

  const handleRejectIncomingCall = () => {
    if (incomingCall?.id) {
      webrtcService.rejectCall(incomingCall.id);
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    webrtcService.endCall();
    setIsInCall(false);
    setCurrentCall(null);
  };

  return (
    <CallContext.Provider value={{ isInCall, currentCall, startCall, endCall }}>
      {children}

      {/* Chỉ hiển thị modal cuộc gọi đến, không render CallScreen */}
      {incomingCall && (
        <IncomingCallModal
          visible={true}
          callData={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}
    </CallContext.Provider>
  );
};

export default CallProvider;