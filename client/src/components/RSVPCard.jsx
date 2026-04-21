import { formatEventDateLabel } from "../utils/date.js";

export const RSVPCard = ({ rsvp, eventDate }) => {
  return (
    <article className="surface-card flex items-start gap-4 p-4">
      {rsvp.profilePhotoUrl ? (
        <img
          alt={`${rsvp.attendeeName} profile`}
          className="h-14 w-14 rounded-full object-cover"
          src={rsvp.profilePhotoUrl}
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pb-seafoam font-semibold text-white">
          {rsvp.attendeeName?.slice(0, 1).toUpperCase() || "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-pb-ocean">
            {rsvp.attendeeName}
          </h3>
          {rsvp.isGuest ? (
            <span className="rounded-full bg-pb-lavender/40 px-2 py-1 text-xs font-medium text-pb-grape">
              Guest RSVP
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-pb-ink">
          Bringing <strong>{rsvp.food}</strong>
        </p>
        <p className="mt-1 text-xs text-pb-driftwood">
          {rsvp.guestCount} attending on {formatEventDateLabel(eventDate)}
        </p>
      </div>
    </article>
  );
};
