import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthWelcomeScreen } from "../screens/AuthWelcomeScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { OtpVerificationScreen } from "../screens/OtpVerificationScreen";
import { RoleSelectionScreen } from "../screens/RoleSelectionScreen";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { MainScreen } from "../screens/MainScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ASYNC_STORAGE_ONBOARDING_KEY } from "../i18n/onboardingContent";
import { tokenStorage } from "../services/tokenStorage";
import { colors } from "../theme/tokens";
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
  | "ForgotPassword"
  | "VerifyOTP"
  | "RoleSelection"
  | "CompleteProfile"
  | "ProfileMenu"
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

  const handleRoleChanged = async (newRole: UserRole, newToken: string) => {
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

  if (currentRoute === "ProfileMenu") {
    return (
      <ProfileScreen
        currentRole={selectedRole}
        onRoleChanged={handleRoleChanged}
        onGoBack={() => setCurrentRoute("Main")}
        onLogout={() => setCurrentRoute("AuthWelcome")}
      />
    );
  }

  if (currentRoute === "Main") {
    return (
      <MainScreen
        selectedRole={selectedRole}
        profileCompleted={profileCompleted}
        justCompletedProfile={justCompletedProfile}
        onNavigateToProfile={() => setCurrentRoute("ProfileMenu")}
        onNavigateToCompleteProfile={() => setCurrentRoute("CompleteProfile")}
        onResetOnboarding={async () => {
          await AsyncStorage.removeItem(ASYNC_STORAGE_ONBOARDING_KEY);
          setCurrentRoute("Onboarding");
        }}
      />
    );
  }
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default AppNavigator;
