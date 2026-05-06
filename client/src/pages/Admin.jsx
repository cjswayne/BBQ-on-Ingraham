import { useCallback, useEffect, useState } from "react";

import { adminSession, apiClient } from "../api/client.js";
import AdminPasswordGate from "../components/AdminPasswordGate.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

// Inline edit form for a single RSVP row
const RsvpEditRow = ({ rsvp, onSave, onCancel }) => {
  const [food, setFood] = useState(rsvp.food);
  const [guestCount, setGuestCount] = useState(rsvp.guestCount);

  const handleSave = (event) => {
    event.preventDefault();
    onSave(rsvp.id, { food, guestCount: Number(guestCount) });
  };

  return (
    <form
      className="grid gap-2 rounded-2xl border border-pb-ocean/30 bg-white/80 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto]"
      onSubmit={handleSave}
    >
      <div className="space-y-1">
        <p className="font-medium text-pb-ink">{rsvp.attendeeName}</p>
        <input
          className="input-field text-sm"
          onChange={(e) => setFood(e.target.value)}
          placeholder="Food"
          required
          type="text"
          value={food}
        />
      </div>
      <div className="flex items-center">
        <input
          className="input-field w-20 text-sm"
          min="1"
          onChange={(e) => setGuestCount(e.target.value)}
          placeholder="Guests"
          required
          type="number"
          value={guestCount}
        />
      </div>
      <button
        className="rounded-full bg-pb-palm px-3 py-1.5 text-xs font-semibold text-white self-center"
        type="submit"
      >
        Save
      </button>
      <button
        className="rounded-full border border-pb-driftwood/30 px-3 py-1.5 text-xs font-medium text-pb-ink self-center"
        onClick={onCancel}
        type="button"
      >
        Back
      </button>
    </form>
  );
};

