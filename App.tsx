import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RoleProvider } from "./src/context/RoleContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/tokens";

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
