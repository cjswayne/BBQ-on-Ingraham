import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { apiClient } from "../api/client.js";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "barbecue-mondays-token";
const TOKEN_EXPIRY_STORAGE_KEY = "barbecue-mondays-token-expiry";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getStoredToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

const getStoredExpiry = () => {
  return Number(localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY) || 0);
};

const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
};

const storeAuthToken = (token) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(
    TOKEN_EXPIRY_STORAGE_KEY,
    String(Date.now() + ONE_DAY_MS)
  );
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    const currentExpiry = getStoredExpiry();

    if (!currentToken || !currentExpiry || currentExpiry <= Date.now()) {
      logout();
      return null;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.getCurrentUser();
      setToken(currentToken);
      setUser(response.user);

      return response.user;
    } catch (error) {
      console.error("Failed to refresh authenticated user", error);
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const login = useCallback((nextToken, nextUser) => {
    storeAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser, token]);

  const value = useMemo(() => {
    return {
      token,
      user,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshUser
    };
  }, [isLoading, login, logout, refreshUser, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
