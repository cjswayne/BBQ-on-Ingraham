import { useState } from "react";

import { getClosestMondayInputValue } from "../utils/date.js";

export const GuestRSVPForm = ({ onSubmit }) => {
  const [formState, setFormState] = useState({
    eventDate: getClosestMondayInputValue(),
    name: "",
    food: "",
    guestCount: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        guestCount: Number(formState.guestCount)
      });

      setFormState({
        eventDate: getClosestMondayInputValue(),
        name: "",
        food: "",
        guestCount: 1
      });
    } catch (error) {
      setErrorMessage(error.message || "Unable to save your guest RSVP");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="surface-card space-y-4 p-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-lg font-semibold text-pb-ocean">
          RSVP without logging in
        </h2>
        <p className="mt-1 text-sm text-pb-driftwood">
          Quick guest mode. Guest RSVPs cannot be edited or canceled later.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="guest-name">
          Name
        </label>
        <input
          className="input-field"
          id="guest-name"
          onChange={(event) => setFieldValue("name", event.target.value)}
          placeholder="Your name"
          type="text"
          value={formState.name}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="guest-date">
          Event date
        </label>
        <input
          className="input-field"
          id="guest-date"
          min={getClosestMondayInputValue()}
          onChange={(event) => setFieldValue("eventDate", event.target.value)}
          type="date"
          value={formState.eventDate}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="guest-food">
          Food you are bringing
        </label>
        <input
          className="input-field"
          id="guest-food"
          onChange={(event) => setFieldValue("food", event.target.value)}
          placeholder="Drinks, dessert, salad..."
          type="text"
          value={formState.food}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="guest-count">
          Number of people
        </label>
        <input
          className="input-field"
          id="guest-count"
          min="1"
          onChange={(event) => setFieldValue("guestCount", event.target.value)}
          type="number"
          value={formState.guestCount}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-pb-error">{errorMessage}</p>
      ) : null}

      <button
        className="w-full rounded-full bg-pb-seafoam px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving guest RSVP..." : "Submit guest RSVP"}
      </button>
    </form>
  );
};
