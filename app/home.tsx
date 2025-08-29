import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View,StyleSheet, Image, TextInput, FlatList, TouchableOpacity } from "react-native";
import ChatList from "@/components/ChatList";



export default function HomeScreen(){
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');

    return(
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>MessApp</Text>
            </View>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#aaa"  />
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => router.push("/search")}
                >
                  <Text style={styles.searchPlaceholder}>Tìm kiếm</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                    onPress={() => setActiveTab('chats')}
                >
                    <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
                        Chat
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'calls' && styles.activeTab]}
                    onPress={() => setActiveTab('calls')}
                >
                    <Text style={[styles.tabText, activeTab === 'calls' && styles.activeTabText]}>
                        Cuộc gọi
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'chats' ? (
                    <ChatList />
                ) : (
                    <View style={styles.comingSoon}>
                        <Text style={styles.comingSoonText}>Tính năng cuộc gọi</Text>
                        <Text style={styles.comingSoonSubText}>Sắp ra mắt...</Text>
                    </View>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: '#fff',
      paddingTop: 50,
  },
    header: {
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 15,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#1E90FF'
    },
    searchContainer: {
        marginHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        paddingLeft: 15,
        borderRadius: 30,
        marginVertical: 16,
      },
      searchPlaceholder: {
        color: "#aaa",
        fontSize: 16,
        marginLeft: 8,
        padding:10,
      },
      tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 15,
        backgroundColor: '#f8f8f8',
        borderRadius: 25,
        padding: 4,
        marginBottom: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
    },
    activeTab: {
        backgroundColor: '#1E90FF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    activeTabText: {
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    comingSoon: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    comingSoonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    comingSoonSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
})