import { useState } from "react";

import { adminSession, apiClient } from "../api/client.js";

// Renders a password form; calls onAuthenticated(token) when login succeeds
const AdminPasswordGate = ({ onAuthenticated }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.adminLogin(password);

      adminSession.setToken(response.token);
      onAuthenticated(response.token);
    } catch (error) {
      console.error("Admin login failed", error);
      setErrorMessage(
        error.status === 401
          ? "Incorrect password. Please try again."
          : error.message || "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-sm items-center justify-center px-4 py-10">
      <form className="surface-card w-full space-y-5 p-8" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-pb-ocean">Admin access</h1>
          <p className="text-sm text-pb-driftwood">Enter the admin password to continue.</p>
        </div>

        {errorMessage ? (
          <p className="text-sm text-pb-error">{errorMessage}</p>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="admin-password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="input-field"
            id="admin-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>

        <button
          className="w-full rounded-full bg-pb-ocean px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isLoading || !password}
          type="submit"
        >
          {isLoading ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
};

export default AdminPasswordGate;
