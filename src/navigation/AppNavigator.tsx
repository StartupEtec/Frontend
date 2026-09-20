import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthWelcomeScreen } from "../screens/AuthWelcomeScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { OtpVerificationScreen } from "../screens/OtpVerificationScreen";
import { RoleSelectionScreen } from "../screens/RoleSelectionScreen";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ASYNC_STORAGE_ONBOARDING_KEY } from "../i18n/onboardingContent";
import { tokenStorage } from "../services/tokenStorage";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  roleAccent,
} from "../theme/tokens";
import { UserRole } from "../types/role";
import { useRoleContext } from "../context/RoleContext";

const profileKey = (userId: string) =>
  `@startup_app/profile_completed_${userId}`;
const lastRoleKey = (userId: string) =>
  `@startup_app/last_role_${userId}`;

export type AppRoute =
  | "Onboarding"
  | "AuthWelcome"
  | "Register"
  | "Login"
  | "ForgotPassword"
  | "VerifyOTP"
  | "RoleSelection"
  | "CompleteProfile"
  | "Main";

export const AppNavigator: React.FC = () => {
  const { clearRole, setRole } = useRoleContext();
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
        const [onboardingCompleted, accessToken, userId] = await Promise.all([
          AsyncStorage.getItem(ASYNC_STORAGE_ONBOARDING_KEY),
          tokenStorage.getAccessToken(),
          tokenStorage.getUserId(),
        ]);

        if (accessToken && userId) {
          setCurrentRoute(await restoreSession(userId));
        } else if (onboardingCompleted === "true") {
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

  const restoreSession = async (
    userId: string,
  ): Promise<"Main" | "RoleSelection"> => {
    const [profileDone, savedRole] = await Promise.all([
      AsyncStorage.getItem(profileKey(userId)),
      AsyncStorage.getItem(lastRoleKey(userId)),
    ]);

    setProfileCompleted(profileDone === "true");

    if (savedRole === "client" || savedRole === "worker") {
      setSelectedRole(savedRole);
      await setRole(savedRole);
      return "Main";
    }

    return "RoleSelection";
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
    await setRole(newRole);
    const userId = await tokenStorage.getUserId();
    if (userId) {
      await AsyncStorage.setItem(lastRoleKey(userId), newRole);
    }
  };

  const handleLogout = async () => {
    await tokenStorage.clear();
    await clearRole();
    setSelectedRole("client");
    setProfileCompleted(false);
    setJustCompletedProfile(false);
    setCurrentRoute("AuthWelcome");
  };

  const handleOtpSuccess = async () => {
    const userId = await tokenStorage.getUserId();
    if (!userId) {
      setCurrentRoute("Main");
      return;
    }

    setCurrentRoute(await restoreSession(userId));
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
        onNavigateToForgotPassword={() => setCurrentRoute("ForgotPassword")}
      />
    );
  }

  if (currentRoute === "ForgotPassword") {
    return (
      <ForgotPasswordScreen
        onNavigateToLogin={() => setCurrentRoute("Login")}
        onNavigateBack={() => setCurrentRoute("Login")}
      />
    );
  }

  const isClient = selectedRole === "client";
  const accentColor = roleAccent(selectedRole);

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
          style={[styles.roleToggleText, { color: accentColor }]}
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
            <Feather name="edit-2" size={16} color={colors.textPrimary} accessible={false} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.centerContainer}>
        <View style={styles.welcomeRow}>
          <Feather name="home" size={22} color={accentColor} accessible={false} />
          <Text style={styles.welcomeText}>Pantalla Principal</Text>
        </View>
        {!justCompletedProfile && (
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: accentColor }]}
            onPress={() => setCurrentRoute("CompleteProfile")}
          >
            <Text style={styles.profileButtonText}>Terminar de completar perfil ahora</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleLogout}
          testID="btn-logout"
          accessibilityRole="button"
        >
          <View style={styles.resetRow}>
            <Feather name="log-out" size={14} color={colors.textMuted} accessible={false} />
            <Text style={styles.resetText}>Cerrar Sesión</Text>
          </View>
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
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  welcomeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
  },
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  resetButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  resetText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  profileButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  profileButtonText: {
    color: colors.onPrimary,
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
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
});

export default AppNavigator;
