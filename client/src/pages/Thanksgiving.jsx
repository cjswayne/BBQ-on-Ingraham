import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../api/client.js";
import AdminPasswordGate from "../components/AdminPasswordGate.jsx";
import { EditRSVPModal } from "../components/EditRSVPModal.jsx";
import { RSVPCard } from "../components/RSVPCard.jsx";
import { RSVPFormUnified } from "../components/RSVPFormUnified.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAdminMode } from "../hooks/useAdminMode.js";
import { assignAvatarColors } from "./Home.jsx";
import "./thanksgiving-theme.css";

const EVENT_SLUG = "thanksgiving";
// Classic dishes guests can claim. A dish drops off the list once someone RSVPs with it.
const THANKSGIVING_DISHES = [
  "Turkey",
  "Ham",
  "Stuffing",
  "Mashed potatoes",
  "Gravy",
  "Cranberry sauce",
  "Green bean casserole",
  "Sweet potato casserole",
  "Mac and cheese",
  "Dinner rolls",
  "Corn",
  "Salad",
  "Deviled eggs",
  "Pumpkin pie",
  "Apple pie",
  "Pecan pie",
  "Game day snacks",
  "Wine",
  "Apple cider"
];

/**
 * Lists the dishes nobody has claimed yet.
 * @param {Array<{ food?: string }>} rsvps - Current RSVPs for the event.
 * @returns {string[]} Unclaimed dishes, in list order.
 */
const getUnclaimedDishes = (rsvps = []) => {
  const claimed = new Set(rsvps.map((rsvp) => String(rsvp.food || "").trim().toLowerCase()).filter(Boolean));
  return THANKSGIVING_DISHES.filter((dish) => !claimed.has(dish.toLowerCase()));
};
// Fall avatar tints for guests without a profile photo
const FALL_AVATAR_COLORS = ["#C2571A", "#8C2F1C", "#D9A441", "#6B3A1F", "#A67C3D", "#B5381F", "#7A5C2E", "#E07B39"];
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=4262+Ingraham+St,+San+Diego,+CA+92109";

// Autumn palette for this page only (the rest of the site keeps the BBQ palette)
const FALL = {
  pumpkin: "#C2571A",
  cranberry: "#8C2F1C",
  gold: "#D9A441",
  bark: "#4A2E1B",
  cream: "#FBF3E4"
};

// Simple maple leaf used as decoration in the hero
const Leaf = ({ className = "", color = FALL.pumpkin, style }) => (
  <svg aria-hidden="true" className={className} style={style} viewBox="0 0 24 24">
    <path
      d="M12 2l1.6 3.6 2.9-1.1-.6 3.4 3.6-.4-1.9 2.9 3.4 1.6-3.6 1.4 1.2 3.2-3.5-.9-.6 3.3-2.5-2.4V22h-.8v-5.4l-2.5 2.4-.6-3.3-3.5.9 1.2-3.2L2.6 12l3.4-1.6-1.9-2.9 3.6.4-.6-3.4 2.9 1.1z"
      fill={color}
    />
  </svg>
);

const InfoRow = ({ icon, title, children }) => (
  <div className="flex items-start gap-3 text-start">
    <span className="mt-0.5 shrink-0" style={{ color: FALL.pumpkin }}>
      {icon}
    </span>
    <div>
      <p className="font-medium leading-none" style={{ color: FALL.bark }}>
        {title}
      </p>
      {children}
    </div>
  </div>
);

const CalendarIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M4 11h16" />
  </svg>
);

const PinIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
  </svg>
);

const TvIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -9z" />
    <path d="M16 3l-4 4l-4 -4" />
  </svg>
);

const DishIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12zm0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />
  </svg>
);

