import { useEffect, useMemo, useState } from "react";

const FOOD_CATEGORIES = ["Meat", "Side", "Dessert"];

/**
 * Resolves initial food fields from an RSVP value.
 * @param {string} food - Existing RSVP food value.
 * @returns {{ foodCategory: string, foodCustom: string }} Initial modal food state.
 */
const getInitialFoodState = (food = "") => {
  if (FOOD_CATEGORIES.includes(food)) {
    return {
      foodCategory: food,
      foodCustom: ""
    };
  }

  return {
    foodCategory: "",
    foodCustom: food
  };
};

/**
 * Renders and handles the RSVP edit/cancel modal flow.
 * @param {object} props - Component props.
 * @param {{ id: string, food: string, allergies: string, guestCount: number, attendeeName: string }|null} props.rsvp - RSVP to edit.
 * @param {() => void} props.onClose - Closes the modal.
 * @param {(payload: { food: string, allergies: string, guestCount: number }) => Promise<void>} props.onSave - Persists RSVP edits.
 * @param {(rsvpId: string) => Promise<void>} props.onCancel - Cancels RSVP by id.
 * @returns {JSX.Element|null} RSVP edit modal.
 */
export const EditRSVPModal = ({ rsvp, onClose, onSave, onCancel }) => {
  const initialFoodState = useMemo(() => getInitialFoodState(rsvp?.food || ""), [rsvp]);
  const [foodCategory, setFoodCategory] = useState(initialFoodState.foodCategory);
  const [foodCustom, setFoodCustom] = useState(initialFoodState.foodCustom);
  const [allergies, setAllergies] = useState(rsvp?.allergies || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFoodCategory(initialFoodState.foodCategory);
    setFoodCustom(initialFoodState.foodCustom);
    setAllergies(rsvp?.allergies || "");
  }, [initialFoodState, rsvp]);

  useEffect(() => {
    /**
     * Handles Escape key close behavior.
     * @param {KeyboardEvent} event - Browser keyboard event.
     * @returns {void}
     */
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!rsvp) {
    return null;
  }

  /**
   * Toggles the selected food category.
   * @param {string} category - Selected category value.
   * @returns {void}
   */
  const handleCategoryToggle = (category) => {
    if (foodCategory === category) {
      setFoodCategory("");
      return;
    }

    setFoodCategory(category);
    setFoodCustom("");
  };

  /**
   * Resolves food value from category/custom state.
   * @returns {string} Resolved food value for save payload.
   */
  const resolveFood = () => {
    if (foodCategory) {
      return foodCategory;
    }

    return foodCustom.trim();
  };

  /**
   * Saves RSVP edits from the modal form.
   * @param {React.FormEvent<HTMLFormElement>} event - Submit event.
   * @returns {Promise<void>} Completes when save flow finishes.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    const food = resolveFood();

    if (!food) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        food,
        allergies: allergies.trim(),
        guestCount: rsvp.guestCount
      });
    } catch (error) {
      console.error("Failed to save RSVP changes", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Cancels RSVP after confirmation.
   * @returns {Promise<void>} Completes when cancel flow finishes.
   */
  const handleCancelClick = async () => {
    const isConfirmed = window.confirm("Are you sure you want to cancel your RSVP?");
    if (!isConfirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onCancel(rsvp.id);
    } catch (error) {
      console.error("Failed to cancel RSVP", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
    >
      <form
        className="surface-card relative w-full max-w-md space-y-4 p-6 mx-4"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <button
          aria-label="Close edit RSVP modal"
          className="absolute right-4 top-4 text-pb-driftwood transition hover:text-pb-ink"
          onClick={onClose}
          type="button"
        >
          X
        </button>

        <h2 className="text-xl font-semibold text-pb-ocean">Edit your RSVP</h2>
        <p className="text-sm text-pb-driftwood">{rsvp.attendeeName}</p>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-pb-ocean">What are you bringing?</span>
          <div className="flex flex-wrap gap-1.5">
            {FOOD_CATEGORIES.map((category) => (
              <button
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  foodCategory === category
                    ? "bg-pb-palm text-white"
                    : "border border-pb-driftwood/30 text-pb-ink hover:bg-pb-cream"
                }`}
                key={category}
                onClick={() => handleCategoryToggle(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          {!foodCategory ? (
            <input
              className="input-field"
              onChange={(event) => setFoodCustom(event.target.value)}
              placeholder="Describe what you're bringing (not beer)..."
              type="text"
              value={foodCustom}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-pb-ocean" htmlFor="edit-rsvp-allergies">
            Allergies
          </label>
          <input
            className="input-field"
            id="edit-rsvp-allergies"
            onChange={(event) => setAllergies(event.target.value)}
            placeholder="Any food allergies? (optional)"
            type="text"
            value={allergies}
          />
        </div>

        <button
          className="rounded-full bg-pb-palm px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>

        <button
          className="rounded-full border border-pb-error/30 px-4 py-2 text-sm font-medium text-pb-error transition hover:bg-pb-error/5 disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleCancelClick}
          type="button"
        >
          Cancel my RSVP
        </button>
      </form>
    </div>
  );
};

export default EditRSVPModal;
