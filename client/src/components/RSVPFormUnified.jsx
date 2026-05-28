import { useEffect, useRef, useState } from "react";

import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getClosestMondayInputValue } from "../utils/date.js";
import { PhotoUpload } from "./PhotoUpload.jsx";

const FOOD_CATEGORIES = ["Meat", "Side", "Dessert"];
const EMAIL_STORAGE_KEY = "barbecue-mondays-user-email";
const PHONE_STORAGE_KEY = "barbecue-mondays-user-phone";
const LOOKUP_DEBOUNCE_MS = 300;

/**
 * Returns a new default RSVP form state object.
 * @param {string} initialEmail - Email value to prefill from auth context.
 * @param {string} initialPhone - Phone value to prefill from auth context.
 * @returns {object} Fresh state values.
 */
const createInitialFormState = (initialEmail, initialPhone) => {
  return {
    name: "",
    email: initialEmail || "",
    phone: initialPhone || "",
    foodCategory: "",
    foodCustom: "",
    allergies: "",
    guestCount: 1,
    profilePhotoUrl: "",
    isNeighbor: false
  };
};

/**
 * Validates a candidate email string with a simple address pattern.
 * @param {string} value - Email text to validate.
 * @returns {boolean} True when the email has a basic valid format.
 */
const isValidEmailFormat = (value) => {
  const normalizedValue = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
};

/**
 * Validates a phone number with a simple digit pattern.
 * @param {string} value - Phone text to validate.
 * @returns {boolean} True when the phone has at least 7 digits.
 */
const isValidPhoneFormat = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
};

/**
 * Strips non-digit chars from a phone string to match server regex expectations.
 * @param {string} value - Raw phone input.
 * @returns {string} Digits-only phone string (preserves leading +).
 */
