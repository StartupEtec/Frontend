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
import { ProfileScreen } from "../screens/ProfileScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { NavBar } from "../components/NavBar";
import { ASYNC_STORAGE_ONBOARDING_KEY } from "../i18n/onboardingContent";
import { tokenStorage } from "../services/tokenStorage";
import { profileService } from "../services/profileService";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  roleAccent,
} from "../theme/tokens";
import { UserRole } from "../types/role";
import { useRoleContext } from "../context/RoleContext";
import { getCurrentRoleFromJwt } from "../utils/jwt";

const profileKey = (userId: string) =>
  `@startup_app/profile_completed_${userId}`;
const lastRoleKey = (userId: string) => `@startup_app/last_role_${userId}`;

export type AppRoute =
  | "Onboarding"
  | "AuthWelcome"
  | "Register"
  | "Login"
  | "ForgotPassword"
  | "VerifyOTP"
  | "RoleSelection"
  | "CompleteProfile"
  | "Profile"
  | "EditProfile"
  | "Main";

export const AppNavigator: React.FC = () => {
  const { clearRole, setRole } = useRoleContext();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>("Onboarding");
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);
  const [registeredContact, setRegisteredContact] = useState<string>("");
  const [otpOrigin, setOtpOrigin] = useState<"Register" | "Login">("Register");
  const [selectedRole, setSelectedRole] = useState<UserRole>("client");
  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);
  const [justCompletedProfile, setJustCompletedProfile] =
    useState<boolean>(false);

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
    const [profileDone, savedRole, accessToken] = await Promise.all([
      AsyncStorage.getItem(profileKey(userId)),
      AsyncStorage.getItem(lastRoleKey(userId)),
      tokenStorage.getAccessToken(),
    ]);

    // La identidad es única (vale para ambos roles, con backfill automático
    // en el backend). Si el servidor la marca completa, se da por completa
    // aunque el flag local sea viejo; si está parcial o vacía, se pide
    // completar una sola vez aunque el flag local diga "true" (era por rol).
    let identityComplete = profileDone === "true";
    try {
      const identity = await profileService.getIdentity(userId);
      if (identity) {
        identityComplete = identity.is_complete;
        await AsyncStorage.setItem(
          profileKey(userId),
          identity.is_complete ? "true" : "false",
        );
      }
    } catch {
      // Offline o sesión inválida: se usa el flag local como fallback.
    }
    setProfileCompleted(identityComplete);

    // El rol activo real viaja en el JWT (mismo claim que valida el backend
    // para requireRole). Cuando el usuario ya eligió rol alguna vez, se
    // prioriza el JWT sobre el valor local, que puede haber quedado
    // desincronizado (p. ej. una selección inicial nunca persistida): así lo
    // que muestra la app coincide con lo que cree el servidor.
    //
    // Ojo: el JWT siempre trae un rol (el backend default es "client"), así que
    // no sirve como señal de "ya eligió". Esa señal es el rol local guardado.
    const jwtRole = getCurrentRoleFromJwt(accessToken);
    const storedRole =
      savedRole === "client" || savedRole === "worker" ? savedRole : null;
    const effectiveRole = storedRole ? (jwtRole ?? storedRole) : null;

    if (effectiveRole) {
      setSelectedRole(effectiveRole);
      await setRole(effectiveRole);
      if (effectiveRole !== savedRole) {
        await AsyncStorage.setItem(lastRoleKey(userId), effectiveRole);
      }
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

  const handleRoleChanged = async (newRole: UserRole, newToken: string) => {
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
    return <RoleSelectionScreen onRoleSelected={handleRoleSelected} />;
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

  if (currentRoute === "Profile") {
    return (
      <ProfileScreen
        currentRole={selectedRole}
        onRoleChanged={handleRoleChanged}
        onGoBack={() => setCurrentRoute("Main")}
        onEditProfile={() => setCurrentRoute("EditProfile")}
        onLogout={handleLogout}
      />
    );
  }

  if (currentRoute === "EditProfile") {
    return (
      <EditProfileScreen
        role={selectedRole}
        onGoBack={() => setCurrentRoute("Profile")}
      />
    );
  }

  const isClient = selectedRole === "client";
  const accentColor = roleAccent(selectedRole);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <NavBar
        currentRole={selectedRole}
        onNavigateToProfile={() => setCurrentRoute("Profile")}
      />

      <View style={styles.centerContainer}>
        <View style={styles.welcomeRow}>
          <Feather
            name="home"
            size={22}
            color={accentColor}
            accessible={false}
          />
          <Text style={styles.welcomeText}>Pantalla Principal</Text>
        </View>
        {!profileCompleted && !justCompletedProfile && (
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: accentColor }]}
            onPress={() => setCurrentRoute("CompleteProfile")}
          >
            <Text style={styles.profileButtonText}>
              Terminar de completar perfil ahora
            </Text>
          </TouchableOpacity>
        )}
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
});

export default AppNavigator;
