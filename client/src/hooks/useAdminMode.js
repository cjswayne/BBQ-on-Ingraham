import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { adminSession } from "../api/client.js";

/**
 * Detects ?admin=true and manages admin token state for inline admin controls.
 * Returns { isAdmin, isAuthenticated, handleAuthenticated, logout }
 */
export const useAdminMode = () => {
  const [searchParams] = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [token, setToken] = useState(() => adminSession.getToken());

  const isAuthenticated = Boolean(isAdmin && token);

  // Called by AdminPasswordGate after successful login
  const handleAuthenticated = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    adminSession.clear();
    setToken(null);
  }, []);

  return useMemo(
    () => ({ isAdmin, isAuthenticated, handleAuthenticated, logout }),
    [isAdmin, isAuthenticated, handleAuthenticated, logout]
  );
};
