import { useMemo, useState } from "react";

import { getClosestMondayInputValue } from "../utils/date.js";
import { PhotoUpload } from "./PhotoUpload.jsx";

export const RSVPForm = ({
  existingRsvp,
  initialName,
  initialPhotoUrl,
  onSubmit
}) => {
  const [formState, setFormState] = useState({
    eventDate: getClosestMondayInputValue(),
    name: initialName || "",
    food: existingRsvp?.food || "",
    guestCount: existingRsvp?.guestCount || 1,
    profilePhotoUrl: initialPhotoUrl || ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const heading = useMemo(() => {
    return existingRsvp ? "Update your RSVP" : "RSVP for Monday";
  }, [existingRsvp]);

  const setFieldValue = (fieldName, fieldValue) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: fieldValue
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onSubmit({
        eventDate: formState.eventDate,
        name: formState.name,
        food: formState.food,
        guestCount: Number(formState.guestCount),
        profilePhotoUrl: formState.profilePhotoUrl
      });
    } catch (error) {
      setErrorMessage(error.message || "Unable to save your RSVP");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="surface-card space-y-4 p-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-lg font-semibold text-pb-ocean">{heading}</h2>
        <p className="mt-1 text-sm text-pb-driftwood">
          We will remember your name and photo the next time you RSVP.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="rsvp-name">
          Name
        </label>
        <input
          className="input-field"
          id="rsvp-name"
          onChange={(event) => setFieldValue("name", event.target.value)}
          placeholder="Your name"
          type="text"
          value={formState.name}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="rsvp-date">
          Event date
        </label>
        <input
          className="input-field"
          id="rsvp-date"
          min={getClosestMondayInputValue()}
          onChange={(event) => setFieldValue("eventDate", event.target.value)}
          type="date"
          value={formState.eventDate}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="rsvp-food">
          Food you are bringing
        </label>
        <input
          className="input-field"
          id="rsvp-food"
          onChange={(event) => setFieldValue("food", event.target.value)}
          placeholder="Veggie skewers, buns, salad..."
          type="text"
          value={formState.food}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="rsvp-guest-count">
          Number of people
        </label>
        <input
          className="input-field"
          id="rsvp-guest-count"
          min="1"
          onChange={(event) => setFieldValue("guestCount", event.target.value)}
          type="number"
          value={formState.guestCount}
        />
      </div>

      <PhotoUpload
        onChange={(photoUrl) => setFieldValue("profilePhotoUrl", photoUrl)}
        value={formState.profilePhotoUrl}
      />

      {errorMessage ? (
        <p className="text-sm text-pb-error">{errorMessage}</p>
      ) : null}

      <button
        className="w-full rounded-full bg-pb-coral px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving RSVP..." : existingRsvp ? "Update RSVP" : "RSVP"}
      </button>
    </form>
  );
};
