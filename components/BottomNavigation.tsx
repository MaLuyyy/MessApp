import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
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
    { name: 'home', icon: 'chatbubble', label: 'Đoạn chat' },
    { name: 'notifi', icon: 'notifications', label: 'Thông báo' },
    { name: 'settings', icon: 'settings', label: 'Cài đặt' },
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
      {tabs.map((tab, index) => {
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => handleNavigate(tab.name, index)}
            style={styles.tabItem}
          >
            <Ionicons
              name={tab.icon as any}
              size={25}
              color={active ? '#1E90FF' : '#aaa'}
              style={active ? styles.activeIcon : undefined}
            />
            <Text style={[styles.label, active && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopColor: '#eee',
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  activeIcon: {
    color: '#1E90FF',
    padding: 7,
    borderRadius: 25,
  },
  tabItem: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  activeLabel: {
    color: '#1E90FF',
    fontWeight: '500',
  },
});
