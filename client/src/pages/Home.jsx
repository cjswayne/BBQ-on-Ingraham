import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../api/client.js";
import AdminPasswordGate from "../components/AdminPasswordGate.jsx";
import { EditRSVPModal } from "../components/EditRSVPModal.jsx";
import { RSVPFormUnified } from "../components/RSVPFormUnified.jsx";
import { RSVPCard } from "../components/RSVPCard.jsx";
import { ThemePoll } from "../components/ThemePoll.jsx";
import { VideoHero } from "../components/VideoHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAdminMode } from "../hooks/useAdminMode.js";
import { formatEventDateLabel } from "../utils/date.js";

const AVATAR_COLORS = [
  "#FF4136",
  "#0074D9",
  "#2ECC40",
  "#FFDC00",
  "#B10DC9",
  "#FF851B",
  "#111111",
  "#F012BE",
  "#39CCCC",
  "#85144b",
];

// Hash a name to an index into AVATAR_COLORS
const hashNameToIndex = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
};

// Assign colors so no two adjacent RSVPs share the same color
const assignAvatarColors = (rsvps = []) => {
  const colors = [];
  for (let i = 0; i < rsvps.length; i++) {
    let idx = hashNameToIndex(rsvps[i].attendeeName);
    // Shift forward until we find a color that differs from the previous
    let attempts = 0;
    while (attempts < AVATAR_COLORS.length && i > 0 && AVATAR_COLORS[idx] === colors[i - 1]) {
      idx = (idx + 1) % AVATAR_COLORS.length;
      attempts++;
    }
    colors.push(AVATAR_COLORS[idx]);
  }
  return colors;
};

// No API key required — uses the legacy embed format Google still supports
// z controls zoom level — lower number = more zoomed out (15 = street, 13 = neighborhood)
const MAP_EMBED_URL =
  "https://maps.google.com/maps?q=4262+Ingraham+St,+San+Diego,+CA+92109&output=embed&z=13";

// Hero text overlay content — uses inherited color from VideoHero scroll transition
const HeroContent = ({ eventDate }) => {
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Derive whether the next event is within 7 days using the API-provided date
  const isWithinWeek = (() => {
    if (!eventDate) return false;
    const dateStr = typeof eventDate === "string" ? eventDate.slice(0, 10) : new Date(eventDate).toISOString().slice(0, 10);
    const [y, m, d] = dateStr.split("-").map(Number);
    const eventDay = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((eventDay - today) / 86400000) <= 7;
  })();

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsMapOpen(false);
    };
    if (isMapOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMapOpen]);

  return (
    <>

      <h1 className="mt-2 text-2xl font-medium leading-tight sm:text-3xl text">Apartment potluck</h1>
      <p className="mt-1 max-w-xl text-sm font-normal leading-6 opacity-80 sm:text-base">
        Big Green Egg cookouts with great food and good neighbors.
      </p>

      <div className="mt-5 flex flex-col gap-3.5 text-sm">
        {/* Date row */}
        <div className="flex items-start gap-3 text-start">
          <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
            <path d="M16 3v4" />
            <path d="M8 3v4" />
            <path d="M4 11h16" />
            <path d="M9 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
          </svg>
          <div>
            <p className="font-medium leading-none">1st &amp; 3rd Mondays</p>
            <p className="mt-1 text-xs opacity-70">8–11pm</p>
          </div>
        </div>

        {/* Location row */}
        <div className="flex items-start gap-3 text-start">
          <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-none">4262 Ingraham St</p>
            <p className="mt-1 inline-flex flex-wrap items-center gap-x-1 text-xs opacity-70">
              San Diego, CA 92109
              <button
                aria-label="View on map"
                className="inline-flex items-center justify-center rounded-full opacity-70 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
                onClick={() => setIsMapOpen(true)}
                type="button"
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="17" fill="currentColor" r="0.5" stroke="none" />
                </svg>
              </button>
              ·
              <a
                className="underline underline-offset-2 transition-opacity hover:opacity-100"
                href="https://www.google.com/maps/dir/?api=1&destination=4262+Ingraham+St,+San+Diego,+CA+92109"
                rel="noopener noreferrer"
                target="_blank"
              >
                Directions
              </a>
            </p>
          </div>
        </div>

        {/* Bring a dish row */}
        <div className="flex items-start gap-3 text-start">
          <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12zm0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />
          </svg>
          <div>
            <p className="font-medium leading-none">Bring a dish & a chair!</p>
            <p className="mt-1 text-xs opacity-70">Themed each week — vote below</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3">
        {/* Ping ring pulses behind the button to draw attention */}
        <span className="relative inline-flex">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-pb-palm opacity-40 [animation-duration:3s]"
          />
          <a
            className="relative flex w-full items-center justify-center gap-2 rounded-full bg-pb-palm px-4 py-3.5 text-sm font-medium text-white transition hover:brightness-105"
            href="#rsvp"
          >
            {isWithinWeek ? "RSVP for next Monday" : "RSVP"}
            <svg aria-hidden="true" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 12l14 0" />
              <path d="M13 18l6 -6" />
              <path d="M13 6l6 6" />
            </svg>
          </a>
        </span>
        <div>
          <a
            className="inline-flex items-center gap-1 text-sm opacity-60 transition hover:opacity-90"
            href="#poll"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 3c1.918 0 3.52 1.35 3.91 3.151a4 4 0 0 1 2.09 7.723l0 7.126h-12v-7.126a4 4 0 1 1 2.092 -7.723a4 4 0 0 1 3.908 -3.151z" />
              <path d="M8 21v-7.5" />
              <path d="M12 21v-7.5" />
              <path d="M16 21v-7.5" />
            </svg>
            Vote for this week&apos;s theme
          </a>
        </div>
      </div>

      {/* Map modal — backdrop click closes, Escape key closes */}
      {isMapOpen && (
        <div
          aria-label="Location map"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsMapOpen(false)}
          role="dialog"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-pb-ocean">4262 Ingraham St, San Diego, CA 92109</p>
              <button
                aria-label="Close map"
                className="rounded-full p-1 text-pb-driftwood transition hover:bg-pb-sand/40"
                onClick={() => setIsMapOpen(false)}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <iframe
              allowFullScreen
              className="h-72 w-full border-0 sm:h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={MAP_EMBED_URL}
              title="BBQ On Ingraham location"
            />
          </div>
        </div>
      )}
    </>
  );
};

