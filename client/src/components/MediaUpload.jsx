import { useMemo, useRef } from "react";

const CLOUDINARY_WIDGET_URL =
  "https://upload-widget.cloudinary.com/latest/global/all.js";

/**
 * Loads the Cloudinary widget script only once per session.
 * @returns {Promise<void>} Promise that resolves once the script is ready.
 */
const loadCloudinaryScript = () => {
  if (window.cloudinary) return Promise.resolve();
  if (window._cloudinaryMediaLoading) return window._cloudinaryMediaLoading;

  window._cloudinaryMediaLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CLOUDINARY_WIDGET_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = (error) => {
      console.error("Failed to load Cloudinary media widget", error);
      reject(error);
    };
    document.head.appendChild(script);
  });

  return window._cloudinaryMediaLoading;
};

/**
 * Reads Cloudinary config values from Vite environment variables.
 * @returns {{cloudName: string, uploadPreset: string}} Upload widget config.
 */
const getWidgetConfig = () => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  const mediaPreset = import.meta.env.VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET || "";
  const fallbackPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

  return {
    cloudName,
    uploadPreset: mediaPreset || fallbackPreset
  };
};

/**
 * Converts a Cloudinary video URL into a transformed thumbnail URL.
 * @param {string} secureUrl - The Cloudinary video secure URL.
 * @returns {string} Derived thumbnail URL with frame extraction and JPG extension.
 */
const toVideoThumbnailUrl = (secureUrl) => {
  const withTransform = secureUrl.replace(
    "/video/upload/",
    "/video/upload/so_0,w_400,h_300,c_fill/"
  );

  return withTransform.replace(/\.[^./?]+(?=$|\?)/, ".jpg");
};

/**
 * Opens the Cloudinary upload widget for mixed photo and video uploads.
 * @param {{onUpload?: (info: {secure_url: string, resource_type: string, public_id: string, thumbnail_url: string}) => void}} props - Component props.
 * @returns {JSX.Element} Media upload trigger button and helper text.
 */
export const MediaUpload = ({ onUpload }) => {
  const widgetRef = useRef(null);
  const config = useMemo(() => getWidgetConfig(), []);
  const isConfigured = Boolean(config.cloudName && config.uploadPreset);

  /**
   * Builds and opens the Cloudinary widget instance.
   * @returns {Promise<void>} Completes after attempting to open the widget.
   */
  const openWidget = async () => {
    if (!isConfigured) {
      return;
    }

    try {
      await loadCloudinaryScript();
    } catch (error) {
      console.error("Cloudinary media script failed to load", error);
      return;
    }

    if (!window.cloudinary) {
      return;
    }

    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: config.cloudName,
          uploadPreset: config.uploadPreset,
          folder: "barbecue-mondays/media",
          sources: ["local", "camera"],
          clientAllowedFormats: [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif",
            "mp4",
            "mov",
            "webm"
          ],
          maxImageFileSize: 10_000_000,
          maxVideoFileSize: 100_000_000,
          multiple: true
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary media upload failed", error);
            return;
          }

          if (result?.event !== "success" || !result?.info) {
            return;
          }

          const thumbnailUrl =
            result.info.resource_type === "video"
              ? toVideoThumbnailUrl(result.info.secure_url)
              : result.info.secure_url;

          onUpload?.({
            secure_url: result.info.secure_url,
            resource_type: result.info.resource_type,
            public_id: result.info.public_id,
            thumbnail_url: thumbnailUrl
          });
        }
      );
    }

    widgetRef.current.open();
  };

  return (
    <div className="space-y-3">
      <button
        className="rounded-full bg-pb-palm px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isConfigured}
        onClick={openWidget}
        type="button"
      >
        Upload photos and videos
      </button>
      {!isConfigured ? (
        <p className="text-xs text-pb-driftwood">
          Cloudinary upload is disabled until media upload env vars are
          configured.
        </p>
      ) : null}
    </div>
  );
};
