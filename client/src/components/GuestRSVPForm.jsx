import { useState } from "react";

import { getClosestMondayInputValue } from "../utils/date.js";

const FOOD_CATEGORIES = ["Meat", "Side", "Beer"];

export const GuestRSVPForm = ({ cancelled = false, onSubmit }) => {
  const [formState, setFormState] = useState({
    eventDate: getClosestMondayInputValue(),
    name: "",
    foodCategory: "",
    foodCustom: "",
    guestCount: 1,
    allergies: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const setFieldValue = (fieldName, fieldValue) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: fieldValue
    }));
  };

  const handleCategorySelect = (category) => {
    setFormState((currentValue) => ({
      ...currentValue,
      foodCategory: currentValue.foodCategory === category ? "" : category,
      foodCustom: ""
    }));
  };

  // Resolve the final food value from category + custom text
  const resolveFood = () => {
    if (formState.foodCategory) return formState.foodCategory;
    return formState.foodCustom.trim();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const food = resolveFood();
    if (!food) {
      setErrorMessage("Please select a category or describe what you are bringing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        eventDate: formState.eventDate,
        name: formState.name,
        food,
        guestCount: Number(formState.guestCount)
      };

      if (formState.allergies.trim()) {
        body.allergies = formState.allergies.trim();
      }

      await onSubmit(body);

      setFormState({
        eventDate: getClosestMondayInputValue(),
        name: "",
        foodCategory: "",
        foodCustom: "",
        guestCount: 1,
        allergies: ""
      });
    } catch (error) {
      console.error("RSVP submission failed", error);
      setErrorMessage(error.message || "Unable to save your guest RSVP");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cancelled) {
    return (
      <div id="rsvp" className="surface-card space-y-2 p-5 opacity-60">
        <h2 className="text-lg font-semibold text-pb-ocean">RSVP</h2>
        <p className="text-sm text-pb-driftwood">RSVPs are closed — this event is not happening.</p>
      </div>
    );
  }

  return (
    <form id="rsvp" className="surface-card space-y-4 p-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-lg font-semibold text-pb-ocean">
          RSVP
        </h2>
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
          required
          type="text"
          value={formState.name}
        />
      </div>

      {/* Food category selector */}
      <div className="space-y-2">
        <span className="block text-sm font-medium">
          What are you bringing?
        </span>
        <div className="flex flex-wrap gap-2">
          {FOOD_CATEGORIES.map((category) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                formState.foodCategory === category
                  ? "bg-pb-palm text-white"
                  : "border border-pb-driftwood/30 text-pb-ink hover:bg-pb-cream"
              }`}
              key={category}
              onClick={() => handleCategorySelect(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
        {/* Custom text input shown when no preset category is selected */}
        {!formState.foodCategory && (
          <input
            className="input-field mt-2"
            id="guest-food-custom"
            onChange={(event) => setFieldValue("foodCustom", event.target.value)}
            placeholder="Or describe what you're bringing..."
            type="text"
            value={formState.foodCustom}
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="guest-allergies">
          Allergies
        </label>
        <input
          className="input-field"
          id="guest-allergies"
          onChange={(event) => setFieldValue("allergies", event.target.value)}
          placeholder="Any food allergies? (optional)"
          type="text"
          value={formState.allergies}
        />
      </div>

      {formState.foodCategory === "Beer" ? (
        <p className="text-xs text-pb-driftwood">* No glass allowed</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-pb-error">{errorMessage}</p>
      ) : null}

      <button
        className="w-full rounded-full bg-pb-seafoam px-4 py-3 text-sm font-semibold text-white transition"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "RSVP-ing..." : "RSVP"}
      </button>
    </form>
  );
};
