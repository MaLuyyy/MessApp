// components/IncomingCallModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallData } from '@/services/webrtcService';
import { Image } from "react-native";

const { width } = Dimensions.get('window');

interface IncomingCallModalProps {
  visible: boolean;
  callData: CallData | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  visible,
  callData,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  

  useEffect(() => {
    if (visible) {
      // Start vibration pattern
      const vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
      Vibration.vibrate(vibrationPattern, true);
      
      // Start animations
      startAnimations();
    } else {
      // Stop vibration
      Vibration.cancel();
      
      // Reset animations
      resetAnimations();
    }

    return () => {
      Vibration.cancel();
    };
  }, [visible]);

  const startAnimations = () => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Pulse animation for avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

    // Ring animation for call buttons
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const resetAnimations = () => {
    slideAnim.setValue(-width);
    pulseAnim.setValue(1);
    ringAnim.setValue(0);
  };

  const handleAccept = () => {
    Vibration.cancel();
    resetAnimations();
    onAccept();
  };

  const handleReject = () => {
    Vibration.cancel();
    resetAnimations();
    onReject();
  };

  if (!callData) return null;

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.incomingText}>
              {callData.type === 'video' ? 'Video Call' : 'Cuộc gọi'} đến
            </Text>
          </View>

          {/* Caller Info */}
          <View style={styles.callerInfo}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.avatar}>
              {callData.callerPhoto ? (
                  <Image source={{ uri: callData.callerPhoto }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={80} color="#fff" />
                )}
              </View>
              
              {/* Ring effect */}
              <Animated.View
                style={[
                  styles.ringEffect,
                  {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                  }
                ]}
              />
            </Animated.View>

            <Text style={styles.callerName}>
              {callData.callerName || 'Người dùng'}
            </Text>
            
            <Text style={styles.callType}>
              {callData.type === 'video' ? 'Video Call' : 'Cuộc gọi thoại'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionRow}>
              {/* Reject Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                activeOpacity={0.7}
              >
                <View style={styles.rejectIcon}>
                  <Ionicons name="call" size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>Từ chối</Text>
              </TouchableOpacity>

              {/* Accept Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                activeOpacity={0.7}
              >
                <View style={styles.acceptIcon}>
                  <Ionicons name="call" size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>Trả lời</Text>
              </TouchableOpacity>
            </View>

            {/* Additional options for video calls */}
            {callData.type === 'video' && (
              <View style={styles.additionalActions}>
                <TouchableOpacity style={styles.smallActionButton}>
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                  <Text style={styles.smallActionText}>Nhắn tin</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.smallActionButton}>
                  <Ionicons name="mic-off" size={20} color="#fff" />
                  <Text style={styles.smallActionText}>Tắt mic</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="time" size={16} color="#ccc" />
              <Text style={styles.quickActionText}>Nhắc lại sau</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  incomingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Caller info
  callerInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 80,
    resizeMode: "cover",
  },
  ringEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  callerName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  callType: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Actions
  actionsContainer: {
    paddingHorizontal: 60,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  acceptButton: {},
  rejectButton: {},
  acceptIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  rejectIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    transform: [{ rotate: '135deg' }],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Additional actions
  additionalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  smallActionButton: {
    alignItems: 'center',
  },
  smallActionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Quick actions
  quickActions: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickActionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 6,
  },
});