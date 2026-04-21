/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendOtp = vi.fn();

vi.mock("../api/client.js", () => {
  return {
    apiClient: {
      sendOtp,
      verifyOtp: vi.fn()
    }
  };
});

vi.mock("../context/AuthContext.jsx", () => {
  return {
    useAuth: () => ({
      login: vi.fn()
    })
  };
});

const { LoginModal } = await import("../components/LoginModal.jsx");

describe("LoginModal", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    sendOtp.mockReset();
  });

  it("renders a phone input with mobile autofill-friendly attributes", () => {
    render(<LoginModal isOpen onClose={vi.fn()} />);

    const phoneInput = screen.getByLabelText(/Phone number/i);

    expect(phoneInput).toHaveAttribute("type", "tel");
    expect(phoneInput).toHaveAttribute("autocomplete", "tel");
    expect(phoneInput).toHaveAttribute("name", "phone");
    expect(phoneInput).toHaveAttribute("inputmode", "tel");
  });

  it("moves to the OTP step after sending the code", async () => {
    sendOtp.mockResolvedValue({ status: "pending" });

    render(<LoginModal isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Phone number/i), {
      target: { value: "+16195550111" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Verification code/i)).toBeInTheDocument();
    });
  });
});
