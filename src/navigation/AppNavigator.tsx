import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthWelcomeScreen } from "../screens/AuthWelcomeScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { OtpVerificationScreen } from "../screens/OtpVerificationScreen";
import { RoleSelectionScreen } from "../screens/RoleSelectionScreen";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ASYNC_STORAGE_ONBOARDING_KEY } from "../i18n/onboardingContent";
import { tokenStorage } from "../services/tokenStorage";
import { colors, typography, borderRadius } from "../theme/tokens";
import { UserRole } from "../types/role";

const profileKey = (userId: string) =>
  `@startup_app/profile_completed_${userId}`;
const lastRoleKey = (userId: string) =>
  `@startup_app/last_role_${userId}`;

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
  const [otpOrigin, setOtpOrigin] = useState<"Register" | "Login">("Register");
  const [selectedRole, setSelectedRole] = useState<UserRole>("client");
  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);
  const [justCompletedProfile, setJustCompletedProfile] = useState<boolean>(false);

  useEffect(() => {
    const checkInitialRoute = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem(
          ASYNC_STORAGE_ONBOARDING_KEY,
        );
        if (onboardingCompleted === "true") {
          setCurrentRoute("AuthWelcome");
        } else {
          setCurrentRoute("Onboarding");
        }
      } catch (error) {
        console.error("Error checking initial route status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkInitialRoute();
  }, []);

  const loadUserData = async (userId: string) => {
    const [profileDone, savedRole] = await Promise.all([
      AsyncStorage.getItem(profileKey(userId)),
      AsyncStorage.getItem(lastRoleKey(userId)),
    ]);
    setProfileCompleted(profileDone === "true");
    if (savedRole === "client" || savedRole === "worker") {
      setSelectedRole(savedRole);
    }
  };

  const handleFinishOnboarding = () => {
    setCurrentRoute("AuthWelcome");
  };

  const handleProfileCompleted = async () => {
    const userId = await tokenStorage.getUserId();
    if (userId) {
      await AsyncStorage.setItem(profileKey(userId), "true");
    }
    setProfileCompleted(true);
    setJustCompletedProfile(true);
    setCurrentRoute("Main");
  };

  const handleRoleSelected = async (role: UserRole) => {
    setSelectedRole(role);
    const userId = await tokenStorage.getUserId();
    if (userId) {
      await AsyncStorage.setItem(lastRoleKey(userId), role);
    }
    setCurrentRoute("Main");
  };

  const handleToggleRole = async () => {
    const newRole: UserRole = selectedRole === "client" ? "worker" : "client";
    setSelectedRole(newRole);
    const userId = await tokenStorage.getUserId();
    if (userId) {
      await AsyncStorage.setItem(lastRoleKey(userId), newRole);
    }
  };

  const handleOtpSuccess = async () => {
    const userId = await tokenStorage.getUserId();
    if (!userId) {
      setCurrentRoute("Main");
      return;
    }

    const [profileDone, savedRole] = await Promise.all([
      AsyncStorage.getItem(profileKey(userId)),
      AsyncStorage.getItem(lastRoleKey(userId)),
    ]);

    setProfileCompleted(profileDone === "true");

    if (savedRole === "client" || savedRole === "worker") {
      setSelectedRole(savedRole);
      setCurrentRoute("Main");
    } else {
      setCurrentRoute("RoleSelection");
    }
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
          setOtpOrigin("Register");
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
        onVerificationSuccess={handleOtpSuccess}
        onNavigateBackToRegister={() => setCurrentRoute(otpOrigin)}
      />
    );
  }

  if (currentRoute === "RoleSelection") {
    return (
      <RoleSelectionScreen
        onRoleSelected={handleRoleSelected}
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
      <LoginScreen
        onNavigateBack={() => setCurrentRoute("AuthWelcome")}
        onNavigateToOtp={(contact?: string) => {
          if (contact) setRegisteredContact(contact);
          setOtpOrigin("Login");
          setCurrentRoute("VerifyOTP");
        }}
        onNavigateToRegister={() => setCurrentRoute("Register")}
      />
    );
  }

  const isClient = selectedRole === "client";

  return (
    <SafeAreaView style={styles.mainContainer}>
      {/* Role toggle text — top-left */}
      <TouchableOpacity
        style={styles.roleToggle}
        onPress={handleToggleRole}
        testID="btn-role-toggle"
        accessibilityLabel={`Modo ${isClient ? "Cliente" : "Trabajador"}. Tocá para cambiar.`}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.roleToggleText,
            { color: isClient ? colors.clientAccent : colors.workerAccent },
          ]}
        >
          {isClient ? "Modo Cliente" : "Modo Trabajador"}
        </Text>
      </TouchableOpacity>

      {/* Dev button — top-right, visible when profile is completed */}
      {profileCompleted && (
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
        {!profileCompleted && (
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
  roleToggle: {
    position: "absolute",
    top: 44,
    left: 16,
    zIndex: 10,
  },
  roleToggleText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    textDecorationLine: "underline",
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
