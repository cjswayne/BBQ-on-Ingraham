import { useMemo, useRef } from "react";

const CLOUDINARY_WIDGET_URL =
  "https://upload-widget.cloudinary.com/latest/global/all.js";

// Lazily inject the Cloudinary widget script the first time it's needed
const loadCloudinaryScript = () => {
  if (window.cloudinary) return Promise.resolve();
  if (window._cloudinaryLoading) return window._cloudinaryLoading;

  window._cloudinaryLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CLOUDINARY_WIDGET_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = (err) => {
      console.error("Failed to load Cloudinary widget:", err);
      reject(err);
    };
    document.head.appendChild(script);
  });

  return window._cloudinaryLoading;
};

const getWidgetConfig = () => {
  return {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ""
  };
};

export const PhotoUpload = ({ onChange, value }) => {
  const widgetRef = useRef(null);
  const config = useMemo(() => getWidgetConfig(), []);
  const isConfigured = Boolean(config.cloudName && config.uploadPreset);

  const openWidget = async () => {
    if (!isConfigured) {
      return;
    }

    try {
      await loadCloudinaryScript();
    } catch (err) {
      console.error("Cloudinary script failed to load:", err);
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
          folder: "barbecue-mondays/profile-photos",
          maxImageFileSize: 2_000_000,
          sources: ["local", "camera"],
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          multiple: false,
          cropping: true
        },
        (error, result) => {
          if (!error && result?.event === "success") {
            onChange(result.info.secure_url);
          }
        }
      );
    }

    widgetRef.current.open();
  };

  return (
    <div className="space-y-3">
      <button
        className="rounded-full border border-pb-ocean/20 bg-white px-4 py-2 text-sm font-medium text-pb-ocean transition hover:bg-pb-mist disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isConfigured}
        onClick={openWidget}
        type="button"
      >
        {value ? "Replace profile photo" : "Upload profile photo"}
      </button>
      {!isConfigured ? (
        <p className="text-xs text-pb-driftwood">
          Cloudinary upload is disabled until the Vite env vars are configured.
        </p>
      ) : null}
      {value ? (
        <img
          alt="Selected profile preview"
          className="h-20 w-20 rounded-full object-cover shadow-sm"
          src={value}
        />
      ) : null}
    </div>
  );
};
