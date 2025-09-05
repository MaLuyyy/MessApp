// hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

export interface PermissionStatus {
  camera: boolean;
  audio: boolean;
  isLoading: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    audio: false,
    isLoading: true,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const [cameraStatus, audioStatus] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        Audio.getPermissionsAsync(),
      ]);

      setPermissions({
        camera: cameraStatus.status === 'granted',
        audio: audioStatus.status === 'granted',
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({
        camera: false,
        audio: false,
        isLoading: false,
      });
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      
      setPermissions(prev => ({ ...prev, camera: granted }));
      
      if (!granted) {
        showPermissionAlert('Camera', 'camera');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestAudioPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      
      setPermissions(prev => ({ ...prev, audio: granted }));
      
      if (!granted) {
        showPermissionAlert('Microphone', 'microphone');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting audio permission:', error);
      return false;
    }
  };

  const requestAllPermissions = async (): Promise<boolean> => {
    const [cameraGranted, audioGranted] = await Promise.all([
      requestCameraPermission(),
      requestAudioPermission(),
    ]);

    return cameraGranted && audioGranted;
  };

  const requestCallPermissions = async (isVideo: boolean): Promise<boolean> => {
    if (isVideo) {
      return await requestAllPermissions();
    } else {
      return await requestAudioPermission();
    }
  };

  const showPermissionAlert = (permissionName: string, settingsKey: string) => {
    Alert.alert(
      `Quyền ${permissionName} bị từ chối`,
      `Để sử dụng tính năng cuộc gọi, vui lòng cấp quyền ${permissionName.toLowerCase()} trong Cài đặt.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Mở Cài đặt',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  const hasRequiredPermissions = (isVideo: boolean): boolean => {
    if (isVideo) {
      return permissions.camera && permissions.audio;
    } else {
      return permissions.audio;
    }
  };

  return {
    permissions,
    requestCameraPermission,
    requestAudioPermission,
    requestAllPermissions,
    requestCallPermissions,
    hasRequiredPermissions,
    checkPermissions,
  };
};