const ThanksgivingHero = ({ cancelled }) => {
  return (
    <section
      className="relative overflow-hidden rounded-[1.25rem] border shadow-xl"
      style={{
        background: `linear-gradient(135deg, ${FALL.cream} 0%, #F6E2C2 55%, #F0CFA0 100%)`,
        borderColor: `${FALL.pumpkin}33`
      }}
    >
      <Leaf className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 opacity-20" color={FALL.cranberry} style={{ transform: "rotate(18deg)" }} />
      <Leaf className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 opacity-20" color={FALL.gold} style={{ transform: "rotate(-24deg)" }} />
      <Leaf className="pointer-events-none absolute right-16 bottom-6 h-10 w-10 opacity-30" color={FALL.pumpkin} style={{ transform: "rotate(40deg)" }} />

      <div className="relative px-6 py-8 text-center sm:px-10 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: FALL.pumpkin }}>
          A special holiday potluck
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: FALL.cranberry }}>
          Thanksgiving on Ingraham
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 sm:text-base" style={{ color: FALL.bark }}>
          Gather round for a neighborhood Thanksgiving feast, then stick around to watch the
          Chiefs take on the Bills together. Bring a dish to share and pull up a chair.
        </p>

        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3.5 text-sm">
          <InfoRow icon={<CalendarIcon />} title="Thursday, November 26">
            <p className="mt-1 text-xs opacity-75" style={{ color: FALL.bark }}>
              Starts at 5pm
            </p>
          </InfoRow>
          <InfoRow icon={<TvIcon />} title="Chiefs vs. Bills watch party">
            <p className="mt-1 text-xs opacity-75" style={{ color: FALL.bark }}>
              Kickoff 5:20pm on NBC. Wear your red and gold!
            </p>
          </InfoRow>
          <InfoRow icon={<PinIcon />} title="4262 Ingraham St">
            <p className="mt-1 text-xs opacity-75" style={{ color: FALL.bark }}>
              San Diego, CA 92109 ·{" "}
              <a className="underline underline-offset-2" href={DIRECTIONS_URL} rel="noopener noreferrer" target="_blank">
                Directions
              </a>
            </p>
          </InfoRow>
          <InfoRow icon={<DishIcon />} title="Bring a dish & a chair!">
            <p className="mt-1 text-xs opacity-75" style={{ color: FALL.bark }}>
              Mains, sides, desserts and drinks all welcome
            </p>
          </InfoRow>
        </div>

        {!cancelled ? (
          <a
            className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium text-white shadow transition hover:brightness-110"
            href="#rsvp"
            style={{ backgroundColor: FALL.pumpkin }}
          >
            RSVP for Thanksgiving
          </a>
        ) : null}
      </div>
    </section>
  );
};

