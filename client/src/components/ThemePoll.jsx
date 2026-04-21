import { useEffect, useState } from "react";

const VOTES_KEY_PREFIX = "bbq-poll-votes-";

const loadVotedOptions = (eventId) => {
  if (!eventId) return new Set();
  try {
    const raw = localStorage.getItem(`${VOTES_KEY_PREFIX}${eventId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (error) {
    console.error("Failed to read poll votes from localStorage", error);
    return new Set();
  }
};

const persistVote = (eventId, optionId) => {
  try {
    const votes = loadVotedOptions(eventId);
    votes.add(optionId);
    localStorage.setItem(`${VOTES_KEY_PREFIX}${eventId}`, JSON.stringify([...votes]));
  } catch (error) {
    console.error("Failed to persist poll vote to localStorage", error);
  }
};

export const ThemePoll = ({
  eventId,
  onRefresh,
  options,
  theme
}) => {
  const [suggestion, setSuggestion] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votedOptions, setVotedOptions] = useState(new Set());

  // Sync voted state whenever the event changes
  useEffect(() => {
    setVotedOptions(loadVotedOptions(eventId));
  }, [eventId]);

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

  const submitSuggestion = async (event) => {
    event.preventDefault();
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
    if (votedOptions.has(optionId)) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onRefresh("vote", { eventId, optionId });
      persistVote(eventId, optionId);
      setVotedOptions((prev) => new Set([...prev, optionId]));
    } catch (error) {
      setErrorMessage(error.message || "Unable to save your vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="poll" className="surface-card space-y-4 p-5">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-pb-driftwood">
          Theme poll
        </p>
        <h2 className="mt-1 text-xl font-semibold text-pb-ocean">
          No theme picked yet
        </h2>
        <p className="mt-1 text-sm text-pb-driftwood">
          Suggest and vote on the vibe for this Monday.
        </p>
      </div>

      <div className="space-y-3">
        {options.length ? (
          options.map((option) => {
            const hasVoted = votedOptions.has(option.id);
            return (
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
                {hasVoted ? (
                  <span className="rounded-full bg-pb-palm/15 px-3 py-2 text-sm font-medium text-pb-palm">
                    Voted
                  </span>
                ) : (
                  <button
                    className="rounded-full border border-pb-ocean/20 px-3 py-2 text-sm font-medium text-pb-ocean transition hover:bg-pb-ocean/5 disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={() => voteForOption(option.id)}
                    type="button"
                  >
                    Vote
                  </button>
                )}
              </div>
            );
          })
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
