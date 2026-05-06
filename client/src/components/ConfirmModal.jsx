import { useEffect, useRef } from "react";

// Accessible confirmation modal; traps focus and closes on Escape
const ConfirmModal = ({ isOpen, title, message, confirmLabel = "Confirm", onConfirm, onCancel, isDangerous = false }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      onClick={onCancel}
    >
      <div
        className="surface-card w-full max-w-sm space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-pb-ocean">{title}</h2>
        {message ? (
          <p className="text-sm text-pb-driftwood">{message}</p>
        ) : null}
        <div className="flex gap-3 justify-end">
          <button
            className="rounded-full border border-pb-driftwood/30 px-4 py-2 text-sm font-medium text-pb-ink hover:bg-pb-sand/40"
            ref={cancelRef}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${isDangerous ? "bg-pb-error" : "bg-pb-ocean"}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
