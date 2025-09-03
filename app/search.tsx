import { db } from "@/lib/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useCallback, useState } from "react";
import { StyleSheet, TextInput, View, FlatList, Text, Image, TouchableOpacity } from "react-native";
import { getAuth } from "firebase/auth";

export default function SearchScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  const auth = getAuth();
  const currentUser = auth.currentUser; // user đang đăng nhập

  useFocusEffect(
    useCallback(() => {
      const fetchUsers = async () => {
        if (searchText.trim().length < 5) {
            setUsers([]);
            return;
          }
        const snapshot = await getDocs(collection(db, "users"));
        let data = snapshot.docs.map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        })) as any[];

        if (currentUser) {
          data = data.filter((u) => u.userId !== currentUser.uid);
        }

        // lọc theo số điện thoại hoặc tên
        if (searchText.trim() !== "") {
          const keyword = searchText.trim().toLowerCase();
          data = data.filter(
            (u) =>
              u.numberphone?.toLowerCase().includes(keyword) ||
              u.username?.toLowerCase() === keyword
          );
        }

        setUsers(data);
      };

      fetchUsers();
    }, [searchText])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back-outline"
          size={24}
          color={'#0000FF'}
          onPress={() => router.back()}
        />
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#aaa" />
          <TextInput
            placeholder="Nhập số điện thoại hoặc username "
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* List Users */}
      {searchText.trim() !== "" && (
        <FlatList
            data={users}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.userItem}
              onPress={() => router.push({
                pathname: "/chat/[userId]",
                params: { userId: item.userId, fullname: item.fullname }
              })} >
                <Image
                source={{ uri: item.photoURL || "https://graph.facebook.com/4/picture?type=large" }}
                style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.fullname}</Text>
                <Text style={styles.sub}>@{item.username}</Text>
                </View>
            </TouchableOpacity>
            )}
            // chỉ hiện thông báo khi users rỗng và có nhập text
            ListEmptyComponent={
            users.length === 0 ? (
                <Text style={{ textAlign: "center", marginTop: 30, color: "#888" }}>
                Không tìm thấy người dùng
                </Text>
            ) : null
            }
        />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    paddingLeft: 10,
    borderRadius: 30,
    marginVertical: 16,
    height: 40,
  },
  searchInput: {
    paddingTop: 12,
    marginLeft: 10,
    fontSize: 15,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: -7,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  sub: {
    fontSize: 13,
    color: "#666",
  },
});
