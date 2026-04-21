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

export const apiClient = {
  sendOtp: (phone) => {
    return request("/api/auth/send-otp", {
      method: "POST",
      body: { phone }
    });
  },
  verifyOtp: (phone, code) => {
    return request("/api/auth/verify-otp", {
      method: "POST",
      body: { phone, code }
    });
  },
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
    })
};
