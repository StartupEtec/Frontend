import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "@startup_app/access_token";
const REFRESH_TOKEN_KEY = "@startup_app/refresh_token";
const USER_ID_KEY = "@startup_app/user_id";

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem(USER_ID_KEY);
  },

  async setUserId(id: string): Promise<void> {
    await AsyncStorage.setItem(USER_ID_KEY, id);
  },

  async saveAuth(data: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  }): Promise<void> {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, data.accessToken],
      [REFRESH_TOKEN_KEY, data.refreshToken],
      [USER_ID_KEY, data.userId],
    ]);
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_ID_KEY,
    ]);
  },
};