const Home = () => {
  const [eventData, setEventData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingRsvp, setEditingRsvp] = useState(null);
  const adminMode = useAdminMode();
  const { isAuthenticated, user } = useAuth();

  const loadEvent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.getNextEvent();
      setEventData(response);
    } catch (error) {
      console.error("Failed to load event", error);
      setErrorMessage(error.message || "Unable to load the RSVP list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  /**
   * Submits a new RSVP and refreshes event data.
   * @param {object} body - RSVP payload from form.
   * @returns {Promise<object>} API response payload from RSVP creation.
   */
  const handleSubmit = async (body) => {
    const response = await apiClient.createRsvp(body);
    await loadEvent();
    return response;
  };

  /**
   * Persists RSVP edits and refreshes the event list.
   * @param {{ food: string, allergies: string, guestCount: number }} body - RSVP update payload.
   * @returns {Promise<void>} Completes when update flow finishes.
   */
  const handleEditSave = async (body) => {
    if (!editingRsvp?.id) {
      return;
    }

    try {
      await apiClient.updateRsvp(editingRsvp.id, body);
      await loadEvent();
      setEditingRsvp(null);
    } catch (error) {
      console.error("Failed to save RSVP edits", error);
      throw error;
    }
  };

  /**
   * Cancels an RSVP and refreshes the event list.
   * @param {string} rsvpId - RSVP id to cancel.
   * @returns {Promise<void>} Completes when cancellation flow finishes.
   */
  const handleEditCancel = async (rsvpId) => {
    try {
      await apiClient.cancelRsvp(rsvpId);
      await loadEvent();
      setEditingRsvp(null);
    } catch (error) {
      console.error("Failed to cancel RSVP", error);
      throw error;
    }
  };

  const handleThemeRefresh = async (action, payload) => {
    if (action === "suggestion") {
      await apiClient.addPollSuggestion(payload.eventId, payload.suggestion);
    }

    if (action === "vote") {
      await apiClient.togglePollVote(payload.eventId, payload.optionId);
    }

    await loadEvent();
  };

  const handleAdminDeleteRsvp = async (rsvpId) => {
    try {
      await apiClient.adminCancelRsvp(rsvpId);
      await loadEvent();
    } catch (error) {
      console.error("Admin failed to cancel RSVP", error);
    }
  };

  const handleAdminDeletePollOption = async (optionId) => {
    try {
      await apiClient.adminDeletePollOption(optionId);
      await loadEvent();
    } catch (error) {
      console.error("Admin failed to delete poll option", error);
    }
  };

  const handleAdminSetTheme = async (theme) => {
    try {
      await apiClient.adminSetTheme(eventData?.event?.id, theme);
      await loadEvent();
    } catch (error) {
      console.error("Admin failed to set theme", error);
    }
  };

  const handleAdminToggleCancelled = async () => {
    const next = !eventData?.event?.cancelled;
    try {
      await apiClient.adminSetEventCancelled(eventData?.event?.id, next);
      await loadEvent();
    } catch (error) {
      console.error("Admin failed to toggle event cancelled status", error);
    }
  };

  // If admin mode is active but not yet authenticated, show the password gate
  if (adminMode.isAdmin && !adminMode.isAuthenticated) {
    return (
      <>
        <VideoHero>
          <HeroContent eventDate={eventData?.event?.date} />
        </VideoHero>
        <div className="relative z-10 mx-auto max-w-md px-4 py-10">
          <AdminPasswordGate onAuthenticated={adminMode.handleAuthenticated} />
        </div>
      </>
    );
  }

  return (
    <>
      <VideoHero>
        <HeroContent eventDate={eventData?.event?.date} />
      </VideoHero>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        {adminMode.isAuthenticated && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-pb-palm/30 bg-pb-palm/5 px-4 py-3 text-sm text-pb-palm">
            <span>Admin mode active — you can manage RSVPs, poll options, and set the theme.</span>
            <button
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                eventData?.event?.cancelled
                  ? "border-pb-palm/40 text-pb-palm hover:bg-pb-palm/10"
                  : "border-pb-error/40 text-pb-error hover:bg-pb-error/5"
              }`}
              onClick={handleAdminToggleCancelled}
              type="button"
            >
              {eventData?.event?.cancelled ? "Uncancel event" : "Cancel event"}
            </button>
          </div>
        )}


        {/* Hero info rendered as a standard surface-card in the content flow */}
        <section className="surface-card overflow-hidden text-center">
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <HeroContent eventDate={eventData?.event?.date} />
          </div>
        </section>
        {eventData?.event?.cancelled && (
          <section className="rounded-lg border border-pb-error/30 bg-pb-error/5 px-5 py-5 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-pb-error">
              Event Cancelled
            </p>
            <p className="mt-2 text-lg font-medium text-pb-ocean">
              BBQ is not happening on {formatEventDateLabel(eventData?.event?.date)}
            </p>
            <p className="mt-1 text-sm text-pb-driftwood">Check back next week.</p>
          </section>
        )}

        <section className="surface-card overflow-hidden">
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-8">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
                Next event
              </h2>
              <p className="mt-2 text-lg font-medium text-pb-ocean">
                {formatEventDateLabel(eventData?.event?.date)}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
                People coming
              </h2>
              <p className="mt-2 text-lg font-medium text-pb-ocean">
                {eventData?.rsvps?.length || 0} cool neighbors attending
              </p>
            </div>
          </div>
        </section>

        <ThemePoll
          cancelled={eventData?.event?.cancelled ?? false}
          eventId={eventData?.event?.id}
          isAdmin={adminMode.isAuthenticated}
          onAdminDeleteOption={handleAdminDeletePollOption}
          onAdminSetTheme={handleAdminSetTheme}
          onRefresh={handleThemeRefresh}
          options={eventData?.pollOptions || []}
          theme={eventData?.event?.theme}
        />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-card overflow-hidden">
            <div className="border-b border-pb-driftwood/10 px-5 py-4">
              <h2 className="text-xl font-semibold text-pb-ocean">
                Who is coming
              </h2>
            </div>

            {isLoading ? (
              <p className="px-5 py-4 text-sm text-pb-driftwood">
                Loading RSVP list...
              </p>
            ) : null}

            {errorMessage ? (
              <p className="px-5 py-4 text-sm text-pb-error">{errorMessage}</p>
            ) : null}

            {!isLoading && !errorMessage && !(eventData?.rsvps?.length > 0) ? (
              <p className="px-5 py-4 text-sm text-pb-driftwood">
                No one has RSVP'd yet. You can be the first.
              </p>
            ) : null}

            {(() => {
              const avatarColors = assignAvatarColors(eventData?.rsvps ?? []);
              return eventData?.rsvps?.map((rsvp, index) => {
                const isOwner = Boolean(isAuthenticated && user?.id && rsvp.userId === user.id);

                return (
                  <div
                    className={index > 0 ? "border-t border-pb-driftwood/10" : ""}
                    key={rsvp.id}
                  >
                    <RSVPCard
                      avatarColor={avatarColors[index]}
                      isAdmin={adminMode.isAuthenticated}
                      isOwner={isOwner}
                      onEdit={() => setEditingRsvp(rsvp)}
                      onAdminDelete={() => handleAdminDeleteRsvp(rsvp.id)}
                      rsvp={rsvp}
                    />
                  </div>
                );
              });
            })()}
          </div>

          <div className="space-y-4">
            <RSVPFormUnified
              cancelled={eventData?.event?.cancelled ?? false}
              eventDate={eventData?.event?.date}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>

      <EditRSVPModal
        onCancel={handleEditCancel}
        onClose={() => setEditingRsvp(null)}
        onSave={handleEditSave}
        rsvp={editingRsvp}
      />
    </>
  );
};

export default Home;
