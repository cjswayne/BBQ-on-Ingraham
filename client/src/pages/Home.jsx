import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../api/client.js";
import { GuestRSVPForm } from "../components/GuestRSVPForm.jsx";
import { RSVPCard } from "../components/RSVPCard.jsx";
import { ThemePoll } from "../components/ThemePoll.jsx";
import { formatEventDateLabel } from "../utils/date.js";

const Home = () => {
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

  const handleSubmit = async (body) => {
    const response = await apiClient.createRsvp(body);
    await loadEvent();
    return response;
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
        <div className="bg-pb-ocean px-5 py-8 text-white sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
            Apartment cookout
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            BBQ On Ingraham
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-normal leading-6 text-white/90 sm:text-base">
            Feast on delicious food and fantastic company
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              className="rounded-full bg-pb-palm px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
              href="#rsvp"
            >
              RSVP
            </a>
            <a
              className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              href="#poll"
            >
              Vote for this week&apos;s theme
            </a>
          </div>
        </div>
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
              {eventData?.rsvps?.length || 0} spots claimed
            </p>
          </div>
        </div>
      </section>

      <ThemePoll
        eventId={eventData?.event?.id}
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

          {eventData?.rsvps?.map((rsvp, index) => (
            <div
              className={index > 0 ? "border-t border-pb-driftwood/10" : ""}
              key={rsvp.id}
            >
              <RSVPCard rsvp={rsvp} />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <GuestRSVPForm onSubmit={handleSubmit} />
        </div>
      </section>
    </main>
  );
};

export default Home;
