import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiClient } from "../api/client.js";
import EditRSVPModal from "../components/EditRSVPModal.jsx";
import GalleryModal from "../components/GalleryModal.jsx";
import { PhotoUpload } from "../components/PhotoUpload.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatEventDateLabel } from "../utils/date.js";

/**
 * Formats RSVP date text for profile cards.
 * @param {string|Date|undefined|null} dateValue - RSVP event date value.
 * @returns {string} Human-readable date string.
 */
const getRsvpDateLabel = (dateValue) => {
  if (!dateValue) {
    return "Unknown event date";
  }

  return formatEventDateLabel(dateValue);
};

/**
 * Profile page for account edits, RSVPs, and uploads.
 * @returns {JSX.Element} Rendered profile page.
 */
const Profile = () => {
  const { isAuthenticated, refreshUser, user } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.profilePhotoUrl || "");
  const [isNeighbor, setIsNeighbor] = useState(Boolean(user?.isNeighbor));
  const [password, setPassword] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [rsvps, setRsvps] = useState([]);
  const [isLoadingRsvps, setIsLoadingRsvps] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [editingRsvp, setEditingRsvp] = useState(null);

  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [activeMedia, setActiveMedia] = useState(null);
  const [deletingMediaId, setDeletingMediaId] = useState("");

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfilePhotoUrl(user?.profilePhotoUrl || "");
    setIsNeighbor(Boolean(user?.isNeighbor));
  }, [user]);

  /**
   * Loads authenticated user's RSVP history.
   * @returns {Promise<void>} Completes when RSVP list is fetched.
   */
  const loadMyRsvps = async () => {
    setIsLoadingRsvps(true);
    setRsvpError("");

    try {
      const response = await apiClient.getMyRsvps();
      setRsvps(response?.rsvps || []);
    } catch (error) {
      console.error("Failed to load my RSVPs", error);
      setRsvpError(error.message || "Unable to load your RSVPs");
    } finally {
      setIsLoadingRsvps(false);
    }
  };

  /**
   * Loads authenticated user's uploaded media.
   * @returns {Promise<void>} Completes when media list is fetched.
   */
  const loadMyMedia = async () => {
    setIsLoadingMedia(true);
    setMediaError("");

    try {
      const response = await apiClient.getMyMedia();
      setMediaItems(response?.media || []);
    } catch (error) {
      console.error("Failed to load my media", error);
      setMediaError(error.message || "Unable to load your uploads");
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadMyRsvps();
    loadMyMedia();
  }, [isAuthenticated]);

  /**
   * Starts profile editing flow by showing password verification.
   * @returns {void}
   */
  const handleStartEditProfile = () => {
    setIsEditMode(true);
    setIsPasswordVerified(false);
    setPassword("");
    setProfileMessage("");
    setProfileError("");
  };

  /**
   * Verifies the entered password using a no-op profile update.
   * @returns {Promise<void>} Completes when password check returns.
   */
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setProfileError("Enter your current password to continue.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      await apiClient.updateProfile({
        password: password.trim(),
        name: profileName,
        profilePhotoUrl,
        isNeighbor
      });
      setIsPasswordVerified(true);
      setProfileMessage("Password verified. You can now edit your profile.");
    } catch (error) {
      console.error("Failed to verify profile password", error);
      setProfileError(error.message || "Invalid password");
      setIsPasswordVerified(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  /**
   * Saves edited profile values.
   * @returns {Promise<void>} Completes when save request resolves.
   */
  const handleSaveProfile = async () => {
    if (!password.trim()) {
      setProfileError("Current password is required.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      await apiClient.updateProfile({
        password: password.trim(),
        name: profileName.trim(),
        profilePhotoUrl: profilePhotoUrl.trim(),
        isNeighbor
      });
      await refreshUser();
      setProfileMessage("Profile updated successfully.");
      setIsEditMode(false);
      setIsPasswordVerified(false);
      setPassword("");
    } catch (error) {
      console.error("Failed to save profile", error);
      setProfileError(error.message || "Unable to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  /**
   * Handles RSVP cancellation with confirmation.
   * @param {string} id - RSVP id to cancel.
   * @returns {Promise<void>} Completes when cancellation is finished.
   */
  const handleCancelRsvp = async (id) => {
    if (!window.confirm("Cancel this RSVP?")) {
      return;
    }

    try {
      await apiClient.cancelRsvp(id);
      await loadMyRsvps();
    } catch (error) {
      console.error("Failed to cancel RSVP", error);
      setRsvpError(error.message || "Unable to cancel RSVP");
    }
  };

  /**
   * Saves edits from the RSVP modal and refreshes list.
   * @param {{ food: string, allergies: string, guestCount: number }} payload - RSVP update payload.
   * @returns {Promise<void>} Completes when update and refresh finish.
   */
  const handleSaveRsvpEdits = async (payload) => {
    if (!editingRsvp?.id) {
      return;
    }

    await apiClient.updateRsvp(editingRsvp.id, payload);
    await loadMyRsvps();
  };

  /**
   * Deletes one uploaded media item and refreshes list.
   * @param {string} id - Media id to delete.
   * @returns {Promise<void>} Completes when deletion flow finishes.
   */
  const handleDeleteMedia = async (id) => {
    if (!window.confirm("Delete this photo/video?")) {
      return;
    }

    setDeletingMediaId(id);
    setMediaError("");

    try {
      await apiClient.deleteMedia(id);
      await loadMyMedia();
      if (activeMedia?._id === id || activeMedia?.id === id) {
        setActiveMedia(null);
      }
    } catch (error) {
      console.error("Failed to delete media", error);
      setMediaError(error.message || "Unable to delete upload");
    } finally {
      setDeletingMediaId("");
    }
  };

  /**
   * Resolves active and cancelled RSVP lists for rendering.
   * @returns {{ activeRsvps: object[], cancelledRsvps: object[] }} Split RSVP groups.
   */
  const groupedRsvps = useMemo(() => {
    const activeRsvps = rsvps.filter((rsvp) => !rsvp.cancelledAt);
    const cancelledRsvps = rsvps.filter((rsvp) => Boolean(rsvp.cancelledAt));
    return { activeRsvps, cancelledRsvps };
  }, [rsvps]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="surface-card space-y-3 p-6">
          <h1 className="text-2xl font-semibold text-pb-ocean">Profile</h1>
          <p className="text-sm text-pb-driftwood">Please RSVP first to create your account</p>
          <Link
            className="inline-flex rounded-full bg-pb-palm px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            to="/#rsvp"
          >
            Go to RSVP
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <section className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {user?.profilePhotoUrl ? (
            <img
              alt={`${user?.name || "User"} profile`}
              className="h-20 w-20 rounded-full object-cover"
              src={user.profilePhotoUrl}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pb-sand text-2xl font-semibold text-pb-ocean">
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-pb-ocean">{user?.name || "Your profile"}</h1>
            <p className="text-sm text-pb-driftwood">{user?.email || "No email"}</p>
            {user?.isNeighbor ? (
              <span className="inline-flex rounded-full bg-pb-palm/15 px-3 py-1 text-xs font-medium text-pb-palm">
                Neighbor
              </span>
            ) : null}
          </div>
        </div>

        {!isEditMode ? (
          <button
            className="rounded-full bg-pb-palm px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            onClick={handleStartEditProfile}
            type="button"
          >
            Edit Profile
          </button>
        ) : (
          <div className="space-y-4 rounded-xl border border-pb-driftwood/20 p-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-pb-ocean" htmlFor="profile-current-password">
                Current password
              </label>
              <input
                className="input-field"
                id="profile-current-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>

            {!isPasswordVerified ? (
              <button
                className="rounded-full bg-pb-palm px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                disabled={isSavingProfile}
                onClick={handleVerifyPassword}
                type="button"
              >
                {isSavingProfile ? "Verifying..." : "Verify password"}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-pb-ocean" htmlFor="profile-name">
                    Name
                  </label>
                  <input
                    className="input-field"
                    id="profile-name"
                    onChange={(event) => setProfileName(event.target.value)}
                    type="text"
                    value={profileName}
                  />
                </div>

                <div className="space-y-2">
                  <span className="block text-sm font-medium text-pb-ocean">Profile photo</span>
                  <PhotoUpload onChange={setProfilePhotoUrl} value={profilePhotoUrl} />
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-pb-ink">
                  <input
                    checked={isNeighbor}
                    onChange={(event) => setIsNeighbor(event.target.checked)}
                    type="checkbox"
                  />
                  I&apos;m a neighbor
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-full bg-pb-palm px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                    disabled={isSavingProfile}
                    onClick={handleSaveProfile}
                    type="button"
                  >
                    {isSavingProfile ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="rounded-full border border-pb-driftwood/30 px-4 py-2 text-sm font-medium text-pb-ink transition hover:bg-pb-cream"
                    onClick={() => {
                      setIsEditMode(false);
                      setIsPasswordVerified(false);
                      setPassword("");
                      setProfileError("");
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {profileMessage ? <p className="text-sm text-pb-palm">{profileMessage}</p> : null}
            {profileError ? <p className="text-sm text-pb-error">{profileError}</p> : null}
          </div>
        )}
      </section>

      <section className="surface-card space-y-4 p-6">
        <h2 className="text-xl font-semibold text-pb-ocean">Your RSVPs</h2>

        {isLoadingRsvps ? <p className="text-sm text-pb-driftwood">Loading RSVPs...</p> : null}
        {rsvpError ? <p className="text-sm text-pb-error">{rsvpError}</p> : null}

        {!isLoadingRsvps && rsvps.length === 0 ? (
          <p className="text-sm text-pb-driftwood">You haven&apos;t RSVP&apos;d to any events yet.</p>
        ) : null}

        {groupedRsvps.activeRsvps.map((rsvp) => (
          <article className="rounded-xl border border-pb-driftwood/20 p-4" key={rsvp.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-pb-ocean">{getRsvpDateLabel(rsvp.eventDate)}</p>
                <p className="text-sm text-pb-ink">
                  Bringing <span className="font-medium">{rsvp.food || "Undecided"}</span>
                </p>
                <p className="text-xs text-pb-driftwood">
                  Allergies: {rsvp.allergies || "None"}
                </p>
                {rsvp.eventTheme ? (
                  <p className="text-xs text-pb-driftwood">Theme: {rsvp.eventTheme}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-pb-driftwood/30 px-3 py-1.5 text-xs font-medium text-pb-ink transition hover:bg-pb-cream"
                  onClick={() => setEditingRsvp(rsvp)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="rounded-full border border-pb-error/30 px-3 py-1.5 text-xs font-medium text-pb-error transition hover:bg-pb-error/5"
                  onClick={() => handleCancelRsvp(rsvp.id)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </article>
        ))}

        {groupedRsvps.cancelledRsvps.map((rsvp) => (
          <article
            className="rounded-xl border border-pb-driftwood/15 bg-pb-cream/30 p-4 opacity-70"
            key={rsvp.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-pb-ocean">{getRsvpDateLabel(rsvp.eventDate)}</p>
                <p className="text-sm text-pb-ink">
                  Bringing <span className="font-medium">{rsvp.food || "Undecided"}</span>
                </p>
                <p className="text-xs text-pb-driftwood">
                  Allergies: {rsvp.allergies || "None"}
                </p>
                {rsvp.eventTheme ? (
                  <p className="text-xs text-pb-driftwood">Theme: {rsvp.eventTheme}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-pb-driftwood/20 px-3 py-1 text-xs font-medium text-pb-driftwood">
                Cancelled
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="surface-card space-y-4 p-6">
        <h2 className="text-xl font-semibold text-pb-ocean">Your Uploads</h2>

        {isLoadingMedia ? <p className="text-sm text-pb-driftwood">Loading uploads...</p> : null}
        {mediaError ? <p className="text-sm text-pb-error">{mediaError}</p> : null}

        {!isLoadingMedia && mediaItems.length === 0 ? (
          <p className="text-sm text-pb-driftwood">You haven&apos;t uploaded any photos or videos yet.</p>
        ) : null}

        {mediaItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mediaItems.map((item) => {
              const itemId = item._id || item.id;
              const thumbnailUrl = item.thumbnailUrl || item.cloudinaryUrl;
              const isVideo = item.mediaType === "video";
              return (
                <button
                  className="group relative aspect-square overflow-hidden rounded-xl bg-pb-sand"
                  key={itemId}
                  onClick={() => setActiveMedia(item)}
                  type="button"
                >
                  <img
                    alt="Uploaded media thumbnail"
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    src={thumbnailUrl}
                  />

                  {isVideo ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/55 p-2 text-white">
                        <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6 4.5a1 1 0 0 1 1.53-.847l7 4.5a1 1 0 0 1 0 1.694l-7 4.5A1 1 0 0 1 6 13.5v-9Z" />
                        </svg>
                      </span>
                    </span>
                  ) : null}

                  <span
                    aria-label="Delete media"
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1.5 text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteMedia(itemId);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleDeleteMedia(itemId);
                      }
                    }}
                  >
                    {deletingMediaId === itemId ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <EditRSVPModal
        onCancel={editingRsvp ? () => handleCancelRsvp(editingRsvp.id) : undefined}
        onClose={() => setEditingRsvp(null)}
        onSave={handleSaveRsvpEdits}
        rsvp={editingRsvp}
      />

      <GalleryModal media={activeMedia} onClose={() => setActiveMedia(null)} />
    </main>
  );
};

export default Profile;
