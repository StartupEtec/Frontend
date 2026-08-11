import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthWelcomeScreen } from '../screens/AuthWelcomeScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ASYNC_STORAGE_ONBOARDING_KEY } from '../i18n/onboardingContent';
import { colors, typography } from '../theme/tokens';

export type AppRoute = 'Onboarding' | 'AuthWelcome' | 'Register' | 'Login' | 'VerifyOTP' | 'Main';

export const AppNavigator: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('Onboarding');
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  useEffect(() => {
    const checkInitialRoute = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ASYNC_STORAGE_ONBOARDING_KEY);
        if (onboardingCompleted === 'true') {
          setCurrentRoute('AuthWelcome');
        } else {
          setCurrentRoute('Onboarding');
        }
      } catch (error) {
        console.error('Error checking initial route status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkInitialRoute();
  }, []);

  const handleFinishOnboarding = () => {
    setCurrentRoute('AuthWelcome');
  };

  if (isCheckingStatus) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (currentRoute === 'Onboarding') {
    return <OnboardingScreen onFinishOnboarding={handleFinishOnboarding} />;
  }

  if (currentRoute === 'AuthWelcome') {
    return (
      <AuthWelcomeScreen
        onNavigateToRegister={() => setCurrentRoute('Register')}
        onNavigateToLogin={() => setCurrentRoute('Login')}
        onNavigateToOnboarding={() => setCurrentRoute('Onboarding')}
      />
    );
  }

  if (currentRoute === 'Register') {
    return (
      <RegisterScreen
        onNavigateBack={() => setCurrentRoute('AuthWelcome')}
        onNavigateToOtp={() => setCurrentRoute('VerifyOTP')}
        onNavigateToLogin={() => setCurrentRoute('Login')}
      />
    );
  }

  if (currentRoute === 'VerifyOTP') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.welcomeText}>🔐 Pantalla de Verificación de OTP</Text>
        <Text style={styles.subText}>Se envió un código a tu correo/teléfono.</Text>
        <TouchableOpacity style={styles.resetButton} onPress={() => setCurrentRoute('Register')}>
          <Text style={styles.resetText}>← Volver a Registro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentRoute === 'Login') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.welcomeText}>🔑 Pantalla de Iniciar Sesión (Login)</Text>
        <TouchableOpacity style={styles.resetButton} onPress={() => setCurrentRoute('AuthWelcome')}>
          <Text style={styles.resetText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.welcomeText}>🏠 Pantalla Principal</Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={async () => {
          await AsyncStorage.removeItem(ASYNC_STORAGE_ONBOARDING_KEY);
          setCurrentRoute('Onboarding');
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
    padding: 20,
  },
  welcomeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 10,
    textAlign: 'center',
  },
  subText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: 20,
    textAlign: 'center',
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
