import React from "react";
import { View, Text, StyleSheet, Image, FlatList } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const updates = [
  {
    id: "1",
    username: "TOUCHGRASS",
    message: "Challenge yourself! What’s the habit you’ll repeat until it’s second nature? ...",
  },
  {
    id: "2",
    username: "BLAKE92",
    message: "Just posted images from his latest challenge",
  },
  {
    id: "3",
    username: "JENN293",
    message: "Just completed “Tag the Rock” challenge",
  },
];

export default function LatestUpdates() {
  return (
    <View>

      {/* HEADER */}
      <View style={styles.header}>
        <MaterialIcons name="notifications" size={20} color="#000" style={{ marginRight: 8 }} />
        <Text style={styles.headerText}>LATEST UPDATES</Text>
      </View>

      {/* UPDATES LIST */}
      <FlatList
        data={updates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 20 }}
        renderItem={({ item }) => (
          <View style={styles.updateCard}>
            <View style={styles.row}>

              {/* Avatar Placeholder */}
              <View style={styles.avatar} />

              <View style={{ flex: 1 }}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.message}>{item.message}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** HEADER **/
  header: {
    backgroundColor: "#f8a9c5", // same soft pink
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    alignSelf: "center",
    marginTop: 10,
    elevation: 2,
  },

  headerText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },

  /** UPDATE CARD **/
  updateCard: {
    backgroundColor: "#fff",
    borderColor: "#eaeaea",
    borderWidth: 2,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    width: "100%",
    alignSelf: "center",
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 15,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 48,
    backgroundColor: "#d9d9d9",
  },

  username: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  message: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
});
