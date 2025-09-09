// app/call/[callId].tsx - Màn hình cuộc gọi riêng
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, BackHandler } from 'react-native';
import CallScreen from '@/components/CallScreen';
import { useCall } from '@/providers/CallProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { CallData } from '@/services/webrtcService';

export default function CallScreenRoute() {
  const router = useRouter();
  const { callId } = useLocalSearchParams();
  const { currentCall, endCall } = useCall();
  const [callData, setCallData] = useState<CallData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ngăn back button khi đang gọi
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Kết thúc cuộc gọi',
        'Bạn có muốn kết thúc cuộc gọi không?',
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Kết thúc', 
            style: 'destructive',
            onPress: handleEndCall 
          }
        ]
      );
      return true; // Ngăn default behavior
    });

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    loadCallData();
  }, [callId]);

  const loadCallData = async () => {
    try {
      if (currentCall) {
        setCallData(currentCall);
        setIsLoading(false);
        return;
      }

      if (callId && typeof callId === 'string') {
        const callDoc = await getDoc(doc(db, 'calls', callId));
        if (callDoc.exists()) {
          const data = { id: callDoc.id, ...callDoc.data() } as CallData;
          setCallData(data);
        } else {
          Alert.alert('Lỗi', 'Không tìm thấy cuộc gọi');
          router.back();
        }
      }
    } catch (error) {
      console.error('Error loading call data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin cuộc gọi');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    endCall();
    router.back(); // Quay về màn hình trước
  };

  if (isLoading) {
    return null; // Hoặc loading spinner
  }

  if (!callData) {
    return null;
  }

  return (
    <CallScreen
      callData={callData}
      isIncoming={false}
      onEndCall={handleEndCall}
    />
  );
}