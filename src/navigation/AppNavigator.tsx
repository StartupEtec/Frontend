import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ASYNC_STORAGE_ONBOARDING_KEY } from '../i18n/onboardingContent';
import { colors, typography } from '../theme/tokens';

export const AppNavigator: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Auth' | 'Main'>('Onboarding');
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  useEffect(() => {
    const checkInitialRoute = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ASYNC_STORAGE_ONBOARDING_KEY);
        if (onboardingCompleted === 'true') {
          setInitialRoute('Auth');
        } else {
          setInitialRoute('Onboarding');
        }
      } catch (error) {
        console.error('Error checking initial route status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkInitialRoute();
  }, []);

  const handleFinishOnboarding = (targetRoute: 'Register' | 'Login' | 'Main') => {
    if (targetRoute === 'Main') {
      setInitialRoute('Main');
    } else {
      setInitialRoute('Auth');
    }
  };

  if (isCheckingStatus) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (initialRoute === 'Onboarding') {
    return <OnboardingScreen onFinishOnboarding={handleFinishOnboarding} />;
  }

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.welcomeText}>
        {initialRoute === 'Auth' ? 'Pantalla de Autenticación (Login/Register)' : 'Pantalla Principal'}
      </Text>
      {/* DEV ONLY: reset button to replay onboarding */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={async () => {
          await AsyncStorage.removeItem(ASYNC_STORAGE_ONBOARDING_KEY);
          setInitialRoute('Onboarding');
        }}
      >
        <Text style={styles.resetText}>🔄 Resetear Onboarding (Dev)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 20,
  },
  resetButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resetText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});

export default AppNavigator;
