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
const EMAIL_STORAGE_KEY = "barbecue-mondays-user-email";
const PHONE_STORAGE_KEY = "barbecue-mondays-user-phone";
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
  localStorage.removeItem(PHONE_STORAGE_KEY);
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
  const [storedEmail, setStoredEmail] = useState(() =>
    localStorage.getItem(EMAIL_STORAGE_KEY)
  );
  const [storedPhone, setStoredPhone] = useState(() =>
    localStorage.getItem(PHONE_STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearStoredAuth();
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    localStorage.removeItem(PHONE_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStoredEmail(null);
    setStoredPhone(null);
    setIsLoading(false);
  }, []);

  /**
   * Refreshes the authenticated user from the API and syncs local storage values.
   * @returns {Promise<object|null>} Refreshed user data, or null when unavailable.
   */
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
      if (response.user?.email) {
        localStorage.setItem(EMAIL_STORAGE_KEY, response.user.email);
        setStoredEmail(response.user.email);
      }
      if (response.user?.phone) {
        localStorage.setItem(PHONE_STORAGE_KEY, response.user.phone);
        setStoredPhone(response.user.phone);
      }

      return response.user;
    } catch (error) {
      console.error("Failed to refresh authenticated user", error);
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  /**
   * Persists the auth session and user profile details in local state and storage.
   * @param {string} nextToken - Auth token from a successful login.
   * @param {object} nextUser - User object returned by the auth API.
   * @returns {void}
   */
  const login = useCallback((nextToken, nextUser) => {
    storeAuthToken(nextToken);
    const nextEmail = nextUser?.email || null;
    const nextPhone = nextUser?.phone || null;
    if (nextEmail) {
      localStorage.setItem(EMAIL_STORAGE_KEY, nextEmail);
    } else {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
    }
    if (nextPhone) {
      localStorage.setItem(PHONE_STORAGE_KEY, nextPhone);
    } else {
      localStorage.removeItem(PHONE_STORAGE_KEY);
    }
    setToken(nextToken);
    setUser(nextUser);
    setStoredEmail(nextEmail);
    setStoredPhone(nextPhone);
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
      storedEmail,
      storedPhone,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshUser
    };
  }, [isLoading, login, logout, refreshUser, storedEmail, storedPhone, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
