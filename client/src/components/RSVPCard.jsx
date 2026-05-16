import logo from "../assets/bbqoningraham-logo.png";

// Deterministic color from name so the same person always gets the same avatar color
const AVATAR_COLORS = [
  "#FF4136", // bright red
  "#0074D9", // vivid blue
  "#2ECC40", // bright green
  "#FFDC00", // yellow
  "#B10DC9", // intense purple
  "#FF851B", // strong orange
  "#111111", // black
  "#F012BE", // magenta
  "#39CCCC", // cyan
  "#85144b", // deep maroon
];

const getAvatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const RSVPCard = ({ isAdmin = false, onAdminDelete, rsvp }) => {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {rsvp.profilePhotoUrl ? (
        <img
          alt={`${rsvp.attendeeName} profile`}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
          src={rsvp.profilePhotoUrl}
        />
      ) : (
        // Grayscale image with a color overlay using mix-blend-mode:color to tint without a solid background
        <div
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full"
          style={{ isolation: "isolate" }}
        >
          <img
            alt=""
            className="h-full w-full object-contain p-1.5"
            src={logo} 
            style={{ filter: "grayscale(1)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: getAvatarColor(rsvp.attendeeName),
              mixBlendMode: "color",
            }}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-pb-ocean">
          {rsvp.attendeeName}
        </p>
        <p className="text-sm font-normal text-pb-ink">
          Bringing <span className="font-medium">{rsvp.food}</span>
        </p>
        {isAdmin && rsvp.allergies ? (
          <p className="text-xs text-pb-driftwood">
            Allergies: {rsvp.allergies}
          </p>
        ) : null}
      </div>

      {rsvp.guestCount > 1 ? (
        <span className="shrink-0 rounded-full bg-pb-sand/60 px-2 py-1 text-xs font-medium text-pb-driftwood">
          +{rsvp.guestCount - 1}
        </span>
      ) : null}

      {isAdmin && (
        <button
          className="shrink-0 rounded-full border border-pb-error/30 px-3 py-1.5 text-xs font-medium text-pb-error hover:bg-pb-error/5"
          onClick={onAdminDelete}
          type="button"
        >
          Remove
        </button>
      )}
    </div>
  );
};
