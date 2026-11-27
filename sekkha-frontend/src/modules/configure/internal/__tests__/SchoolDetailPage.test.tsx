import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { SchoolDetailPage } from "../components/SchoolDetailPage"
import { schoolsApi } from "../api/configureApi"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ schoolId: "sch_1" }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("SchoolDetailPage — Read-Only Default & 3-Dot Actions", () => {
  it("renders read-only view by default and switches to edit mode via 3-dot menu", async () => {
    vi.spyOn(schoolsApi, "get").mockResolvedValue({
      id: "sch_1",
      name: "SMK Bina Mandiri",
      type: "SMA/SMK",
      is_active: true,
      status: "active",
      userCount: 1,
    })

    const authState: AuthState = {
      ...initialAuthState,
      status: "authenticated",
      userId: "usr_admin",
      role: "admin",
      name: "Admin Sekkha",
    }

    render(
      <AuthContext.Provider value={{ authState } as any}>
        <SchoolDetailPage />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText("Visible during registration")).toBeTruthy()
    })

    // Read-only by default: Save Changes & input fields are not mounted
    expect(screen.queryByRole("button", { name: /Save Changes/i })).toBeNull()

    // Open 3-dot menu
    const actionsBtn = screen.getByRole("button", {
      name: /Institution actions/i,
    })
    fireEvent.pointerDown(actionsBtn, { button: 0, pointerType: "mouse" })
    fireEvent.click(actionsBtn)

    const editMenuItem = await screen.findByRole("menuitem", {
      name: /Edit Institution/i,
    })
    fireEvent.click(editMenuItem)

    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeTruthy()
  })
})