const normalizePhone = (value) => {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

/**
 * Resets new-user/returning-user toggles after email changes.
 * @param {Function} setIsReturningUser - React state setter for returning user state.
 * @param {Function} setReturnedUserData - React state setter for fetched user data.
 * @param {Function} setShowProfileUpload - React state setter for profile upload visibility.
 * @param {Function} setShowNeighborCheckbox - React state setter for neighbor checkbox visibility.
 * @returns {void}
 */
const resetEmailLookupState = (
  setIsReturningUser,
  setReturnedUserData,
  setShowProfileUpload,
  setShowNeighborCheckbox
) => {
  setIsReturningUser(false);
  setReturnedUserData(null);
  setShowProfileUpload(false);
  setShowNeighborCheckbox(false);
};

/**
 * Renders a fallback initial letter for users without a profile image.
 * @param {string} name - User name used to build the fallback initial.
 * @returns {string} Uppercase initial letter.
 */
const getNameInitial = (name) => {
  const firstCharacter = (name || "").trim().charAt(0);
  return firstCharacter ? firstCharacter.toUpperCase() : "?";
};

/**
 * Renders a unified RSVP form for guest and returning-email workflows.
 * @param {object} props - Component props.
 * @param {boolean} props.cancelled - Indicates whether RSVP is closed.
 * @param {(body: object) => Promise<object|void>} props.onSubmit - Submit handler provided by parent component.
 * @param {string} props.eventDate - Optional event date to include in the payload.
 * @returns {JSX.Element} RSVP form content.
 */
export const RSVPFormUnified = ({ cancelled = false, onSubmit, eventDate }) => {
  const { storedEmail, storedPhone, isAuthenticated, login } = useAuth();
  const initialFormState = createInitialFormState(storedEmail || "", storedPhone || "");
  const [formState, setFormState] = useState(initialFormState);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [returnedUserData, setReturnedUserData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [showNeighborCheckbox, setShowNeighborCheckbox] = useState(false);

  const nameInputRef = useRef(null);
  const lookupTimeoutRef = useRef(null);
  const lookupRequestIdRef = useRef(0);
  const latestLookupEmailRef = useRef("");

  /**
   * Sets one field value on form state.
   * @param {string} fieldName - Key in the form state object.
   * @param {string|number|boolean} fieldValue - New value for that key.
   * @returns {void}
   */
  const setFieldValue = (fieldName, fieldValue) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: fieldValue
    }));
  };

  /**
   * Toggles a food category and clears custom food text when selected.
   * @param {string} category - Category selected by the user.
   * @returns {void}
   */
  const handleCategorySelect = (category) => {
    setFormState((currentValue) => ({
      ...currentValue,
      foodCategory: currentValue.foodCategory === category ? "" : category,
      foodCustom: ""
    }));
  };

  /**
   * Resolves a final food string from category or custom text.
   * @returns {string} Final food value.
   */
  const resolveFood = () => {
    if (formState.foodCategory) {
      return formState.foodCategory;
    }

    return formState.foodCustom.trim();
  };

  /**
   * Performs user lookup by email or phone and toggles returning/new-user UI state.
   * @param {{ email?: string, phone?: string }} identifier - Lookup identifier.
   * @returns {Promise<void>}
   */
  const runUserLookup = async (identifier) => {
    const normalizedEmail = identifier.email ? identifier.email.trim().toLowerCase() : "";
    const normalizedPhone = identifier.phone ? normalizePhone(identifier.phone) : "";
    const lookupKey = normalizedEmail || normalizedPhone;

    const hasValidIdentifier = normalizedEmail
      ? isValidEmailFormat(normalizedEmail)
      : isValidPhoneFormat(normalizedPhone);

    if (!hasValidIdentifier) {
      resetEmailLookupState(
        setIsReturningUser,
        setReturnedUserData,
        setShowProfileUpload,
        setShowNeighborCheckbox
      );
      setFormState((currentValue) => ({
        ...currentValue,
        profilePhotoUrl: "",
        isNeighbor: false
      }));
      latestLookupEmailRef.current = "";
      return;
    }

    if (latestLookupEmailRef.current === lookupKey) {
      return;
    }

    const requestId = lookupRequestIdRef.current + 1;
    lookupRequestIdRef.current = requestId;
    latestLookupEmailRef.current = lookupKey;

    try {
      const lookupParams = normalizedEmail
        ? { email: normalizedEmail }
        : { phone: normalizedPhone };
      const lookupResponse = await apiClient.lookupUser(lookupParams);

      if (lookupRequestIdRef.current !== requestId) {
        return;
      }

      if (lookupResponse?.exists) {
        const returnedName = lookupResponse.name || "";
        const returnedPhotoUrl = lookupResponse.profilePhotoUrl || "";
        const returnedNeighborStatus = Boolean(lookupResponse.isNeighbor);

        setIsReturningUser(true);
        setReturnedUserData({
          name: returnedName,
          profilePhotoUrl: returnedPhotoUrl,
          isNeighbor: returnedNeighborStatus
        });
        setShowProfileUpload(false);
        setShowNeighborCheckbox(false);
        setFormState((currentValue) => ({
          ...currentValue,
          name: returnedName,
          profilePhotoUrl: returnedPhotoUrl,
          isNeighbor: returnedNeighborStatus
        }));
        return;
      }

      resetEmailLookupState(
        setIsReturningUser,
        setReturnedUserData,
        setShowProfileUpload,
        setShowNeighborCheckbox
      );
      setShowProfileUpload(true);
      setShowNeighborCheckbox(true);
      setFormState((currentValue) => ({
        ...currentValue,
        profilePhotoUrl: "",
        isNeighbor: false
      }));
    } catch (error) {
      console.error("User lookup failed", error);
      if (lookupRequestIdRef.current === requestId) {
        setErrorMessage(error.message || "Unable to check that identifier right now");
      }
    }
  };

  /**
   * Handles blur events on email or phone fields by forcing immediate lookup.
   * @param {"email"|"phone"} field - Which field triggered the blur.
   * @returns {Promise<void>}
   */
  const handleIdentifierBlur = async (field) => {
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
      lookupTimeoutRef.current = null;
    }

    if (field === "email" && formState.email.trim()) {
      await runUserLookup({ email: formState.email });
    } else if (field === "phone" && formState.phone.trim()) {
      await runUserLookup({ phone: formState.phone });
    }
  };

  /**
   * Restores full guest-input mode for mismatched account summaries.
   * @returns {void}
   */
  const handleResetReturningUser = () => {
    resetEmailLookupState(
      setIsReturningUser,
      setReturnedUserData,
      setShowProfileUpload,
      setShowNeighborCheckbox
    );
    setShowProfileUpload(true);
    setShowNeighborCheckbox(true);
    latestLookupEmailRef.current = "";
    setFormState((currentValue) => ({
      ...currentValue,
      name: "",
      email: "",
      phone: "",
      profilePhotoUrl: "",
      isNeighbor: false
    }));
    nameInputRef.current?.focus();
  };

  /**
   * Submits RSVP payload to the parent callback and applies post-submit state updates.
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const resolvedFood = resolveFood();
    if (!resolvedFood) {
      setErrorMessage("Please pick a food category or enter what you are bringing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const trimmedEmail = formState.email.trim();
      const normalizedPhoneValue = normalizePhone(formState.phone);
      const body = {
        eventDate: eventDate ? eventDate.slice(0, 10) : getClosestMondayInputValue(),
        name: formState.name.trim(),
        food: resolvedFood,
        allergies: formState.allergies.trim(),
        guestCount: 1,
        profilePhotoUrl: formState.profilePhotoUrl
      };

      if (trimmedEmail) {
        body.email = trimmedEmail;
      }

      if (normalizedPhoneValue) {
        body.phone = normalizedPhoneValue;
      }

      if (showNeighborCheckbox) {
        body.isNeighbor = formState.isNeighbor;
      }

      const response = await onSubmit(body);

      if (response?.token) {
        login(response.token, response.user);
      }

      if (trimmedEmail) {
        localStorage.setItem(EMAIL_STORAGE_KEY, trimmedEmail);
      }
      if (normalizedPhoneValue) {
        localStorage.setItem(PHONE_STORAGE_KEY, normalizedPhoneValue);
      }

      setFormState((currentValue) => ({
        ...currentValue,
        foodCategory: "",
        foodCustom: "",
        allergies: ""
      }));
    } catch (error) {
      console.error("RSVP submission failed", error);
      setErrorMessage(error.message || "Unable to save your RSVP");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    /**
     * Focuses the name field whenever navigation lands on #rsvp.
     * @returns {void}
     */
    const focusIfRsvpHash = () => {
      if (window.location.hash === "#rsvp") {
        nameInputRef.current?.focus();
      }
    };

    focusIfRsvpHash();
    window.addEventListener("hashchange", focusIfRsvpHash);
    return () => window.removeEventListener("hashchange", focusIfRsvpHash);
  }, []);

  // Debounced lookup for email or phone changes
  useEffect(() => {
    const hasEmail = formState.email.trim();
    const hasPhone = formState.phone.trim();

    if (!hasEmail && !hasPhone) {
      resetEmailLookupState(
        setIsReturningUser,
        setReturnedUserData,
        setShowProfileUpload,
        setShowNeighborCheckbox
      );
      setFormState((currentValue) => ({
        ...currentValue,
        name: "",
        profilePhotoUrl: "",
        isNeighbor: false
      }));
      latestLookupEmailRef.current = "";
      return undefined;
    }

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    // Prefer email lookup when both are present
    const identifier = hasEmail ? { email: formState.email } : { phone: formState.phone };

    lookupTimeoutRef.current = setTimeout(() => {
      runUserLookup(identifier);
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
        lookupTimeoutRef.current = null;
      }
    };
  }, [formState.email, formState.phone, isAuthenticated]);

  if (cancelled) {
    return (
      <div id="rsvp" className="surface-card space-y-2 p-5 opacity-60">
        <h2 className="text-lg font-semibold text-pb-ocean">RSVP</h2>
        <p className="text-sm text-pb-driftwood">RSVPs are closed — this event is not happening.</p>
      </div>
    );
  }

  return (
    <form id="rsvp" className="surface-card space-y-4 p-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-lg font-semibold text-pb-ocean">RSVP</h2>
      </div>

      {isReturningUser ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-pb-ocean/15 bg-white px-3 py-2">
          <div className="flex items-center gap-3">
            {returnedUserData?.profilePhotoUrl ? (
              <img
                alt={`${returnedUserData?.name || "Returning user"} profile`}
                className="h-10 w-10 rounded-full object-cover"
                src={returnedUserData.profilePhotoUrl}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pb-palm text-sm font-semibold text-white">
                {getNameInitial(returnedUserData?.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-pb-ink">
                {returnedUserData?.name || formState.name || "Returning guest"}
              </p>
              <p className="truncate text-xs text-pb-driftwood">
                {formState.email || formState.phone}
              </p>
            </div>
          </div>
          <button
            className="text-xs font-semibold text-pb-ocean underline-offset-2 hover:underline"
            onClick={handleResetReturningUser}
            type="button"
          >
            Not you?
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="guest-name">
              Name
            </label>
            <input
              autoComplete="name"
              className="input-field"
              id="guest-name"
              name="name"
              onChange={(event) => setFieldValue("name", event.target.value)}
              placeholder="Your name"
              ref={nameInputRef}
              required
              type="text"
              value={formState.name}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="guest-phone">
              Phone number <span className="text-xs font-normal text-pb-driftwood">(optional)</span>
            </label>
            <input
              autoComplete="tel"
              className="input-field"
              id="guest-phone"
              inputMode="tel"
              name="phone"
              onBlur={() => handleIdentifierBlur("phone")}
              onChange={(event) => setFieldValue("phone", event.target.value)}
              placeholder="(555) 123-4567"
              type="tel"
              value={formState.phone}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="guest-email">
              Email <span className="text-xs font-normal text-pb-driftwood">(optional)</span>
            </label>
            <input
              autoComplete="email"
              className="input-field"
              id="guest-email"
              inputMode="email"
              name="email"
              onBlur={() => handleIdentifierBlur("email")}
              onChange={(event) => setFieldValue("email", event.target.value)}
              placeholder="your@email.com"
              type="email"
              value={formState.email}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <span className="block text-sm font-medium">What are you bringing?</span>
        {!formState.foodCategory ? (
          <input
            className="input-field"
            id="guest-food-custom"
            onChange={(event) => setFieldValue("foodCustom", event.target.value)}
            placeholder="Describe what you're bringing..."
            type="text"
            value={formState.foodCustom}
          />
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {FOOD_CATEGORIES.map((category) => (
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                formState.foodCategory === category
                  ? "bg-pb-palm text-white"
                  : "border border-pb-driftwood/30 text-pb-ink hover:bg-pb-cream"
              }`}
              key={category}
              onClick={() => handleCategorySelect(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="guest-allergies">
          Allergies  <span className="text-xs font-normal text-pb-driftwood">(optional)</span>
        </label>
        <input
          className="input-field"
          id="guest-allergies"
          onChange={(event) => setFieldValue("allergies", event.target.value)}
          placeholder="Any food allergies?"
          type="text"
          value={formState.allergies}
        />
      </div>

      {showNeighborCheckbox ? (
        <label className="flex items-center gap-2 text-sm text-pb-ink">
          <input
            checked={formState.isNeighbor}
            className="h-4 w-4 rounded border-pb-driftwood text-pb-palm focus:ring-pb-palm"
            onChange={(event) => setFieldValue("isNeighbor", event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm">I'm a neighbor</span>
        </label>
      ) : null}

      {showProfileUpload ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-pb-ink">Add a profile photo (optional)</p>
          <PhotoUpload
            onChange={(photoUrl) => setFieldValue("profilePhotoUrl", photoUrl)}
            value={formState.profilePhotoUrl}
          />
        </div>
      ) : null}

      {errorMessage ? <p className="text-sm text-pb-error">{errorMessage}</p> : null}

      <button
        className="rounded-full bg-pb-palm px-4 py-3 text-sm font-semibold text-white transition"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "RSVP-ing..." : "RSVP"}
      </button>
    </form>
  );
};
