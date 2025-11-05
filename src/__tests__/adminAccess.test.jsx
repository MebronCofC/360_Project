import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../components/header";
import { AuthContext } from "../contexts/authContext";

// Utility to render with mocked auth state
function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ currentUser: user }}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Role-based UI visibility", () => {
  test("Normal user should not see admin controls", () => {
    const mockUser = { email: "user@test.com", isAdmin: false };

    renderWithAuth(mockUser);

    const adminBtn = screen.queryByText(/add event/i);
    expect(adminBtn).not.toBeInTheDocument();
  });
});
