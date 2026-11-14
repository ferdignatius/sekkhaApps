import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { api } from "@/lib/api"
import { EventForm, extractRecentTimes } from "../components/EventForm"
import { EventDetailSheet } from "../components/EventDetailSheet"
import type { EventListItem } from "../types"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

function renderWithAuth(ui: React.ReactElement) {
  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId: "usr_org",
    role: "admin",
    name: "Organizer Sekkha",
  }

  const contextValue: any = {
    authState,
    login: vi.fn(),
    register: vi.fn(),
    requestRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
    resendRegisterOtp: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    refreshUser: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={contextValue}>{ui}</AuthContext.Provider>
  )
}

describe("EventForm & EventDetailSheet Enhancements", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("extracts up to 3 most recent distinct HH:mm times ordered by latest event_date", () => {
    const times = extractRecentTimes(
      [
        { event_date: "2026-10-01T08:00:00" },
        { event_date: "2026-11-10T19:00:00" },
        { event_date: "2026-11-08T09:30:00" },
        { event_date: "2026-11-07T19:00:00" }, // duplicate HH:mm
        { event_date: "2026-11-05T17:15:00" },
        { event_date: "2026-11-01T10:00:00" },
      ],
      3
    )
    expect(times).toEqual(["19:00", "09:30", "17:15"])
  })

  it("pre-fills structured template without greeting, expands description, disables location autofill, and links category late penalty", async () => {
    vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url.includes("/configure/event-types")) {
        return Promise.resolve([
          {
            id: "et_social",
            code: "social",
            label: "Social Gathering",
            color: "#EC4899",
            description: "Fellowship social event",
            default_point_reward: 30,
            apply_late_penalty: false,
            default_max_late_minutes: 0,
            default_late_penalty_points: 0,
            is_active: true,
          },
          {
            id: "et_chanting",
            code: "chanting",
            label: "Evening Chanting",
            color: "#0D9488",
            description: "Weekly chanting",
            default_point_reward: 50,
            apply_late_penalty: true,
            default_max_late_minutes: 45,
            default_late_penalty_points: 20,
            is_active: true,
          },
        ] as any)
      }
      return Promise.resolve([] as any)
    })

    renderWithAuth(
      <EventForm
        initialDate="2026-11-14"
        recentLocations={["Vihara Tri Maha Dharma", "Dharmasala Utama"]}
        recentTimes={["19:00", "08:30"]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // 1. Pre-filled description template (without removed opening greeting)
    const descArea = screen.getByLabelText(/description and instructions/i) as HTMLTextAreaElement
    expect(descArea.value).toContain("✨ Acara: Chanting")
    expect(descArea.value).toContain("📅 Tanggal: Sabtu, 14 November 2026")
    expect(descArea.value).toContain("🕖 Waktu: 19.00 WIB – selesai")
    expect(descArea.value).toContain("📍 Tempat: Vihara Tri Maha Dharma")
    expect(descArea.value).not.toContain("Halo, selamat siang")

    // 2. Description Expand / Collapse button toggles size
    expect(descArea.rows).toBe(7)
    const expandBtn = screen.getByRole("button", { name: /expand/i })
    fireEvent.click(expandBtn)
    expect(descArea.rows).toBe(12)
    expect(descArea.className).toContain("min-h-[300px]")

    // 3. Location field label, disabled native autofill, & recommendation chips (no floating dropdown)
    const locInput = screen.getByLabelText(/^Location/i) as HTMLInputElement
    expect(screen.queryByText(/Venue \/ Room/i)).toBeNull()
    expect(locInput.getAttribute("autocomplete")).toBe("off")
    expect(locInput.getAttribute("aria-autocomplete")).toBe("none")
    expect(locInput.getAttribute("data-lpignore")).toBe("true")
    expect(locInput.getAttribute("data-form-type")).toBe("other")
    expect(screen.queryByRole("listbox", { name: /recent locations/i })).toBeNull()

    const venueChip = screen.getByRole("button", { name: "Dharmasala Utama" })
    fireEvent.click(venueChip)
    expect(locInput.value).toBe("Dharmasala Utama")

    // 4. Category selection updates Apply Late Penalty without overwriting edited description
    fireEvent.change(descArea, { target: { value: "Custom user notes" } })

    const socialCatBtn = await screen.findByRole("radio", {
      name: /Social Gathering/i,
    })
    fireEvent.click(socialCatBtn)

    const lateSwitch = screen.getByRole("switch", {
      name: /apply late penalty/i,
    })
    expect(lateSwitch.getAttribute("data-state")).toBe("unchecked")
    expect(descArea.value).toBe("Custom user notes")

    const chantingCatBtn = screen.getByRole("radio", {
      name: /Evening Chanting/i,
    })
    fireEvent.click(chantingCatBtn)

    expect(lateSwitch.getAttribute("data-state")).toBe("checked")
    expect((screen.getByLabelText(/Grace Period/i) as HTMLInputElement).value).toBe("45")
    expect((screen.getByLabelText(/Penalty Deduction/i) as HTMLInputElement).value).toBe("20")
    expect(descArea.value).toBe("Custom user notes")
  })

  it("shares both event details and URL via navigator.share and clipboard fallback in EventDetailSheet", async () => {
    const sampleEvent: EventListItem = {
      id: "evt_share_1",
      title: "Chanting Malam",
      event_type: "chanting",
      description: [
        "✨ Acara: Chanting",
        "📅 Tanggal: Sabtu, 14 November 2026",
        "🕖 Waktu: 19.00 WIB – selesai",
        "📍 Tempat: Vihara Tri Maha Dharma",
      ].join("\n"),
      event_date: "2026-11-14T19:00:00",
      location: "Vihara Tri Maha Dharma",
      point_reward: 50,
      status: "scheduled",
      tag: "chanting",
    }

    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
    })

    renderWithAuth(
      <EventDetailSheet
        event={sampleEvent}
        role="admin"
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /share event/i }))

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1)
    })
    const payload = shareMock.mock.calls[0][0]
    expect(payload.title).toBe("Chanting Malam")
    expect(payload.text).toContain("✨ Acara: Chanting")
    expect(payload.text).toContain(window.location.href)

    // Test clipboard fallback when navigator.share is absent
    cleanup()
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    })
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    renderWithAuth(
      <EventDetailSheet
        event={sampleEvent}
        role="admin"
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /share event/i }))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1)
    })
    const copiedText = writeTextMock.mock.calls[0][0]
    expect(copiedText).toContain("✨ Acara: Chanting")
    expect(copiedText).toContain(window.location.href)
  })
})
