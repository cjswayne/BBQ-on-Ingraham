import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Page for setting a password via token or email link params.
 * @returns {JSX.Element} Rendered set-password page.
 */
const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const phone = searchParams.get("phone") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const hasValidParams = Boolean(token || email || phone);

  /**
   * Validates form inputs before calling API.
   * @returns {string} Validation message, or empty string when valid.
   */
  const validateForm = () => {
    if (password.length < 8 || confirmPassword.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  };

  /**
   * Submits password setup request using token or email.
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event.
   * @returns {Promise<void>} Completes when request resolves.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (token) {
        await apiClient.setPassword(token, password, confirmPassword);
      } else if (email) {
        await apiClient.setPasswordByEmail(email, password, confirmPassword);
      } else {
        await apiClient.setPasswordByPhone(phone, password, confirmPassword);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to set password", error);
      setErrorMessage(error.message || "Unable to set password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasValidParams) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="surface-card space-y-3 p-6">
          <h1 className="text-2xl font-semibold text-pb-ocean">Set password</h1>
          <p className="text-sm text-pb-error">Invalid link</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="surface-card space-y-5 p-6">
        <h1 className="text-2xl font-semibold text-pb-ocean">Set password</h1>

        {isSuccess ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-pb-ocean">Password set successfully!</p>
            <p className="text-sm text-pb-driftwood">
              Complete your account with your photo, display name, and neighbor status.
            </p>
            <Link
              className="inline-flex rounded-full bg-pb-palm px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              to="/create-account"
            >
              Complete your profile
            </Link>
            {isAuthenticated ? (
              <p className="text-xs text-pb-driftwood">You are currently signed in.</p>
            ) : null}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-pb-ocean" htmlFor="set-password-password">
                Password
              </label>
              <input
                autoComplete="new-password"
                className="input-field"
                id="set-password-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-pb-ocean" htmlFor="set-password-confirm-password">
                Confirm password
              </label>
              <input
                autoComplete="new-password"
                className="input-field"
                id="set-password-confirm-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </div>

            {errorMessage ? <p className="text-sm text-pb-error">{errorMessage}</p> : null}

            <button
              className="rounded-full bg-pb-palm px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Set password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default SetPassword;
