import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { StackAnimationTypes } from 'react-native-screens';


type NavigationParams = {
  animation?: string;
};


export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  // Lưu index tab hiện tại
  const currentIndexRef = useRef<number>(0);

  const tabs = [
    { name: 'home', icon: 'home-outline' },
    { name: 'notifi', icon: 'notifications-outline' },
    { name: 'setting', icon: 'settings-outline' },
  ];

  const isActive = (route: string) => pathname === `/${route}`;

  const handleNavigate = (route: string, index: number) => {
    if (pathname === `/${route}`) {
      return;
    }

    const prevIndex = currentIndexRef.current;
    let animation: StackAnimationTypes = 'slide_from_right';

    if (index < prevIndex) {
      animation = 'slide_from_left';
    } else if (index > prevIndex) {
      animation = 'slide_from_right';
    }

    currentIndexRef.current = index;

    router.push({
      pathname: `/${route}` as any,
      params: { animation } as NavigationParams, // truyền animation qua params
    });
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.name}
          onPress={() => handleNavigate(tab.name, index)}
        >
          <Ionicons
            name={tab.icon as any}
            size={25}
            color={isActive(tab.name) ? '#fff' : '#aaa'}
            style={isActive(tab.name) ? styles.activeIcon : undefined}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopColor: '#eee',
    borderTopWidth: 1,
    backgroundColor: '#EEEEEE',
  },
  activeIcon: {
    backgroundColor: '#FDB813',
    padding: 10,
    borderRadius: 25,
  },
});
