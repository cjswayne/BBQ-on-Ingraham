import { useEffect, useState } from "react";

import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const initialState = {
  phone: "",
  code: ""
};

export const LoginModal = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [formState, setFormState] = useState(initialState);
  const [step, setStep] = useState("phone");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormState(initialState);
      setStep("phone");
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const setFieldValue = (fieldName, fieldValue) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: fieldValue
    }));
  };

  const submitPhone = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await apiClient.sendOtp(formState.phone.trim());
      setStep("code");
    } catch (error) {
      setErrorMessage(error.message || "Unable to send the verification code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await apiClient.verifyOtp(
        formState.phone.trim(),
        formState.code.trim()
      );

      login(response.token, response.user);
      onClose();
    } catch (error) {
      setErrorMessage(error.message || "Unable to verify the code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="surface-card w-full max-w-md p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-pb-ocean">Login</h2>
            <p className="mt-1 text-sm text-pb-driftwood">
              Use your phone number to RSVP, edit, or cancel later.
            </p>
          </div>
          <button
            aria-label="Close login modal"
            className="rounded-full border border-pb-driftwood/20 px-3 py-1 text-sm"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {step === "phone" ? (
          <form className="space-y-4" onSubmit={submitPhone}>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="phone">
                Phone number
              </label>
              <input
                autoComplete="tel"
                className="input-field"
                id="phone"
                inputMode="tel"
                name="phone"
                onChange={(event) => setFieldValue("phone", event.target.value)}
                placeholder="+16195550111"
                type="tel"
                value={formState.phone}
              />
            </div>
            {errorMessage ? (
              <p className="text-sm text-pb-error">{errorMessage}</p>
            ) : null}
            <button
              className="w-full rounded-full bg-pb-coral px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending code..." : "Send code"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={submitCode}>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="code">
                Verification code
              </label>
              <input
                className="input-field"
                id="code"
                inputMode="numeric"
                name="code"
                onChange={(event) => setFieldValue("code", event.target.value)}
                placeholder="123456"
                type="text"
                value={formState.code}
              />
            </div>
            <p className="text-xs text-pb-driftwood">
              Code sent to <strong>{formState.phone}</strong>
            </p>
            {errorMessage ? (
              <p className="text-sm text-pb-error">{errorMessage}</p>
            ) : null}
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-full border border-pb-ocean/20 px-4 py-3 text-sm font-medium text-pb-ocean"
                onClick={() => setStep("phone")}
                type="button"
              >
                Back
              </button>
              <button
                className="flex-1 rounded-full bg-pb-ocean px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Verifying..." : "Verify"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
