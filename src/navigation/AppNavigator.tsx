import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthWelcomeScreen } from "../screens/AuthWelcomeScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { OtpVerificationScreen } from "../screens/OtpVerificationScreen";
import { RoleSelectionScreen } from "../screens/RoleSelectionScreen";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen";
import { ASYNC_STORAGE_ONBOARDING_KEY } from "../i18n/onboardingContent";
import { colors, typography } from "../theme/tokens";
import { UserRole } from "../types/role";

const PROFILE_COMPLETED_KEY = "@startup_app/profile_completed";

export type AppRoute =
  | "Onboarding"
  | "AuthWelcome"
  | "Register"
  | "Login"
  | "VerifyOTP"
  | "RoleSelection"
  | "CompleteProfile"
  | "Main";

export const AppNavigator: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>("Onboarding");
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);
  const [registeredContact, setRegisteredContact] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("client");
  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);
  /** Solo true después de completar el perfil en ESTA sesión */
  const [justCompletedProfile, setJustCompletedProfile] = useState<boolean>(false);

  useEffect(() => {
    const checkInitialRoute = async () => {
      try {
        const [onboardingCompleted, profileDone] = await Promise.all([
          AsyncStorage.getItem(ASYNC_STORAGE_ONBOARDING_KEY),
          AsyncStorage.getItem(PROFILE_COMPLETED_KEY),
        ]);
        if (onboardingCompleted === "true") {
          setCurrentRoute("AuthWelcome");
        } else {
          setCurrentRoute("Onboarding");
        }
        setProfileCompleted(profileDone === "true");
      } catch (error) {
        console.error("Error checking initial route status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkInitialRoute();
  }, []);

  const handleFinishOnboarding = () => {
    setCurrentRoute("AuthWelcome");
  };

  const handleProfileCompleted = async () => {
    await AsyncStorage.setItem(PROFILE_COMPLETED_KEY, "true");
    setProfileCompleted(true);
    setJustCompletedProfile(true);
    setCurrentRoute("Main");
  };

  if (isCheckingStatus) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (currentRoute === "Onboarding") {
    return <OnboardingScreen onFinishOnboarding={handleFinishOnboarding} />;
  }

  if (currentRoute === "AuthWelcome") {
    return (
      <AuthWelcomeScreen
        onNavigateToRegister={() => setCurrentRoute("Register")}
        onNavigateToLogin={() => setCurrentRoute("Login")}
        onNavigateToOnboarding={() => setCurrentRoute("Onboarding")}
      />
    );
  }

  if (currentRoute === "Register") {
    return (
      <RegisterScreen
        onNavigateBack={() => setCurrentRoute("AuthWelcome")}
        onNavigateToOtp={(contact?: string) => {
          if (contact) setRegisteredContact(contact);
          setCurrentRoute("VerifyOTP");
        }}
        onNavigateToLogin={() => setCurrentRoute("Login")}
      />
    );
  }

  if (currentRoute === "VerifyOTP") {
    return (
      <OtpVerificationScreen
        contact={registeredContact}
        onVerificationSuccess={() => setCurrentRoute("RoleSelection")}
        onNavigateBackToRegister={() => setCurrentRoute("Register")}
      />
    );
  }

  if (currentRoute === "RoleSelection") {
    return (
      <RoleSelectionScreen
        onRoleSelected={(role: UserRole) => {
          setSelectedRole(role);
          setCurrentRoute("Main");
        }}
      />
    );
  }

  if (currentRoute === "CompleteProfile") {
    return (
      <CompleteProfileScreen
        role={selectedRole}
        onProfileCompleted={handleProfileCompleted}
        onGoBack={() => setCurrentRoute("Main")}
      />
    );
  }

  if (currentRoute === "Login") {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.welcomeText}>
          🔑 Pantalla de Iniciar Sesión (Login)
        </Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setCurrentRoute("AuthWelcome")}
        >
          <Text style={styles.resetText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      {justCompletedProfile && (
        <View style={styles.devCorner}>
          <TouchableOpacity
            onPress={() => setCurrentRoute("CompleteProfile")}
            style={styles.devButton}
            testID="btn-dev-complete-profile"
          >
            <Text style={styles.devButtonText}>✏️</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.centerContainer}>
        <Text style={styles.welcomeText}>🏠 Pantalla Principal</Text>
        {!justCompletedProfile && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setCurrentRoute("CompleteProfile")}
          >
            <Text style={styles.profileButtonText}>Terminar de completar perfil ahora</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={async () => {
            await AsyncStorage.removeItem(ASYNC_STORAGE_ONBOARDING_KEY);
            setCurrentRoute("Onboarding");
          }}
        >
          <Text style={styles.resetText}>🔄 Resetear Onboarding (Dev)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  welcomeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 10,
    textAlign: "center",
  },
  subText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: 20,
    textAlign: "center",
  },
  resetButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  resetText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  profileButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  profileButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  devCorner: {
    position: "absolute",
    top: 40,
    right: 16,
    zIndex: 10,
  },
  devButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  devButtonText: {
    fontSize: 16,
  },
});

export default AppNavigator;
