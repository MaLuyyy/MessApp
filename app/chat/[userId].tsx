//app/chat/[userID.tsx]
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, StyleSheet, Platform, KeyboardAvoidingView } from "react-native";
import MessageInput from "@/components/MessageInput";

export default function ChatScreen(){
    const router = useRouter();
    const { userId, fullname } = useLocalSearchParams();

    return(
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            enabled
        >
            <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="arrow-back" size={24} color={'#0000FF'} onPress={() => router.back()} />
                    <Text style={styles.headerTitle}>{fullname}</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 20, paddingRight:20,}}>
                    <Ionicons name="call" size={24} color={'#0000FF'}/>
                    <Ionicons name="videocam" size={24} color={'#0000FF'}/>
                </View>
            </View>

            {/* Phần messages sẽ ở đây */}
            <View style={{ flex: 1, backgroundColor: "#fff" }} />
            
            <MessageInput />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#fff" 
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingTop: 50,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: "600", 
        marginLeft: 50, 
    },
})