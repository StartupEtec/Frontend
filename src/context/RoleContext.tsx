import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "../types/role";

const ASYNC_STORAGE_ROLE_KEY = "@startup_app/selected_role";

interface RoleContextValue {
  currentRole: UserRole | null;
  setRole: (role: UserRole) => Promise<void>;
  clearRole: () => Promise<void>;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const saved = await AsyncStorage.getItem(ASYNC_STORAGE_ROLE_KEY);
        if (saved === "client" || saved === "worker") {
          setCurrentRole(saved);
        }
      } catch {
        /* role defaults to null */
      } finally {
        setIsLoading(false);
      }
    };
    loadRole();
  }, []);

  const setRole = useCallback(async (role: UserRole) => {
    await AsyncStorage.setItem(ASYNC_STORAGE_ROLE_KEY, role);
    setCurrentRole(role);
  }, []);

  const clearRole = useCallback(async () => {
    await AsyncStorage.removeItem(ASYNC_STORAGE_ROLE_KEY);
    setCurrentRole(null);
  }, []);

  return (
    <RoleContext.Provider
      value={{ currentRole, setRole, clearRole, isLoading }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRoleContext = (): RoleContextValue => {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRoleContext must be used within a RoleProvider");
  }
  return ctx;
};
