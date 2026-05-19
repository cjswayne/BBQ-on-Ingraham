import { useRef, useState } from "react";

/**
 * Compresses an image file using canvas and returns a JPEG blob.
 * @param {File} file - Source image file selected by the user.
 * @param {number} maxSize - Maximum width/height in pixels.
 * @param {number} quality - JPEG export quality from 0 to 1.
 * @returns {Promise<Blob>} Compressed image blob.
 */
const compressImage = (file, maxSize = 200, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Image load failed"));
      };

      img.src = String(reader.result || "");
    };

    reader.onerror = () => {
      reject(new Error("FileReader failed"));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a file to Cloudinary with progress tracking.
 * @param {Blob|File} blob - Compressed image blob or file.
 * @param {string} cloudName - Cloudinary cloud name.
 * @param {string} uploadPreset - Cloudinary unsigned upload preset.
 * @param {(progress: number) => void} onProgress - Upload progress callback.
 * @returns {Promise<string>} Uploaded secure URL from Cloudinary.
 */
const uploadToCloudinary = (blob, cloudName, uploadPreset, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", blob, "profile.jpg");
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "barbecue-mondays/profile-photos");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } catch (error) {
          console.error("Failed to parse Cloudinary response:", error);
          reject(new Error("Invalid upload response"));
        }
      } else {
        console.error("Cloudinary upload error:", xhr.status, xhr.responseText);
        reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    console.log("Uploading to Cloudinary:", { cloudName, uploadPreset, blobSize: blob.size });
    xhr.send(formData);
  });
};

/**
 * Returns the text label for each upload status.
 * @param {"idle"|"compressing"|"uploading"|"done"|"error"} status - Current upload status.
 * @param {number} progress - Upload progress percentage.
 * @returns {string} Human-readable status label.
 */
const getStatusText = (status, progress) => {
  if (status === "compressing") return "Compressing image...";
  if (status === "uploading") return `Uploading ${progress}%`;
  if (status === "done") return "Upload complete";
  return "";
};

export const PhotoUpload = ({ onChange, value }) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
  const isConfigured = Boolean(cloudName && uploadPreset);

  const fileInputRef = useRef(null);
  const uploadInFlightRef = useRef(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const setUploadInFlight = (inFlight) => {
    uploadInFlightRef.current = inFlight;
  };

  /**
   * Opens the hidden file input when user clicks the button.
   * @returns {void}
   */
  const handlePickFile = () => {
    if (!isConfigured || !fileInputRef.current) {
      return;
    }

    fileInputRef.current.click();
  };

  /**
   * Handles file selection, compression, upload, and success callback.
   * @param {import("react").ChangeEvent<HTMLInputElement>} event - File input change event.
   * @returns {Promise<void>} Resolves when upload flow completes.
   */
  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !isConfigured) {
      return;
    }

    setErrorMessage("");
    setStatus("compressing");
    setProgress(0);
    setUploadInFlight(true);

    try {
      const compressedBlob = await compressImage(selectedFile, 200, 0.6);
      const compressedFile = new File([compressedBlob], "profile.jpg", { type: "image/jpeg" });

      setStatus("uploading");
      const secureUrl = await uploadToCloudinary(
        compressedFile,
        cloudName,
        uploadPreset,
        setProgress
      );

      setStatus("done");
      onChange(secureUrl);
    } catch (error) {
      console.error("Photo upload failed:", error);
      setStatus("error");
      setErrorMessage("Upload failed, try again");
    } finally {
      setUploadInFlight(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const buttonLabel = value ? "Replace photo" : "Upload photo";
  const statusText = getStatusText(status, progress);
  const showProgressBar = status === "uploading";

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-pb-mist">
        {value ? (
          <img alt="Selected profile preview" className="h-full w-full object-cover" src={value} />
        ) : (
          <svg
            aria-hidden="true"
            className="h-7 w-7 text-pb-driftwood"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            viewBox="0 0 24 24"
          >
            <path d="M4 8h3l1.5-2h7L17 8h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="rounded-full border border-pb-ocean/20 bg-white px-4 py-2 text-sm font-medium text-pb-ocean transition hover:bg-pb-mist disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isConfigured}
          onClick={handlePickFile}
          type="button"
        >
          {buttonLabel}
        </button>

        <div className="mt-2 h-4">
          {showProgressBar ? (
            <div className="h-1 w-full rounded-full bg-pb-palm/30">
              <div
                className="h-1 rounded-full bg-pb-palm transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
          {statusText ? <p className="mt-1 text-xs text-pb-driftwood">{statusText}</p> : null}
          {status === "error" ? <p className="mt-1 text-xs text-red-600">{errorMessage}</p> : null}
          {!isConfigured ? (
            <p className="mt-1 text-xs text-pb-driftwood">
              Upload disabled until Cloudinary env vars are configured.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
