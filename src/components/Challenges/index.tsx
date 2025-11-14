import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.75;    // 75% width responsive
const SNAP_WIDTH = CARD_WIDTH + 20;

export default function HomeCardCarousel({ title, data, icon, color }: any) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={[styles.heading, { backgroundColor: color }]}>
        {icon}
        <Text style={{ fontSize: 16 }}>{title}</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_WIDTH}
        renderItem={({ item }) => (
          <View style={{ marginRight: 20 }}>
            <Card data={item} color={color} />
          </View>
        )}
      />
    </View>
  );
}

function Card({ data, color }: any) {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <TouchableOpacity style={styles.bookmarkIcon}>
        <MaterialIcons name="bookmark-border" size={24} color="#777" />
      </TouchableOpacity>

      <Image source={data.image} style={styles.topImage} resizeMode="cover" />

      <View style={[styles.bottomSection, { backgroundColor: color }]}>
        <Text style={styles.title}>{data.title}</Text>
        {data?.description && <Text style={styles.description}>{data.description}</Text>}

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <MaterialIcons name="schedule" size={14} color="#000" />
            <Text style={styles.badgeText}>{data.time}</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{data.difficulty}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 4,
  },
  bookmarkIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 10,
    backgroundColor: "white",
    borderRadius: 100,
    padding: 4,
  },
  topImage: {
    width: "100%",
    height: SCREEN_WIDTH * 0.35, // responsive image height
  },
  bottomSection: {
    padding: 16,
  },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  description: { fontSize: 13, color: "#333", marginBottom: 12 },
  badgeRow: { flexDirection: "row", gap: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { marginLeft: 5, fontSize: 12, fontWeight: "600" },
});
