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

function renderWithRole(
  ui: React.ReactElement,
  role: "member" | "activist" | "organizer" | "admin" = "member",
  userId = "usr_mem"
) {
  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId,
    role,
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

    // 1. Open Optional Settings and verify pre-filled description template aligned with initialDate default (09:00 WIB)
    fireEvent.click(screen.getByRole("button", { name: /3\. Optional Settings/i }))
    const descArea = screen.getByLabelText(/^Description/i) as HTMLTextAreaElement
    expect(descArea.value).toContain("Hallo Sobat Teenagers! 👋")
    expect(descArea.value).toContain("📢 Acara: ")
    expect(descArea.value).toContain("📅 Tanggal: Sabtu, 14 November 2026")
    expect(descArea.value).toContain("⏰ Waktu: 09.00 WIB – selesai")
    expect(descArea.value).toContain("📍 Tempat: Vihara Tri Maha Dharma")
    expect(descArea.value).toContain("Jangan lupa siapkan QR Pass untuk check-in ya!")
    expect(descArea.value).not.toContain("Halo, selamat siang")

    // 2. Description Expand / Collapse button toggles size
    expect(descArea.rows).toBe(4)
    const expandBtn = screen.getByRole("button", { name: /expand/i })
    fireEvent.click(expandBtn)
    expect(descArea.rows).toBe(12)
    expect(descArea.className).toContain("min-h-[300px]")

    // 3. Location field label, disabled native autofill, recent-locations dropdown & dynamic description sync
    const locInput = screen.getByLabelText(/^Location/i) as HTMLInputElement
    expect(screen.queryByText(/Venue \/ Room/i)).toBeNull()
    expect(locInput.getAttribute("autocomplete")).toBe("off")
    expect(locInput.getAttribute("aria-autocomplete")).toBe("none")
    expect(locInput.getAttribute("data-lpignore")).toBe("true")
    expect(locInput.getAttribute("data-form-type")).toBe("other")
    expect(screen.queryByRole("listbox", { name: /recent locations/i })).toBeNull()

    // Focus/click opens recent locations dropdown (max 3 recent locations, no chips below input)
    fireEvent.focus(locInput)
    const locListbox = await screen.findByRole("listbox", {
      name: /recent locations/i,
    })
    expect(locListbox).toBeTruthy()
    const venueOption = screen.getByRole("option", { name: "Dharmasala Utama" })
    fireEvent.click(venueOption)
    expect(locInput.value).toBe("Dharmasala Utama")
    expect(screen.queryByRole("listbox", { name: /recent locations/i })).toBeNull()
    await waitFor(() => {
      expect(descArea.value).toContain("📍 Tempat: Dharmasala Utama")
    })

    const titleInput = screen.getByLabelText(/Event name/i) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: "Weekly Dhamma Class" } })
    await waitFor(() => {
      expect(descArea.value).toContain("📢 Acara: Weekly Dhamma Class")
    })

    // 4. Manual edit preserves custom description, while Sync template re-enables live sync
    fireEvent.change(descArea, { target: { value: "Custom user notes" } })

    const socialCatBtn = await screen.findByRole("radio", {
      name: /Social Gathering/i,
    })
    fireEvent.click(socialCatBtn)

    // Selecting a category must NOT overwrite or auto-fill Event name
    expect(titleInput.value).toBe("Weekly Dhamma Class")

    const lateSwitch = screen.getByRole("switch", {
      name: /apply late penalty/i,
    })
    expect(lateSwitch.getAttribute("data-state")).toBe("unchecked")
    expect(descArea.value).toBe("Custom user notes")

    fireEvent.change(titleInput, { target: { value: "Social Meetup" } })
    expect(descArea.value).toBe("Custom user notes")

    const chantingCatBtn = screen.getByRole("radio", {
      name: /Evening Chanting/i,
    })
    fireEvent.click(chantingCatBtn)

    expect(lateSwitch.getAttribute("data-state")).toBe("checked")
    expect((screen.getByLabelText(/Grace Period/i) as HTMLInputElement).value).toBe("45")
    expect((screen.getByLabelText(/Penalty Deduction/i) as HTMLInputElement).value).toBe("20")
    expect(descArea.value).toBe("Custom user notes")

    // Clicking Sync template restores dynamic tracking of title & location
    fireEvent.click(screen.getByRole("button", { name: /sync template/i }))
    await waitFor(() => {
      expect(descArea.value).toContain("📢 Acara: Social Meetup")
      expect(descArea.value).toContain("📍 Tempat: Dharmasala Utama")
    })
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

  it("renders member personal attendance view for member role and restricts CRUD", () => {
    const sampleEvent: EventListItem = {
      id: "evt_mem_1",
      title: "Kebaktian Minggu",
      location: "Dharmasala",
      event_date: new Date(Date.now() + 86400000).toISOString(),
      point_reward: 50,
      status: "active",
      event_type: "regular-puja",
      tag: "regular-puja",
    }

    const attendances = [
      {
        attendance_id: "att_mem_1",
        user_id: "usr_mem",
        name: "Test Member",
        user_number: "2026112001",
        role: "member",
        school: "SMA 1",
        method: "qr" as const,
        points_earned: 50,
        is_late: false,
        late_penalty_applied: 0,
        badge_activity_id: null,
        badge_activity: null,
        badge_bonus_points: 0,
        is_finalized: false,
        scanned_at: new Date().toISOString(),
      },
    ]

    renderWithRole(
      <EventDetailSheet
        event={sampleEvent}
        role="member"
        attendances={attendances}
        onClose={vi.fn()}
      />,
      "member",
      "usr_mem"
    )

    // Should render tabs with "My Attendance" instead of "Attendance"
    const attendanceTab = screen.getByRole("tab", { name: /my attendance/i })
    expect(attendanceTab).toBeTruthy()

    // Switch to My Attendance tab
    fireEvent.click(attendanceTab)

    // Should show personal attendance card
    expect(screen.getByText("Attendance Recorded")).toBeTruthy()
    expect(screen.getByText("Present")).toBeTruthy()
    expect(screen.getByText("+50 Pts")).toBeTruthy()
    expect(screen.getByText("Member QR Scan")).toBeTruthy()

    // Should NOT show organizer action buttons (Launch Scanner, Delete, Finalize)
    expect(screen.queryByRole("button", { name: /launch scanner/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /start event/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /end & finalize/i })).toBeNull()
  })

  it("shows not checked in message and QR button for unrecorded member", () => {
    const sampleEvent: EventListItem = {
      id: "evt_mem_2",
      title: "Kebaktian Minggu",
      location: "Dharmasala",
      event_date: new Date(Date.now() + 86400000).toISOString(),
      point_reward: 50,
      status: "active",
      event_type: "regular-puja",
      tag: "regular-puja",
    }

    renderWithRole(
      <EventDetailSheet
        event={sampleEvent}
        role="member"
        attendances={[]}
        onClose={vi.fn()}
      />,
      "member",
      "usr_mem"
    )

    const attendanceTab = screen.getByRole("tab", { name: /my attendance/i })
    fireEvent.click(attendanceTab)

    expect(screen.getByText("Not Checked In Yet")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: /show my member qr/i })
    ).toBeTruthy()
  })

  it("shows Reset to Draft option in More actions only for admin when event status is closed", async () => {
    const closedEvent: EventListItem = {
      id: "evt_closed_admin",
      title: "Closed Puja",
      event_type: "regular_puja",
      event_date: "2026-11-20T03:00:00Z",
      location: "Vihara Sekkha",
      point_reward: 50,
      status: "closed",
      tag: "regular_puja",
    }

    // 1. Organizer should NOT see Reset to Draft inside More actions
    renderWithRole(
      <EventDetailSheet
        event={closedEvent}
        role="organizer"
        attendances={[]}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
      "organizer",
      "usr_org_1"
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: /more actions/i }))
    expect(await screen.findByText("Duplicate Event")).toBeTruthy()
    expect(screen.queryByText("Reset to Draft")).toBeNull()
    cleanup()

    // 2. Admin SHOULD see Reset to Draft and trigger status "scheduled" on confirmation
    const onStatusChange = vi.fn().mockResolvedValue(undefined)
    renderWithRole(
      <EventDetailSheet
        event={closedEvent}
        role="admin"
        attendances={[]}
        onClose={vi.fn()}
        onStatusChange={onStatusChange}
      />,
      "admin",
      "usr_admin_1"
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: /more actions/i }))

    const resetMenuItem = await screen.findByText("Reset to Draft")
    fireEvent.click(resetMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Reset Event to Draft?")).toBeTruthy()
    })
    fireEvent.click(screen.getByRole("button", { name: /^Reset to Draft$/i }))

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(
        "evt_closed_admin",
        "scheduled",
        undefined
      )
    })
  })

  it("hides recent locations dropdown when history is empty and accepts typing a new location", () => {
    vi.spyOn(api, "get").mockResolvedValue([] as any)

    renderWithAuth(
      <EventForm
        initialDate="2026-11-20"
        recentLocations={[]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const locInput = screen.getByLabelText(/^Location/i) as HTMLInputElement
    fireEvent.focus(locInput)
    expect(screen.queryByRole("listbox", { name: /recent locations/i })).toBeNull()

    fireEvent.change(locInput, { target: { value: "Aula Lantai 2" } })
    expect(locInput.value).toBe("Aula Lantai 2")
    expect(screen.queryByRole("listbox", { name: /recent locations/i })).toBeNull()
  })

  it("allows clearing Grace Period and Penalty Deduction to empty string without auto-0 snap and validates on submit", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as any)
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    renderWithAuth(
      <EventForm
        initialDate="2026-11-22"
        recentLocations={[]}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Sunday Puja" },
    })
    fireEvent.click(screen.getByRole("radio", { name: /Regular Puja/i }))
    fireEvent.click(screen.getByRole("button", { name: /3\. Optional Settings/i }))

    const graceInput = screen.getByLabelText(/Grace Period/i) as HTMLInputElement
    const penaltyInput = screen.getByLabelText(/Penalty Deduction/i) as HTMLInputElement

    // Clearing fields leaves them "" instead of forcing 0 or 1
    fireEvent.change(graceInput, { target: { value: "" } })
    fireEvent.change(penaltyInput, { target: { value: "" } })
    expect(graceInput.value).toBe("")
    expect(penaltyInput.value).toBe("")

    // Submitting while empty triggers inline submit validation and blocks submit
    fireEvent.click(screen.getByRole("button", { name: /Create Event/i }))
    expect(
      (await screen.findAllByText(/Grace period must be between 0 and 180 minutes/i)).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Penalty deduction must be between 1 and 100 points/i).length
    ).toBeGreaterThan(0)
    expect(handleSubmit).not.toHaveBeenCalled()

    // Entering valid values submits cleanly as numbers
    fireEvent.change(graceInput, { target: { value: "15" } })
    fireEvent.change(penaltyInput, { target: { value: "25" } })
    fireEvent.click(screen.getByRole("button", { name: /Create Event/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          max_late_minutes: 15,
          late_penalty_points: 25,
        })
      )
    })
  })

  it("fetches categories with noCache and preserves 0-minute grace period configured on category", async () => {
    const getSpy = vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url.includes("/configure/event-types")) {
        return Promise.resolve([
          {
            id: "et_strict",
            code: "strict-puja",
            label: "Strict Puja",
            color: "#4262FF",
            default_point_reward: 50,
            apply_late_penalty: true,
            default_max_late_minutes: 0,
            default_late_penalty_points: 20,
            is_active: true,
          },
        ] as any)
      }
      return Promise.resolve([] as any)
    })

    renderWithAuth(
      <EventForm
        initialDate="2026-11-22"
        recentLocations={[]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const strictBtn = await screen.findByRole("radio", { name: /Strict Puja/i })
    expect(getSpy).toHaveBeenCalledWith(
      "/configure/event-types?is_active=true",
      { noCache: true }
    )

    fireEvent.click(strictBtn)
    fireEvent.click(screen.getByRole("button", { name: /3\. Optional Settings/i }))
    expect((screen.getByLabelText(/Grace Period/i) as HTMLInputElement).value).toBe("0")
    expect((screen.getByLabelText(/Penalty Deduction/i) as HTMLInputElement).value).toBe("20")
  })
})
