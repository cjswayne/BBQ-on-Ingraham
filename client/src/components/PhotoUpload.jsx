import { useMemo, useRef } from "react";

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

  const openWidget = () => {
    if (!isConfigured) {
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
