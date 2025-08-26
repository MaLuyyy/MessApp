import { db } from "@/lib/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useCallback, useState } from "react";
import { StyleSheet, TextInput, View, FlatList, Text, Image, TouchableOpacity } from "react-native";

export default function SearchScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchUsers = async () => {
        if (searchText.trim() === "") {
            setUsers([]); // clear list khi chưa nhập gì
            return;
          }
        const snapshot = await getDocs(collection(db, "users"));
        let data = snapshot.docs.map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        })) as any[];

        // lọc theo số điện thoại hoặc tên
        if (searchText.trim() !== "") {
          const keyword = searchText.trim().toLowerCase();
          data = data.filter(
            (u) =>
              u.numberphone?.toLowerCase().includes(keyword) ||
              u.username?.toLowerCase().includes(keyword)
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
          onPress={() => router.back()}
        />
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#aaa" />
          <TextInput
            placeholder="Tìm kiếm"
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
            <TouchableOpacity style={styles.userItem}>
                <Image
                source={{ uri: "https://placekitten.com/200/200" }} // ảnh tạm
                style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.fullname}</Text>
                <Text style={styles.sub}>{item.numberphone}</Text>
                <Text style={styles.sub}>{item.email}</Text>
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
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  header: {
    flexDirection: "row", // nằm ngang
    alignItems: "center", // căn giữa theo chiều dọc
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
