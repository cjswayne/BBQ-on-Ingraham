/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom doesn't implement matchMedia
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

const getNextEvent = vi.fn();

vi.mock("../api/client.js", () => {
  return {
    apiClient: {
      getNextEvent,
      createRsvp: vi.fn(),
      cancelRsvp: vi.fn(),
      addPollSuggestion: vi.fn(),
      togglePollVote: vi.fn(),
      adminCancelRsvp: vi.fn(),
      adminDeletePollOption: vi.fn(),
      adminSetTheme: vi.fn(),
      adminLogin: vi.fn()
    },
    adminSession: {
      getToken: () => null,
      setToken: vi.fn(),
      clear: vi.fn()
    }
  };
});

vi.mock("../context/AuthContext.jsx", () => {
  return {
    useAuth: () => ({
      isAuthenticated: false,
      refreshUser: vi.fn(),
      user: null
    })
  };
});

const Home = (await import("../pages/Home.jsx")).default;

describe("Home page", () => {
  beforeEach(() => {
    getNextEvent.mockReset();
  });

  it("renders the RSVP list from the API response", async () => {
    getNextEvent.mockResolvedValue({
      event: {
        id: "event-1",
        date: "2026-04-20T07:00:00.000Z",
        theme: "",
        themePollActive: true
      },
      rsvps: [
        {
          id: "rsvp-1",
          attendeeName: "Jamie",
          phone: "",
          profilePhotoUrl: "",
          food: "Corn salad",
          guestCount: 2,
          isGuest: true
        }
      ],
      pollOptions: []
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Jamie")).toBeInTheDocument();
    });

    expect(screen.getByText(/Corn salad/i)).toBeInTheDocument();
  });
});
