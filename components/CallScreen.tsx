// components/CallScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import webrtcService, { CallData } from '@/services/webrtcService';
import { Image } from "react-native";

const { width, height } = Dimensions.get('window');

interface CallScreenProps {
  callData: CallData;
  isIncoming?: boolean;
  onEndCall: () => void;
}

export default function CallScreen({ callData, isIncoming = false, onEndCall }: CallScreenProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callData.type === 'video');
  const [callStatus, setCallStatus] = useState<string>(isIncoming ? 'Cuộc gọi đến...' : 'Đang gọi...');
  const [callDuration, setCallDuration] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Timer for call duration
  const callTimer = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);


    // chọn tên để hiển thị
    const displayName = isIncoming ? callData.callerName : callData.calleeName;
    // chọn avatar (sau này bạn có thể thay Ionicons = Image)
    const displayPhoto = isIncoming ? callData.callerPhoto : callData.calleePhoto;


  useEffect(() => {
    setupWebRTC();
    startPulseAnimation();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isConnected && !startTime.current) {
      startTime.current = Date.now();
      startCallTimer();
    }
  }, [isConnected]);

  const setupWebRTC = () => {
    webrtcService.onLocalStream = (stream) => {
      console.log('📱 Local stream received');
      setLocalStream(stream);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    webrtcService.onRemoteStream = (stream) => {
      console.log('📺 Remote stream received');
      setRemoteStream(stream);
      setIsConnected(true);
      setCallStatus('Đã kết nối');
      stopPulseAnimation();
    };

    webrtcService.onCallAccepted = () => {
      setCallStatus('Đã chấp nhận');
    };

    webrtcService.onCallRejected = () => {
      setCallStatus('Cuộc gọi bị từ chối');
      setTimeout(() => {
        onEndCall();
      }, 1500);
    };

    webrtcService.onCallEnded = () => {
      setCallStatus('Cuộc gọi đã kết thúc');
      setTimeout(() => {
        onEndCall();
      }, 1000);
    };
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      if (startTime.current) {
        const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async () => {
    try {
      if (callData.id) {
        await webrtcService.acceptCall(callData.id);
        setCallStatus('Đang kết nối...');
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận cuộc gọi');
      onEndCall();
    }
  };

  const handleRejectCall = async () => {
    try {
      if (callData.id) {
        await webrtcService.rejectCall(callData.id);
      }
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
    onEndCall();
  };

  const handleEndCall = async () => {
    try {
      await webrtcService.endCall();
    } catch (error) {
      console.error('Error ending call:', error);
    }
    onEndCall();
  };

  const toggleMute = () => {
    webrtcService.toggleMicrophone();
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (callData.type === 'video') {
      webrtcService.toggleCamera();
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleSpeaker = () => {
    webrtcService.toggleSpeaker(!isSpeakerOn);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const switchCamera = () => {
    if (callData.type === 'video') {
      webrtcService.switchCamera();
    }
  };

  const cleanup = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
    pulseAnim.stopAnimation();
  };

  const renderVideoCall = () => (
    <View style={styles.videoContainer}>
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={[styles.remoteVideo, styles.placeholderVideo]}>
          <Animated.View style={[styles.avatarPlaceholder, { transform: [{ scale: pulseAnim }] }]}>
            {displayPhoto ? (
                <Image source={{ uri: displayPhoto }} style={styles.avatarImage} />
            ) : (
                <Ionicons name="person" size={80} color="#fff" />
            )}
          </Animated.View>
          <Text style={styles.callerName}>{displayName || "Người dùng"}</Text>
        </View>
      )}

      {localStream && (
        <Animated.View style={[styles.localVideoContainer, { opacity: fadeAnim }]}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </Animated.View>
      )}
    </View>
  );

  const renderAudioCall = () => (
    <View style={styles.audioContainer}>
      <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.avatar}>
        {displayPhoto ? (
          <Image source={{ uri: displayPhoto }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={120} color="#fff" />
        )}
        </View>
      </Animated.View>
      <Text style={styles.callerName}>{displayName || "Người dùng"}</Text>
    </View>
  );

  const renderCallControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "#fff" : "#333"} />
        </TouchableOpacity>

        {callData.type === 'audio' && (
          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-low"} size={24} color={isSpeakerOn ? "#fff" : "#333"} />
          </TouchableOpacity>
        )}

        {callData.type === 'video' && (
          <>
            <TouchableOpacity
              style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
              onPress={toggleCamera}
            >
              <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={24} color={isCameraOff ? "#fff" : "#333"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={24} color="#333" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isIncoming && !isConnected && (
        <View style={styles.incomingCallControls}>
          <TouchableOpacity
            style={[styles.callActionButton, styles.acceptButton]}
            onPress={handleAcceptCall}
          >
            <Ionicons name="call" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.callActionButton, styles.rejectButton]}
            onPress={handleRejectCall}
          >
            <Ionicons name="call" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{callStatus}</Text>
        {isConnected && (
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        )}
      </View>

      {callData.type === 'video' ? renderVideoCall() : renderAudioCall()}

      {renderCallControls()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  statusBar: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  durationText: { color: '#ccc', fontSize: 14, marginTop: 4 },

  videoContainer: { flex: 1, position: 'relative' },
  remoteVideo: { flex: 1, backgroundColor: '#222' },
  placeholderVideo: { justifyContent: 'center', alignItems: 'center' },
  localVideoContainer: { position: 'absolute', top: 20, right: 20, width: 120, height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', backgroundColor: '#333' },
  localVideo: { flex: 1 },

  audioContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  avatarContainer: { marginBottom: 40 },
  avatar: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholder: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  callerName: { color: '#fff', fontSize: 24, fontWeight: '600', textAlign: 'center' },

  controlsContainer: { paddingBottom: 40, paddingHorizontal: 20 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  controlButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  controlButtonActive: { backgroundColor: '#ff4444' },
  endCallButton: { backgroundColor: '#ff4444', transform: [{ rotate: '135deg' }] },

  incomingCallControls: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 60 },
  callActionButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  acceptButton: { backgroundColor: '#4CAF50' },
  rejectButton: { backgroundColor: '#ff4444', transform: [{ rotate: '135deg' }] },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 100, // bo tròn
    resizeMode: "cover",
  },
  
});
