import { useEffect } from "react";

/**
 * Modal for displaying one media item in large view.
 * @param {object} props - Component props.
 * @param {object|null} props.media - Active media item.
 * @param {() => void} props.onClose - Called when modal should close.
 * @returns {JSX.Element|null} Rendered gallery modal.
 */
const GalleryModal = ({ media, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!media) {
    return null;
  }

  const posterName = media.userId?.name || media.posterName || "Guest";
  const posterPhotoUrl = media.userId?.profilePhotoUrl || media.posterPhotoUrl || "";
  const mediaUrl = media.cloudinaryUrl || media.url || "";
  const thumbnailUrl = media.thumbnailUrl || mediaUrl;
  const isVideo = media.mediaType === "video";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="surface-card w-full max-w-4xl overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-pb-driftwood/20 px-4 py-3">
          <p className="text-sm font-medium text-pb-ocean">Gallery</p>
          <button
            aria-label="Close gallery modal"
            className="rounded-full border border-pb-driftwood/20 px-3 py-1 text-sm text-pb-driftwood"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="bg-black">
          {isVideo ? (
            <video
              className="max-h-[75vh] w-full"
              controls
              poster={thumbnailUrl}
              src={mediaUrl}
            />
          ) : (
            <img
              alt="Gallery media"
              className="max-h-[75vh] w-full object-contain"
              src={mediaUrl}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          {posterPhotoUrl ? (
            <img
              alt={`${posterName} profile`}
              className="h-9 w-9 rounded-full object-cover"
              src={posterPhotoUrl}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pb-sand text-sm font-semibold text-pb-ocean">
              {posterName[0]?.toUpperCase() || "G"}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-pb-ocean">{posterName}</p>
            <p className="text-xs text-pb-driftwood">
              {isVideo ? "Video upload" : "Photo upload"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { GalleryModal };
export default GalleryModal;
