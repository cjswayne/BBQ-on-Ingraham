import { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient } from "../api/client.js";
import { GuestRSVPForm } from "../components/GuestRSVPForm.jsx";
import { RSVPCard } from "../components/RSVPCard.jsx";
import { RSVPForm } from "../components/RSVPForm.jsx";
import { ThemePoll } from "../components/ThemePoll.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatEventDateLabel } from "../utils/date.js";

const Home = ({ onOpenLogin }) => {
  const { isAuthenticated, refreshUser, user } = useAuth();
  const [eventData, setEventData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadEvent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.getNextEvent();
      setEventData(response);
    } catch (error) {
      setErrorMessage(error.message || "Unable to load the RSVP list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const ownRsvp = useMemo(() => {
    if (!user || !eventData?.rsvps) {
      return null;
    }

    return eventData.rsvps.find((rsvp) => rsvp.phone === user.phone) || null;
  }, [eventData?.rsvps, user]);

  const handleSubmit = async (body) => {
    const response = await apiClient.createRsvp(body);

    if (isAuthenticated) {
      await refreshUser();
    }

    await loadEvent();
    return response;
  };

  const handleCancel = async () => {
    if (!ownRsvp) {
      return;
    }

    await apiClient.cancelRsvp(ownRsvp.id);
    await loadEvent();
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <section className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-pb-ocean via-pb-seafoam to-pb-lavender px-5 py-8 text-white sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
            Apartment cookout
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            BBQ On Ingraham
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
            See who is coming, what food is already covered, and add your RSVP in
            under a minute.
          </p>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-3 sm:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
              Next event
            </p>
            <p className="mt-2 text-lg font-semibold text-pb-ocean">
              {formatEventDateLabel(eventData?.event?.date)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
              RSVP count
            </p>
            <p className="mt-2 text-lg font-semibold text-pb-ocean">
              {eventData?.rsvps?.length || 0} spots claimed
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
              Login option
            </p>
            <p className="mt-2 text-sm text-pb-ink">
              Use SMS login if you want auto-fill and cancel/edit later.
            </p>
          </div>
        </div>
      </section>

      <ThemePoll
        eventId={eventData?.event?.id}
        isAuthenticated={isAuthenticated}
        onOpenLogin={onOpenLogin}
        onRefresh={handleThemeRefresh}
        options={eventData?.pollOptions || []}
        theme={eventData?.event?.theme}
        themePollActive={eventData?.event?.themePollActive}
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-pb-ocean">
              Who is coming
            </h2>
            {!isAuthenticated ? (
              <button
                className="rounded-full border border-pb-ocean/20 bg-white px-4 py-2 text-sm font-medium text-pb-ocean"
                onClick={onOpenLogin}
                type="button"
              >
                Login to RSVP
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="surface-card p-5">
              <p className="text-sm text-pb-driftwood">Loading RSVP list...</p>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="surface-card p-5">
              <p className="text-sm text-pb-error">{errorMessage}</p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && !(eventData?.rsvps?.length > 0) ? (
            <div className="surface-card p-5">
              <p className="text-sm text-pb-driftwood">
                No one has RSVP’d yet. You can be the first.
              </p>
            </div>
          ) : null}

          {eventData?.rsvps?.map((rsvp) => (
            <RSVPCard eventDate={eventData?.event?.date} key={rsvp.id} rsvp={rsvp} />
          ))}
        </div>

        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              <RSVPForm
                existingRsvp={ownRsvp}
                initialName={user?.name}
                initialPhotoUrl={user?.profilePhotoUrl}
                onSubmit={handleSubmit}
              />
              {ownRsvp ? (
                <button
                  className="w-full rounded-full border border-pb-error/20 bg-white px-4 py-3 text-sm font-semibold text-pb-error"
                  onClick={handleCancel}
                  type="button"
                >
                  Cancel my RSVP
                </button>
              ) : null}
            </>
          ) : (
            <>
              <div className="surface-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-pb-ocean">
                    Login for the full experience
                  </h2>
                  <p className="mt-1 text-sm text-pb-driftwood">
                    Save your name and photo to your phone number, then come back
                    later to update or cancel.
                  </p>
                </div>
                <button
                  className="w-full rounded-full bg-pb-ocean px-4 py-3 text-sm font-semibold text-white"
                  onClick={onOpenLogin}
                  type="button"
                >
                  Login with phone
                </button>
              </div>
              <GuestRSVPForm onSubmit={handleSubmit} />
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default Home;
