import { useState } from "react";

import { QRCodeSVG } from "qrcode.react";

import logo from "../assets/bbqoningraham-logo.png";

// Resolves to the deployed origin at runtime (works locally and in production)
const SITE_URL = window.location.origin;

const Share = () => {
  // "idle" | "copied" | "shared" | "error"
  const [shareStatus, setShareStatus] = useState("idle");

  const handleShare = async () => {
    // Web Share API — triggers native iOS/Android share sheet
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BBQ On Ingraham",
          text: "Come hang at the BBQ — RSVP here:",
          url: SITE_URL
        });
        setShareStatus("shared");
      } catch (error) {
        // AbortError means user dismissed the sheet — not an error worth surfacing
        if (error.name !== "AbortError") {
          console.error("Share failed", error);
          setShareStatus("error");
        }
      }
    } else {
      // Desktop fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(SITE_URL);
        setShareStatus("copied");
      } catch (error) {
        console.error("Clipboard copy failed", error);
        setShareStatus("error");
      }
    }

    setTimeout(() => setShareStatus("idle"), 3000);
  };

  const buttonLabel = {
    idle: "Share",
    copied: "Link copied",
    shared: "Shared",
    error: "Try again"
  }[shareStatus];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-pb-ocean">Share the BBQ</h1>
      </div>

      <div className="surface-card flex flex-col items-center gap-6 rounded-2xl p-10">
        {/* Outer ring provides a branded border around the QR code */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: "#5E7F57" }}>
          <div className="rounded-xl bg-[#F4F1E8] p-4">
            <QRCodeSVG
              bgColor="#F4F1E8"
              fgColor="#5A5F63"
              imageSettings={{
                src: logo,
                height: 64,
                width: 96,
                excavate: true,
              }}
              level="H"
              size={220}
              value={SITE_URL}
            />
          </div>
        </div>
        <button
          className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${
            shareStatus === "error"
              ? "bg-pb-error"
              : "bg-pb-palm hover:brightness-105"
          }`}
          onClick={handleShare}
          type="button"
        >
          {shareStatus === "copied" || shareStatus === "shared" ? (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" x2="12" y1="2" y2="15" />
            </svg>
          )}
          {buttonLabel}
        </button>
        <div className="text-center">
          <p className="mt-0.5 text-xs text-pb-driftwood">{SITE_URL}</p>
        </div>


      </div>
    </main>
  );
};

export default Share;
