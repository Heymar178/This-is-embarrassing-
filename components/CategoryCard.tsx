// components/CategoryCard.tsx

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router"; // Use Expo Router for navigation

interface CategoryCardProps {
  name: string;
  iconUrl: string;       // URL of the icon image
  categoryId: string;    // Pass the category ID dynamically
}

const CategoryCard: React.FC<CategoryCardProps> = ({ name, iconUrl, categoryId }) => {
  const router = useRouter(); // Use router for navigation

  const handlePress = () => {
    router.push(`/category/${categoryId}`); // Navigate to the dynamic category route
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {/* 1) Circular background with the image inside */}
      <View style={styles.iconContainer}>
        <Image
          source={{ uri: iconUrl }}
          style={styles.iconImage}
        />
      </View>

      {/* 2) Category name below the circle */}
      <Text style={styles.text} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 80,            // Keep width in sync with iconContainer
  },
  iconContainer: {
    width: 80,            // Diameter of the circle
    height: 80,
    borderRadius: 40,     // Half of width = circular
    backgroundColor: "#E0F7FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,      // Spacing between circle and text
    overflow: "hidden",   // Ensures the image does not spill outside
  },
  iconImage: {
    width: 48,            // Slightly smaller than the circle
    height: 48,
    resizeMode: "contain",
  },
  text: {
    fontSize: 14,         // Slightly larger text
    fontWeight: "500",
    textAlign: "center",  // Center under the circle
  },
});

export default CategoryCard;
