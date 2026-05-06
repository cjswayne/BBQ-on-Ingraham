import { QRCodeSVG } from "qrcode.react";

// Resolves to the deployed origin at runtime (works locally and in production)
const SITE_URL = window.location.origin;

const Share = () => {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-pb-ocean">Share the BBQ</h1>
        <p className="mt-2 text-sm text-pb-driftwood">
          Scan to open the RSVP page on your phone or share with a friend.
        </p>
      </div>

      <div className="surface-card flex flex-col items-center gap-4 rounded-2xl p-8">
        <QRCodeSVG
          bgColor="#ffffff"
          fgColor="#0a2540"
          level="M"
          size={240}
          value={SITE_URL}
        />
        <p className="text-xs text-pb-driftwood">{SITE_URL}</p>
      </div>
    </main>
  );
};

export default Share;