const AdminDashboard = ({ onLogout }) => {
  const [state, setState] = useState({ isLoading: true, errorMessage: "", data: null });
  const [settingsForm, setSettingsForm] = useState({
    emailNotificationsEnabled: true,
    notificationEmails: ""
  });
  const [themeInput, setThemeInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editingRsvpId, setEditingRsvpId] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState({ isOpen: false, rsvpId: null, name: "" });

  const loadAdminData = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, errorMessage: "" }));

    try {
      const response = await apiClient.adminGetStats();

      setState({ isLoading: false, errorMessage: "", data: response });
      setSettingsForm({
        emailNotificationsEnabled: response.settings.emailNotificationsEnabled,
        notificationEmails: response.settings.notificationEmails.join(", ")
      });
      setThemeInput(response.stats.theme || "");
    } catch (error) {
      console.error("Failed to load admin stats", error);

      if (error.status === 401) {
        adminSession.clear();
        onLogout();
        return;
      }

      setState({
        isLoading: false,
        errorMessage: error.message || "Unable to load the admin dashboard.",
        data: null
      });
    }
  }, [onLogout]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");

    try {
      await apiClient.adminUpdateSettings({
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
      await apiClient.adminSetTheme(state.data.stats.eventId, themeInput);
      await loadAdminData();
    } catch (error) {
      console.error("Failed to save theme", error);
      setActionError(error.message || "Unable to save the theme.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRsvp = async (id, body) => {
    setActionError("");

    try {
      await apiClient.adminUpdateRsvp(id, body);
      setEditingRsvpId(null);
      await loadAdminData();
    } catch (error) {
      console.error("Failed to update RSVP", error);
      setActionError(error.message || "Unable to update RSVP.");
    }
  };

  const openCancelConfirm = (rsvp) => {
    setCancelConfirm({ isOpen: true, rsvpId: rsvp.id, name: rsvp.attendeeName });
  };

  const confirmCancelRsvp = async () => {
    const { rsvpId } = cancelConfirm;

    setCancelConfirm({ isOpen: false, rsvpId: null, name: "" });
    setActionError("");

    try {
      await apiClient.adminCancelRsvp(rsvpId);
      await loadAdminData();
    } catch (error) {
      console.error("Failed to cancel RSVP", error);
      setActionError(error.message || "Unable to cancel RSVP.");
    }
  };

  const handleDeletePollOption = async (optionId) => {
    setActionError("");

    try {
      await apiClient.adminDeletePollOption(optionId);
      await loadAdminData();
    } catch (error) {
      console.error("Failed to delete poll option", error);
      setActionError(error.message || "Unable to delete poll option.");
    }
  };

  const handleLogout = () => {
    adminSession.clear();
    onLogout();
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
        <div className="surface-card p-6 space-y-3">
          <p className="text-sm text-pb-error">{state.errorMessage}</p>
          <button
            className="text-xs font-medium text-pb-driftwood underline"
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  const foodEntries = Object.entries(state.data?.stats?.foodSummary || {});
  const rsvps = state.data?.stats?.rsvps || [];
  const pollOptions = state.data?.stats?.pollOptions || [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-pb-ocean">Admin</h1>
        <button
          className="text-xs font-medium text-pb-driftwood underline"
          onClick={handleLogout}
          type="button"
        >
          Sign out
        </button>
      </div>

      {/* Stats summary */}
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

      {actionError ? (
        <div className="surface-card p-4">
          <p className="text-sm text-pb-error">{actionError}</p>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Food summary */}
        <div className="surface-card space-y-4 p-6">
          <h2 className="text-xl font-semibold text-pb-ocean">Food planning</h2>
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
            <p className="text-sm text-pb-driftwood">No food entries yet.</p>
          )}
        </div>

        <div className="space-y-6">
          {/* Email settings */}
          <form className="surface-card space-y-4 p-6" onSubmit={saveSettings}>
            <h2 className="text-xl font-semibold text-pb-ocean">Email notifications</h2>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                checked={settingsForm.emailNotificationsEnabled}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
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
                  setSettingsForm((current) => ({
                    ...current,
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

          {/* Theme editor */}
          <form className="surface-card space-y-4 p-6" onSubmit={saveTheme}>
            <h2 className="text-xl font-semibold text-pb-ocean">Set the theme</h2>
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

      {/* Poll options */}
      <section className="surface-card space-y-4 p-6">
        <h2 className="text-xl font-semibold text-pb-ocean">Poll options</h2>
        {pollOptions.length ? (
          <div className="space-y-3">
            {pollOptions.map((option) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-pb-driftwood/15 bg-white/70 px-4 py-3"
                key={option.id}
              >
                <div>
                  <p className="font-medium text-pb-ink">{option.suggestion}</p>
                  <p className="text-xs text-pb-driftwood">{option.voteCount} vote{option.voteCount !== 1 ? "s" : ""}</p>
                </div>
                <button
                  className="rounded-full border border-pb-error/30 px-3 py-1.5 text-xs font-medium text-pb-error hover:bg-pb-error/5"
                  onClick={() => handleDeletePollOption(option.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-pb-driftwood">No poll options yet.</p>
        )}
      </section>

      {/* RSVP management */}
      <section className="surface-card space-y-4 p-6">
        <h2 className="text-xl font-semibold text-pb-ocean">Attendee list</h2>
        <div className="space-y-3">
          {rsvps.map((rsvp) =>
            editingRsvpId === rsvp.id ? (
              <RsvpEditRow
                key={rsvp.id}
                rsvp={rsvp}
                onCancel={() => setEditingRsvpId(null)}
                onSave={handleSaveRsvp}
              />
            ) : (
              <div
                className="grid gap-2 rounded-2xl border border-pb-driftwood/15 bg-white/70 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
                key={rsvp.id}
              >
                <div>
                  <p className="font-medium text-pb-ink">{rsvp.attendeeName}</p>
                  <p className="text-sm text-pb-driftwood">{rsvp.food}</p>
                </div>
                <p className="text-sm text-pb-driftwood self-center">{rsvp.guestCount} {rsvp.guestCount === 1 ? "person" : "people"}</p>
                <p className="text-sm text-pb-driftwood self-center">{rsvp.phone || "Guest RSVP"}</p>
                <button
                  className="rounded-full border border-pb-ocean/30 px-3 py-1.5 text-xs font-medium text-pb-ocean hover:bg-pb-ocean/5 self-center"
                  onClick={() => setEditingRsvpId(rsvp.id)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="rounded-full border border-pb-error/30 px-3 py-1.5 text-xs font-medium text-pb-error hover:bg-pb-error/5 self-center"
                  onClick={() => openCancelConfirm(rsvp)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            )
          )}
          {rsvps.length === 0 ? (
            <p className="text-sm text-pb-driftwood">No RSVPs yet.</p>
          ) : null}
        </div>
      </section>

      <ConfirmModal
        confirmLabel="Cancel RSVP"
        isDangerous
        isOpen={cancelConfirm.isOpen}
        message={`This will remove ${cancelConfirm.name}'s RSVP from the list.`}
        title="Cancel this RSVP?"
        onCancel={() => setCancelConfirm({ isOpen: false, rsvpId: null, name: "" })}
        onConfirm={confirmCancelRsvp}
      />
    </main>
  );
};

const Admin = () => {
  // Persist admin session across re-renders but not across tab closes (sessionStorage)
  const [adminToken, setAdminToken] = useState(() => adminSession.getToken());

  const handleAuthenticated = (token) => {
    setAdminToken(token);
  };

  const handleLogout = () => {
    setAdminToken(null);
  };

  if (!adminToken) {
    return <AdminPasswordGate onAuthenticated={handleAuthenticated} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
};

export default Admin;
