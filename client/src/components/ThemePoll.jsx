import { useState } from "react";

export const ThemePoll = ({
  eventId,
  isAuthenticated,
  onOpenLogin,
  onRefresh,
  options,
  theme,
  themePollActive
}) => {
  const [suggestion, setSuggestion] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (theme) {
    return (
      <section className="surface-card space-y-3 p-5">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-pb-driftwood">
          Theme of the night
        </p>
        <h2 className="text-2xl font-semibold text-pb-ocean">{theme}</h2>
      </section>
    );
  }

  if (!themePollActive) {
    return null;
  }

  const submitSuggestion = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      onOpenLogin();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onRefresh("suggestion", { eventId, suggestion });
      setSuggestion("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to add your suggestion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const voteForOption = async (optionId) => {
    if (!isAuthenticated) {
      onOpenLogin();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onRefresh("vote", { eventId, optionId });
    } catch (error) {
      setErrorMessage(error.message || "Unable to save your vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-pb-driftwood">
          Theme poll
        </p>
        <h2 className="mt-1 text-xl font-semibold text-pb-ocean">
          No theme picked yet
        </h2>
        <p className="mt-1 text-sm text-pb-driftwood">
          Logged-in residents can suggest and vote on the vibe for this Monday.
        </p>
      </div>

      <div className="space-y-3">
        {options.length ? (
          options.map((option) => (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl border border-pb-driftwood/15 bg-white/70 px-4 py-3"
              key={option.id}
            >
              <div>
                <p className="font-medium text-pb-ink">{option.suggestion}</p>
                <p className="text-xs text-pb-driftwood">
                  {option.voteCount} vote{option.voteCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                className="rounded-full border border-pb-ocean/20 px-3 py-2 text-sm font-medium text-pb-ocean"
                disabled={isSubmitting}
                onClick={() => voteForOption(option.id)}
                type="button"
              >
                Vote
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-pb-driftwood">
            No ideas yet. Add the first theme suggestion.
          </p>
        )}
      </div>

      <form className="space-y-3" onSubmit={submitSuggestion}>
        <label className="block text-sm font-medium" htmlFor="theme-suggestion">
          Suggest a theme
        </label>
        <input
          className="input-field"
          id="theme-suggestion"
          onChange={(event) => setSuggestion(event.target.value)}
          placeholder="Taco night, burgers, beach snacks..."
          type="text"
          value={suggestion}
        />
        {errorMessage ? (
          <p className="text-sm text-pb-error">{errorMessage}</p>
        ) : null}
        <button
          className="rounded-full bg-pb-palm px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
          disabled={isSubmitting || !suggestion.trim()}
          type="submit"
        >
          Add suggestion
        </button>
      </form>
    </section>
  );
};
