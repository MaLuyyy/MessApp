import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View,StyleSheet, Image, TextInput, FlatList, TouchableOpacity } from "react-native";



export default function HomeScreen(){
    const router = useRouter();
    const [searchText, setSearchText] = useState("");
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
})