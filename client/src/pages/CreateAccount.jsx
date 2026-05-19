import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PhotoUpload } from "../components/PhotoUpload.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Resolves the best initial to display when no profile photo exists.
 * @param {string} name - Current profile name value.
 * @returns {string} Uppercase initial fallback value.
 */
const getProfileInitial = (name) => {
  return (name?.trim()?.charAt(0) || "U").toUpperCase();
};

/**
 * Renders profile setup for authenticated users after RSVP.
 * @returns {JSX.Element} Create account page content.
 */
const CreateAccount = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.profilePhotoUrl || "");
  const [isNeighbor, setIsNeighbor] = useState(Boolean(user?.isNeighbor));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setProfilePhotoUrl(user?.profilePhotoUrl || "");
    setIsNeighbor(Boolean(user?.isNeighbor));
  }, [user]);

  /**
   * Persists profile setup values and refreshes auth user state.
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event.
   * @returns {Promise<void>} Resolves after profile setup flow completes.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await apiClient.setupProfile({
        name: name.trim(),
        profilePhotoUrl: profilePhotoUrl || null,
        isNeighbor
      });
      await refreshUser();
      navigate("/");
    } catch (error) {
      console.error("Failed to set up profile", error);
      setErrorMessage(error?.message || "Unable to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex w-full max-w-md px-4 py-10">
        <section className="surface-card w-full p-6 text-center">
          <h1 className="text-3xl font-semibold text-pb-ocean">Set Up Your Profile</h1>
          <p className="mt-4 text-sm text-pb-driftwood">You need to RSVP first</p>
          <Link
            className="mt-5 inline-flex rounded-full bg-pb-palm px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            to="/#rsvp"
          >
            Go to RSVP
          </Link>
        </section>
      </main>
    );
  }

  const profileInitial = getProfileInitial(name);

  return (
    <main className="mx-auto flex w-full max-w-md px-4 py-10">
      <section className="surface-card w-full p-6">
        <h1 className="text-center text-3xl font-semibold text-pb-ocean">Set Up Your Profile</h1>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-3">
            {profilePhotoUrl ? (
              <img
                alt="Profile preview"
                className="h-20 w-20 rounded-full border-2 border-white/30 object-cover"
                src={profilePhotoUrl}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pb-palm text-2xl font-semibold text-white">
                {profileInitial}
              </div>
            )}
            <PhotoUpload onChange={setProfilePhotoUrl} value={profilePhotoUrl} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-pb-ocean" htmlFor="create-account-name">
              Name
            </label>
            <input
              autoComplete="name"
              className="input-field"
              id="create-account-name"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-pb-ocean" htmlFor="create-account-neighbor">
            <input
              checked={isNeighbor}
              className="h-4 w-4 rounded border-pb-driftwood/40"
              id="create-account-neighbor"
              onChange={(event) => setIsNeighbor(event.target.checked)}
              type="checkbox"
            />
            I&apos;m a neighbor
          </label>

          {errorMessage ? (
            <p className="rounded-xl bg-pb-error/10 px-3 py-2 text-sm text-pb-error">{errorMessage}</p>
          ) : null}

          <button
            className="w-full rounded-full bg-pb-ocean px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default CreateAccount;
