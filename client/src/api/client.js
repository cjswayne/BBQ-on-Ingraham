const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
};

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse API response JSON", error);
    return { error: text };
  }
};

const createError = (response, payload) => {
  const message = payload?.error || payload?.message || response.statusText;

  return {
    message,
    status: response.status,
    data: payload
  };
};

const request = async (path, options = {}) => {
  const token = options.token || localStorage.getItem("barbecue-mondays-token");
  const headers = {
    ...DEFAULT_HEADERS,
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw createError(response, payload);
  }

  return payload;
};

const ADMIN_TOKEN_KEY = "bbq-admin-token";

const getAdminToken = () => sessionStorage.getItem(ADMIN_TOKEN_KEY);

export const adminSession = {
  getToken: getAdminToken,
  setToken: (token) => sessionStorage.setItem(ADMIN_TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(ADMIN_TOKEN_KEY)
};

export const apiClient = {
  register: (email, name) =>
    request("/api/auth/register", {
      method: "POST",
      body: { email, name }
    }),
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: { email, password }
    }),
  setPassword: (token, password, confirmPassword) =>
    request("/api/auth/set-password", {
      method: "POST",
      body: { token, password, confirmPassword }
    }),
  setPasswordByEmail: (email, password, confirmPassword) =>
    request("/api/auth/set-password", {
      method: "POST",
      body: { email, password, confirmPassword }
    }),
  lookupUser: (email) =>
    request(`/api/auth/lookup?email=${encodeURIComponent(email)}`),
  uploadMedia: (body) =>
    request("/api/media", {
      method: "POST",
      body
    }),
  getMedia: (page = 1, limit = 20) =>
    request(`/api/media?page=${page}&limit=${limit}`),
  getMediaById: (id) => request(`/api/media/${id}`),
  getMyMedia: () => request("/api/media/mine"),
  deleteMedia: (id) =>
    request(`/api/media/${id}`, {
      method: "DELETE"
    }),
  getMyRsvps: () => request("/api/rsvps/mine"),
  updateProfile: (body) =>
    request("/api/auth/profile", {
      method: "PUT",
      body
    }),
  setupProfile: (body) =>
    request("/api/auth/profile-setup", {
      method: "PUT",
      body
    }),
  getCurrentUser: () => request("/api/auth/me"),
  getNextEvent: () => request("/api/events/next"),
  createRsvp: (body) =>
    request("/api/rsvps", {
      method: "POST",
      body
    }),
  updateRsvp: (id, body) =>
    request(`/api/rsvps/${id}`, {
      method: "PUT",
      body
    }),
  cancelRsvp: (id) =>
    request(`/api/rsvps/${id}`, {
      method: "DELETE"
    }),
  addPollSuggestion: (eventId, suggestion) =>
    request(`/api/events/${eventId}/poll`, {
      method: "POST",
      body: { suggestion }
    }),
  togglePollVote: (eventId, optionId) =>
    request(`/api/events/${eventId}/poll/${optionId}/vote`, {
      method: "POST",
      body: {}
    }),
  setTheme: (eventId, theme) =>
    request(`/api/events/${eventId}/theme`, {
      method: "PUT",
      body: { theme }
    }),
  getAdminStats: () => request("/api/admin/stats"),
  updateAdminSettings: (body) =>
    request("/api/admin/settings", {
      method: "PUT",
      body
    }),
  adminLogin: (password) =>
    request("/api/admin/login", {
      method: "POST",
      body: { password }
    }),
  adminCancelRsvp: (id) =>
    request(`/api/admin/rsvps/${id}`, {
      method: "DELETE",
      token: getAdminToken()
    }),
  adminUpdateRsvp: (id, body) =>
    request(`/api/admin/rsvps/${id}`, {
      method: "PUT",
      body,
      token: getAdminToken()
    }),
  adminDeletePollOption: (optionId) =>
    request(`/api/admin/poll-options/${optionId}`, {
      method: "DELETE",
      token: getAdminToken()
    }),
  adminSetTheme: (eventId, theme) =>
    request(`/api/admin/events/${eventId}/theme`, {
      method: "PUT",
      body: { theme },
      token: getAdminToken()
    }),
  adminSetEventCancelled: (eventId, cancelled) =>
    request(`/api/admin/events/${eventId}/cancelled`, {
      method: "PUT",
      body: { cancelled },
      token: getAdminToken()
    }),
  adminGetStats: () =>
    request("/api/admin/stats", { token: getAdminToken() }),
  adminUpdateSettings: (body) =>
    request("/api/admin/settings", {
      method: "PUT",
      body,
      token: getAdminToken()
    })
};
