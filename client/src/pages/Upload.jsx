import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { MediaUpload } from "../components/MediaUpload.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Renders the media upload experience for authenticated guests.
 * @returns {JSX.Element} Upload page content.
 */
const Upload = () => {
  const { isAuthenticated } = useAuth();
  const [uploadedItems, setUploadedItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = "Upload Media | BBQ On Ingraham";
  }, []);

  /**
   * Persists each successful Cloudinary upload in the app backend.
   * @param {{secure_url: string, public_id: string, resource_type: string, thumbnail_url: string}} info - Cloudinary upload result payload.
   * @returns {Promise<void>} Completes when save succeeds or fails.
   */
  const handleUpload = async (info) => {
    const mediaType = info.resource_type === "video" ? "video" : "photo";
    const payload = {
      cloudinaryUrl: info.secure_url,
      publicId: info.public_id,
      mediaType,
      thumbnailUrl: info.thumbnail_url || ""
    };

    setErrorMessage("");
    setIsSaving(true);

    try {
      await apiClient.uploadMedia(payload);
      setUploadedItems((previousItems) => [payload, ...previousItems]);
    } catch (error) {
      console.error("Failed to save uploaded media", error);
      setErrorMessage(
        "Upload reached Cloudinary, but saving to the gallery failed. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <section className="surface-card rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-semibold text-pb-ocean">Upload Media</h1>
          <p className="mt-3 text-sm text-pb-driftwood">
            You need to RSVP first to upload photos and videos.{" "}
            <Link
              className="font-medium text-pb-palm underline underline-offset-2"
              to="/#rsvp"
            >
              Go to RSVP
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="surface-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-pb-ocean">Upload Media</h1>
        <p className="mt-2 text-sm text-pb-driftwood">
          Share photos and short videos from the latest cookout.
        </p>

        <div className="mt-5">
          <MediaUpload onUpload={handleUpload} />
        </div>

        <p className="mt-4 text-sm text-pb-ocean">
          {uploadedItems.length} items uploaded this session
        </p>

        {isSaving ? (
          <p className="mt-2 text-xs text-pb-driftwood">Saving media...</p>
        ) : null}

        {errorMessage ? (
          <p className="mt-2 text-sm text-pb-error">{errorMessage}</p>
        ) : null}

        {uploadedItems.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {uploadedItems.map((item) => (
              <div
                className="aspect-square overflow-hidden rounded-lg border border-pb-driftwood/20 bg-pb-sand/20"
                key={item.publicId}
              >
                {item.mediaType === "video" ? (
                  <img
                    alt="Uploaded video preview"
                    className="h-full w-full object-cover"
                    src={item.thumbnailUrl}
                  />
                ) : (
                  <img
                    alt="Uploaded photo preview"
                    className="h-full w-full object-cover"
                    src={item.cloudinaryUrl}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default Upload;
