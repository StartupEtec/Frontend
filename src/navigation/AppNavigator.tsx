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
import { LocationsScreen } from "../screens/LocationsScreen";
import { WorkerSearchScreen } from "../screens/WorkerSearchScreen";
import { WorkerProfileScreen } from "../screens/WorkerProfileScreen";
import { NavBar } from "../components/NavBar";
import { SearchOriginModal } from "../components/location/SearchOriginModal";
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
import { SavedLocation } from "../types/location";
import { NearbyWorker } from "../types/worker";
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
  | "Locations"
  | "WorkerSearch"
  | "WorkerProfile"
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
  // Trabajador elegido en la búsqueda: alimenta la ficha "Perfil del
  // Trabajador" que se abre desde "Ver Perfil Completo".
  const [selectedWorker, setSelectedWorker] = useState<NearbyWorker | null>(
    null,
  );
  // true desde que el usuario entró a "Buscar Trabajadores": a partir de ahí
  // la pantalla de búsqueda queda montada (oculta en las demás rutas) para no
  // destruir y recargar su mapa (WebView) en cada ida y vuelta.
  const [searchVisited, setSearchVisited] = useState(false);
  // Pop-up de selección de ubicación de referencia: se abre al tocar
  // "Buscar Trabajadores" y su elección define desde dónde se busca.
  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  // Ubicación guardada elegida: origen fijo de la búsqueda (centro inicial
  // del mapa y referencia de los colores de cobertura). Reemplaza a la
  // ubicación del dispositivo.
  const [searchOrigin, setSearchOrigin] = useState<SavedLocation | null>(null);
  // Pantalla de ubicaciones abierta desde el perfil o desde el pop-up de
  // búsqueda: define a dónde vuelve el botón "Atrás" y si el formulario de
  // alta se abre directo.
  const [locationsBackTo, setLocationsBackTo] = useState<"Profile" | "Main">(
    "Profile",
  );
  const [locationsAutoCreate, setLocationsAutoCreate] = useState(false);

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
    setSelectedWorker(null);
    // Sesión cerrada: se desmonta la búsqueda guardada (mapa y resultados
    // viejos no deben sobrevivir al próximo login) y se olvida la ubicación
    // de referencia elegida.
    setSearchVisited(false);
    setSearchOrigin(null);
    setSearchPopupVisible(false);
    setLocationsBackTo("Profile");
    setLocationsAutoCreate(false);
    setCurrentRoute("AuthWelcome");
  };

  // Eligió una ubicación en el pop-up: la búsqueda se centra y tiñe los
  // trabajadores desde ese punto (no desde la ubicación del dispositivo).
  const handleSelectSearchOrigin = (location: SavedLocation) => {
    setSearchOrigin(location);
    setSearchPopupVisible(false);
    setSearchVisited(true);
    setCurrentRoute("WorkerSearch");
  };

  // "Agregar ubicación" desde el pop-up: se abre directo el formulario de
  // alta y, al volver, se reabre el pop-up para que siga con la búsqueda
  // sin empezar de cero.
  const openLocationsFromSearch = () => {
    setSearchPopupVisible(false);
    setLocationsBackTo("Main");
    setLocationsAutoCreate(true);
    setCurrentRoute("Locations");
  };

  const openLocationsFromProfile = () => {
    setLocationsBackTo("Profile");
    setLocationsAutoCreate(false);
    setCurrentRoute("Locations");
  };

  const handleLocationsBack = () => {
    if (locationsBackTo === "Main") {
      setCurrentRoute("Main");
      setSearchPopupVisible(true);
      return;
    }
    setCurrentRoute("Profile");
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

  // La pantalla de búsqueda queda montada (oculta en las demás rutas) durante
  // toda la sesión autenticada: su mapa es una WebView costosa de construir y,
  // antes, abrir el perfil la desmontaba y al volver había que recargarla
  // entera (recarga visible y demora). La capa vive siempre en el mismo slot
  // del árbol para que la instancia nunca se remonte; `display: none` la
  // oculta sin destruirla.
  const searchLayerMounted =
    currentRoute === "WorkerSearch" ||
    (searchVisited &&
      currentRoute !== "Onboarding" &&
      currentRoute !== "AuthWelcome");
  const searchLayerVisible = currentRoute === "WorkerSearch";

  let content: React.ReactNode = null;

  if (currentRoute === "Onboarding") {
    content = <OnboardingScreen onFinishOnboarding={handleFinishOnboarding} />;
  } else if (currentRoute === "AuthWelcome") {
    content = (
      <AuthWelcomeScreen
        onNavigateToRegister={() => setCurrentRoute("Register")}
        onNavigateToLogin={() => setCurrentRoute("Login")}
        onNavigateToOnboarding={() => setCurrentRoute("Onboarding")}
      />
    );
  } else if (currentRoute === "Register") {
    content = (
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
  } else if (currentRoute === "VerifyOTP") {
    content = (
      <OtpVerificationScreen
        contact={registeredContact}
        onVerificationSuccess={handleOtpSuccess}
        onNavigateBackToRegister={() => setCurrentRoute(otpOrigin)}
      />
    );
  } else if (currentRoute === "RoleSelection") {
    content = <RoleSelectionScreen onRoleSelected={handleRoleSelected} />;
  } else if (currentRoute === "CompleteProfile") {
    content = (
      <CompleteProfileScreen
        role={selectedRole}
        onProfileCompleted={handleProfileCompleted}
        onGoBack={() => setCurrentRoute("Main")}
      />
    );
  } else if (currentRoute === "Login") {
    content = (
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
  } else if (currentRoute === "ForgotPassword") {
    content = (
      <ForgotPasswordScreen
        onNavigateToLogin={() => setCurrentRoute("Login")}
        onNavigateBack={() => setCurrentRoute("Login")}
      />
    );
  } else if (currentRoute === "Profile") {
    content = (
      <ProfileScreen
        currentRole={selectedRole}
        onRoleChanged={handleRoleChanged}
        onGoBack={() => setCurrentRoute("Main")}
        onEditProfile={() => setCurrentRoute("EditProfile")}
        onManageLocations={openLocationsFromProfile}
        onLogout={handleLogout}
      />
    );
  } else if (currentRoute === "EditProfile") {
    content = (
      <EditProfileScreen
        role={selectedRole}
        onGoBack={() => setCurrentRoute("Profile")}
      />
    );
  } else if (currentRoute === "Locations") {
    content = (
      <LocationsScreen
        role={selectedRole}
        openCreateOnMount={locationsAutoCreate}
        onGoBack={handleLocationsBack}
      />
    );
  } else if (currentRoute === "WorkerSearch") {
    // Visible vía la capa de búsqueda de abajo (misma instancia montada).
    content = null;
  } else if (currentRoute === "WorkerProfile" && selectedWorker) {
    content = (
      <WorkerProfileScreen
        worker={selectedWorker}
        role={selectedRole}
        origin={searchOrigin}
        onGoBack={() => setCurrentRoute("WorkerSearch")}
      />
    );
  } else {
    content = (
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
              color={roleAccent(selectedRole)}
              accessible={false}
            />
            <Text style={styles.welcomeText}>Pantalla Principal</Text>
          </View>
          {!profileCompleted && !justCompletedProfile && (
            <TouchableOpacity
              style={[
                styles.profileButton,
                { backgroundColor: roleAccent(selectedRole) },
              ]}
              onPress={() => setCurrentRoute("CompleteProfile")}
            >
              <Text style={styles.profileButtonText}>
                Terminar de completar perfil ahora
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: roleAccent(selectedRole) },
            ]}
            onPress={() => setSearchPopupVisible(true)}
            testID="btn-search-workers"
            accessibilityRole="button"
            accessibilityLabel="Buscar trabajadores"
          >
            <Feather
              name="search"
              size={18}
              color={colors.onPrimary}
              accessible={false}
            />
            <Text style={styles.searchButtonText}>Buscar Trabajadores</Text>
          </TouchableOpacity>
        </View>

        {/* Elegir la ubicación desde la que se busca (en lugar de la
            ubicación del dispositivo). */}
        <SearchOriginModal
          visible={searchPopupVisible}
          selectedId={searchOrigin?.id}
          onSelect={handleSelectSearchOrigin}
          onAddLocation={openLocationsFromSearch}
          onDismiss={() => setSearchPopupVisible(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.appRoot}>
      {searchLayerMounted && (
        <View
          style={[
            styles.searchLayer,
            !searchLayerVisible && styles.searchLayerHidden,
          ]}
        >
          <WorkerSearchScreen
            role={selectedRole}
            origin={searchOrigin}
            onGoBack={() => setCurrentRoute("Main")}
            onViewProfile={(worker) => {
              setSelectedWorker(worker);
              setCurrentRoute("WorkerProfile");
            }}
          />
        </View>
      )}
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Capa con la pantalla de búsqueda: absoluto para poder convivir con la
  // ruta activa (solo una de las dos se muestra a la vez).
  searchLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Oculta la capa sin desmontarla: la WebView del mapa sobrevive a la
  // navegación (RNTL también la excluye de las queries por display: none).
  searchLayerHidden: {
    display: "none",
  },
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
  searchButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  searchButtonText: {
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