const Thanksgiving = () => {
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
      const response = await apiClient.getSpecialEvent(EVENT_SLUG);
      setEventData(response);
    } catch (error) {
      console.error("Failed to load Thanksgiving event", error);
      setErrorMessage(error.message || "Unable to load the RSVP list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Thanksgiving on Ingraham";
    loadEvent();
  }, [loadEvent]);

  // Theme the whole page (header, cards, form, footer) while this route is open
  useEffect(() => {
    const previousTitle = document.title;
    document.body.classList.add("thanksgiving-theme");
    return () => {
      document.body.classList.remove("thanksgiving-theme");
      document.title = previousTitle === "Thanksgiving on Ingraham" ? "BBQ On Ingraham" : previousTitle;
    };
  }, []);

  const handleSubmit = async (body) => {
    const response = await apiClient.createRsvp(body);
    await loadEvent();
    return response;
  };

  const handleEditSave = async (body) => {
    if (!editingRsvp?.id) {
      return;
    }

    await apiClient.updateRsvp(editingRsvp.id, body);
    await loadEvent();
    setEditingRsvp(null);
  };

  const handleEditCancel = async (rsvpId) => {
    await apiClient.cancelRsvp(rsvpId);
    await loadEvent();
    setEditingRsvp(null);
  };

  const handleAdminDeleteRsvp = async (rsvpId) => {
    try {
      await apiClient.adminCancelRsvp(rsvpId);
      await loadEvent();
    } catch (error) {
      console.error("Admin failed to cancel RSVP", error);
    }
  };

  const handleAdminToggleCancelled = async () => {
    try {
      await apiClient.adminSetEventCancelled(eventData?.event?.id, !eventData?.event?.cancelled);
      await loadEvent();
    } catch (error) {
      console.error("Admin failed to toggle event cancelled status", error);
    }
  };

  const cancelled = eventData?.event?.cancelled ?? false;
  const rsvps = eventData?.rsvps ?? [];
  const headcount = rsvps.reduce((total, rsvp) => total + (rsvp.guestCount || 1), 0);
  const unclaimedDishes = getUnclaimedDishes(rsvps);

  if (adminMode.isAdmin && !adminMode.isAuthenticated) {
    return (
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <ThanksgivingHero cancelled={cancelled} />
        <div className="mx-auto w-full max-w-md">
          <AdminPasswordGate onAuthenticated={adminMode.handleAuthenticated} />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        {adminMode.isAuthenticated && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-pb-palm/30 bg-pb-palm/5 px-4 py-3 text-sm text-pb-palm">
            <span>Admin mode active. You can manage Thanksgiving RSVPs.</span>
            <button
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                cancelled
                  ? "border-pb-palm/40 text-pb-palm hover:bg-pb-palm/10"
                  : "border-pb-error/40 text-pb-error hover:bg-pb-error/5"
              }`}
              onClick={handleAdminToggleCancelled}
              type="button"
            >
              {cancelled ? "Uncancel event" : "Cancel event"}
            </button>
          </div>
        )}

        <ThanksgivingHero cancelled={cancelled} />

        {cancelled && (
          <section className="rounded-lg border border-pb-error/30 bg-pb-error/5 px-5 py-5 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-pb-error">Event Cancelled</p>
            <p className="mt-2 text-lg font-medium text-pb-ocean">Thanksgiving on Ingraham is not happening this year.</p>
          </section>
        )}

        <section className="surface-card overflow-hidden">
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-8">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">When</h2>
              <p className="mt-2 text-lg font-medium" style={{ color: FALL.cranberry }}>
                Thursday, November 26 at 5pm
              </p>
            </div>
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">People coming</h2>
              <p className="mt-2 text-lg font-medium" style={{ color: FALL.cranberry }}>
                {headcount} {headcount === 1 ? "neighbor" : "neighbors"} at the table
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-card overflow-hidden">
            <div className="border-b border-pb-driftwood/10 px-5 py-4">
              <h2 className="text-xl font-semibold" style={{ color: FALL.cranberry }}>
                Who is coming
              </h2>
            </div>

            {isLoading && !eventData ? (
              <p className="px-5 py-4 text-sm text-pb-driftwood">Loading RSVP list...</p>
            ) : null}

            {errorMessage ? <p className="px-5 py-4 text-sm text-pb-error">{errorMessage}</p> : null}

            {!isLoading && !errorMessage && rsvps.length === 0 ? (
              <p className="px-5 py-4 text-sm text-pb-driftwood">No one has RSVP'd yet. Claim the first seat at the table.</p>
            ) : null}

            {(() => {
              const avatarColors = assignAvatarColors(rsvps, FALL_AVATAR_COLORS);
              return rsvps.map((rsvp, index) => {
                const isOwner = Boolean(isAuthenticated && user?.id && rsvp.userId === user.id);

                return (
                  <div className={index > 0 ? "border-t border-pb-driftwood/10" : ""} key={rsvp.id}>
                    <RSVPCard
                      avatarColor={avatarColors[index]}
                      isAdmin={adminMode.isAuthenticated}
                      isOwner={isOwner}
                      onAdminDelete={() => handleAdminDeleteRsvp(rsvp.id)}
                      onEdit={() => setEditingRsvp(rsvp)}
                      rsvp={rsvp}
                    />
                  </div>
                );
              });
            })()}
          </div>

          <div className="space-y-4">
            <RSVPFormUnified
              cancelled={cancelled}
              eventSlug={EVENT_SLUG}
              foodCategories={unclaimedDishes}
              foodPlaceholder="Pick a dish below or type your own"
              onSubmit={handleSubmit}
              submitLabel="RSVP for Thanksgiving"
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

export default Thanksgiving;
