import logo from "../assets/bbqoningraham-logo.png";

/**
 * Renders one RSVP row with owner/admin actions.
 * @param {object} props - Component props.
 * @param {string} props.avatarColor - Color overlay for default avatar.
 * @param {boolean} [props.isAdmin=false] - Whether admin mode is active.
 * @param {boolean} [props.isOwner=false] - Whether current user owns this RSVP.
 * @param {(rsvp: object) => void} [props.onEdit] - Owner edit action callback.
 * @param {() => void} [props.onAdminDelete] - Admin remove action callback.
 * @param {object} props.rsvp - RSVP payload for the attendee row.
 * @returns {JSX.Element} Rendered RSVP card row.
 */
export const RSVPCard = ({ avatarColor, isAdmin = false, isOwner = false, onAdminDelete, onEdit, rsvp }) => {
  const showEditButton = isOwner;
  const showAdminRemoveButton = isAdmin && !isOwner && typeof onAdminDelete === "function";

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
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full"
          style={{ isolation: "isolate" }}
        >
          <img
            alt=""
            className="h-full w-full object-contain p-1"
            src={logo}
            style={{ filter: "grayscale(1)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: avatarColor,
              mixBlendMode: "color",
            }}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-pb-ocean">
          {rsvp.attendeeName}
          {rsvp.isNeighbor ? (
            <span className="relative ml-2 inline-flex items-center overflow-hidden rounded-full bg-pb-palm/10 px-2 py-0.5 text-xs font-medium text-pb-palm">
              Neighbor
              <span
                aria-hidden="true"
                className="neighbor-badge-shimmer absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  transform: "translateX(-100%)",
                  animation: "neighbor-swish 3s ease-in-out infinite"
                }}
              />
            </span>
          ) : null}
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

      {showEditButton ? (
        <button
          className="shrink-0 rounded-full border border-pb-ocean/30 px-3 py-1.5 text-xs font-medium text-pb-ocean hover:bg-pb-ocean/5"
          onClick={() => onEdit?.(rsvp)}
          type="button"
        >
          Edit
        </button>
      ) : null}

      {showAdminRemoveButton ? (
        <button
          className="shrink-0 rounded-full border border-pb-error/30 px-3 py-1.5 text-xs font-medium text-pb-error hover:bg-pb-error/5"
          onClick={onAdminDelete}
          type="button"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
};
