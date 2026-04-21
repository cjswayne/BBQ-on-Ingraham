// Deterministic color from name so the same person always gets the same avatar color
const AVATAR_COLORS = [
  "#5A5F63", // ocean
  "#5E7F57", // palm
  "#D1492E", // coral
  "#5F4C83", // grape
  "#7A4E2D", // driftwood
  "#8C2F1C", // neon
  "#8B8F7A", // seafoam
];

const getAvatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const RSVPCard = ({ rsvp }) => {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {rsvp.profilePhotoUrl ? (
        <img
          alt={`${rsvp.attendeeName} profile`}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
          src={rsvp.profilePhotoUrl}
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-white"
          style={{ backgroundColor: getAvatarColor(rsvp.attendeeName) }}
        >
          {rsvp.attendeeName?.slice(0, 1).toUpperCase() || "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-pb-ocean">
          {rsvp.attendeeName}
        </p>
        <p className="truncate text-sm font-normal text-pb-ink">
          Bringing <span className="font-medium">{rsvp.food}</span>
        </p>
      </div>

      {rsvp.guestCount > 1 ? (
        <span className="shrink-0 rounded-full bg-pb-sand/60 px-2 py-1 text-xs font-medium text-pb-driftwood">
          +{rsvp.guestCount - 1}
        </span>
      ) : null}
    </div>
  );
};
