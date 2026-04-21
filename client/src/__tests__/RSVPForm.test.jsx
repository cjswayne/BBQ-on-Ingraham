/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { RSVPForm } = await import("../components/RSVPForm.jsx");

describe("RSVPForm", () => {
  it("submits the RSVP payload with the current field values", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <RSVPForm
        existingRsvp={null}
        initialName="Alex"
        initialPhotoUrl=""
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/^Food you are bringing$/i), {
      target: { value: "Burger buns" }
    });
    fireEvent.change(screen.getByLabelText(/Number of people/i), {
      target: { value: "4" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^RSVP$/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alex",
        food: "Burger buns",
        guestCount: 4
      })
    );
  });
});
