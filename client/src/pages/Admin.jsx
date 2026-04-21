import { useEffect, useState } from "react";

import { apiClient } from "../api/client.js";

const Admin = () => {
  const [state, setState] = useState({
    isLoading: true,
    errorMessage: "",
    data: null
  });
  const [settingsForm, setSettingsForm] = useState({
    emailNotificationsEnabled: true,
    notificationEmails: ""
  });
  const [themeInput, setThemeInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadAdminData = async () => {
    setState((currentValue) => ({
      ...currentValue,
      isLoading: true,
      errorMessage: ""
    }));

    try {
      const response = await apiClient.getAdminStats();

      setState({
        isLoading: false,
        errorMessage: "",
        data: response
      });
      setSettingsForm({
        emailNotificationsEnabled: response.settings.emailNotificationsEnabled,
        notificationEmails: response.settings.notificationEmails.join(", ")
      });
      setThemeInput(response.stats.theme || "");
    } catch (error) {
      setState({
        isLoading: false,
        errorMessage:
          error.status === 403
            ? "Your phone number is not on the admin list."
            : error.message || "Unable to load the admin dashboard.",
        data: null
      });
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const saveSettings = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");

    try {
      await apiClient.updateAdminSettings({
        emailNotificationsEnabled: settingsForm.emailNotificationsEnabled,
        notificationEmails: settingsForm.notificationEmails
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      });
      await loadAdminData();
    } catch (error) {
      console.error("Failed to save admin settings", error);
      setActionError(error.message || "Unable to save admin settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveTheme = async (event) => {
    event.preventDefault();

    if (!state.data?.stats) {
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      await apiClient.setTheme(state.data.stats.eventId, themeInput);
      await loadAdminData();
    } catch (error) {
      console.error("Failed to save admin theme", error);
      setActionError(error.message || "Unable to save the theme.");
    } finally {
      setIsSaving(false);
    }
  };

  if (state.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="surface-card p-6">
          <p className="text-sm text-pb-driftwood">Loading admin dashboard...</p>
        </div>
      </main>
    );
  }

  if (state.errorMessage) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="surface-card p-6">
          <p className="text-sm text-pb-error">{state.errorMessage}</p>
        </div>
      </main>
    );
  }

  const foodEntries = Object.entries(state.data?.stats?.foodSummary || {});

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <section className="surface-card grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
            Headcount
          </p>
          <p className="mt-2 text-2xl font-semibold text-pb-ocean">
            {state.data.stats.attendeeCount}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
            RSVPs
          </p>
          <p className="mt-2 text-2xl font-semibold text-pb-ocean">
            {state.data.stats.rsvpCount}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-pb-driftwood">
            Theme
          </p>
          <p className="mt-2 text-base font-semibold text-pb-ocean">
            {state.data.stats.theme || "No theme set yet"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card space-y-4 p-6">
          <h1 className="text-2xl font-semibold text-pb-ocean">
            Food planning
          </h1>
          {foodEntries.length ? (
            <div className="space-y-3">
              {foodEntries.map(([food, count]) => (
                <div
                  className="flex items-center justify-between rounded-2xl border border-pb-driftwood/15 bg-white/70 px-4 py-3"
                  key={food}
                >
                  <span className="font-medium text-pb-ink">{food}</span>
                  <span className="text-sm text-pb-driftwood">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-pb-driftwood">
              No food entries yet for the upcoming Monday.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {actionError ? (
            <div className="surface-card p-4">
              <p className="text-sm text-pb-error">{actionError}</p>
            </div>
          ) : null}
          <form className="surface-card space-y-4 p-6" onSubmit={saveSettings}>
            <h2 className="text-xl font-semibold text-pb-ocean">
              Email notifications
            </h2>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                checked={settingsForm.emailNotificationsEnabled}
                onChange={(event) =>
                  setSettingsForm((currentValue) => ({
                    ...currentValue,
                    emailNotificationsEnabled: event.target.checked
                  }))
                }
                type="checkbox"
              />
              Notify planners when someone RSVPs
            </label>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="admin-emails">
                Notification emails
              </label>
              <textarea
                className="input-field min-h-28"
                id="admin-emails"
                onChange={(event) =>
                  setSettingsForm((currentValue) => ({
                    ...currentValue,
                    notificationEmails: event.target.value
                  }))
                }
                value={settingsForm.notificationEmails}
              />
            </div>
            <button
              className="rounded-full bg-pb-ocean px-4 py-3 text-sm font-semibold text-white"
              disabled={isSaving}
              type="submit"
            >
              Save settings
            </button>
          </form>

          <form className="surface-card space-y-4 p-6" onSubmit={saveTheme}>
            <h2 className="text-xl font-semibold text-pb-ocean">
              Set the theme
            </h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="theme-input">
                Theme for next Monday
              </label>
              <input
                className="input-field"
                id="theme-input"
                onChange={(event) => setThemeInput(event.target.value)}
                type="text"
                value={themeInput}
              />
            </div>
            <button
              className="rounded-full bg-pb-palm px-4 py-3 text-sm font-semibold text-white"
              disabled={isSaving || !themeInput.trim()}
              type="submit"
            >
              Save theme
            </button>
          </form>
        </div>
      </section>

      <section className="surface-card space-y-4 p-6">
        <h2 className="text-xl font-semibold text-pb-ocean">Attendee list</h2>
        <div className="space-y-3">
          {state.data.stats.rsvps.map((rsvp) => (
            <div
              className="grid gap-2 rounded-2xl border border-pb-driftwood/15 bg-white/70 px-4 py-3 sm:grid-cols-[1fr_auto_auto]"
              key={rsvp.id}
            >
              <div>
                <p className="font-medium text-pb-ink">{rsvp.attendeeName}</p>
                <p className="text-sm text-pb-driftwood">{rsvp.food}</p>
              </div>
              <p className="text-sm text-pb-driftwood">{rsvp.guestCount} people</p>
              <p className="text-sm text-pb-driftwood">
                {rsvp.phone || "Guest RSVP"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Admin;
