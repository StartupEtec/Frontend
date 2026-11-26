import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoleProvider } from './src/context/RoleContext';
import AppNavigator from './src/navigation/AppNavigator';
import { secureTokenStorage } from './src/services/secureTokenStorage';
import { colors } from './src/theme/tokens';

export default function App() {
  const [storageReady, setStorageReady] = useState(false);

  // Migrar tokens de AsyncStorage a SecureStore antes de inicializar la sesión.
  useEffect(() => {
    let mounted = true;
    secureTokenStorage
      .migrateLegacyTokens()
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setStorageReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!storageReady) return null;

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
