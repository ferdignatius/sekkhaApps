import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { api } from "@/lib/api"
import { PeoplePage } from "../components/PeoplePage"
import { peopleApi } from "../api/peopleApi"
import type { PaginatedMembersResponse } from "../api/peopleApi"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mockNavigate.mockReset()
})

function renderPeoplePage(response: PaginatedMembersResponse) {
  const listSpy = vi
    .spyOn(peopleApi, "listMembers")
    .mockResolvedValue(response as any)
  const schoolsSpy = vi
    .spyOn(peopleApi, "getVerifiedSchools")
    .mockResolvedValue([])

  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    role: "admin",
    userId: "usr_admin_1",
  }

  return {
    listSpy,
    schoolsSpy,
    ...render(
      <AuthContext.Provider value={{ authState } as any}>
        <PeoplePage />
      </AuthContext.Provider>
    ),
  }
}

describe("PeoplePage 2-Column Mobile Grid, Fast Loading & Directory Isolation", () => {
  it("uses crisp 2-column grid on mobile scaling to 3/4 columns on larger screens with lightweight 12-item default page size", async () => {
    const { listSpy, schoolsSpy } = renderPeoplePage({
      items: [
        {
          id: "usr_admin_1",
          name: "Admin Sekkha",
          username: "admin",
          role: "admin",
          user_number: "26010104",
          is_claimed: true,
          created_at: "2026-10-01T00:00:00Z",
        },
        {
          id: "usr_2",
          name: "Budi Wijaya (Pengurus)",
          username: "pengurus",
          role: "organizer",
          user_number: "26010103",
          is_claimed: false,
          created_at: "2026-10-02T00:00:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 12,
      totalPages: 1,
      stats: { total: 2, member: 0, activist: 0, organizer: 2 },
    })

    await waitFor(() => {
      expect(screen.getByText("Admin Sekkha")).toBeTruthy()
    })

    const grid = screen.getByTestId("people-directory-grid")
    const tokens = grid.className.split(/\s+/)
    expect(tokens).toContain("grid-cols-2")
    expect(tokens).toContain("md:grid-cols-3")
    expect(tokens).toContain("lg:grid-cols-4")

    // Default page size divides cleanly across 2, 3, and 4 columns and keeps initial payload fast
    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 12 })
    )
    // Schools dropdown is lazy-loaded only when opening Add Member modal
    expect(schoolsSpy).not.toHaveBeenCalled()
  })

  it("lazy-loads verified schools only when opening Add Member and navigates to detail only on card click", async () => {
    const getMemberSpy = vi.spyOn(peopleApi, "getMember")
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    const { schoolsSpy } = renderPeoplePage({
      items: [
        {
          id: "usr_member_99",
          name: "Siti Rahma",
          username: "siti99",
          role: "member",
          user_number: "2026111099",
          is_claimed: true,
          created_at: "2026-10-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
      stats: { total: 1, member: 1, activist: 0, organizer: 0 },
    })

    await waitFor(() => {
      expect(screen.getByText("Siti Rahma")).toBeTruthy()
    })

    expect(getMemberSpy).not.toHaveBeenCalled()
    expect(schoolsSpy).not.toHaveBeenCalled()

    // Clicking copy ID button must not navigate to detail
    fireEvent.click(screen.getByRole("button", { name: /2026111099/i }))
    expect(mockNavigate).not.toHaveBeenCalled()

    // Clicking the card navigates to member detail
    fireEvent.click(screen.getByText("Siti Rahma"))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/people/$memberId",
      params: { memberId: "usr_member_99" },
    })

    // Opening Add Member triggers lazy school fetch
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }))
    await waitFor(() => {
      expect(schoolsSpy).toHaveBeenCalledTimes(1)
    })
  })

  it("connects Create New Member modal to master data schools and omits Role & Date of Birth fields", async () => {
    const origScrollIntoView = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = vi.fn()
    try {
      const createSpy = vi.spyOn(peopleApi, "createMember").mockResolvedValue({
        id: "usr_new_1",
        user_number: "2026111101",
        username: "sari4812",
        name: "Sari Dewi",
        role: "member",
        is_claimed: false,
        temporary_password: "sekkha12345puggala",
        whatsapp_invite_message: "Welcome Sari Dewi",
        school: "Universitas Multimedia Nusantara",
        school_id: "sch_umn",
        created_at: "2026-11-11T08:00:00Z",
      })

      const { schoolsSpy } = renderPeoplePage({
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 1,
        stats: { total: 0, member: 0, activist: 0, organizer: 0 },
      })

      schoolsSpy.mockResolvedValue([
        {
          id: "sch_umn",
          name: "Universitas Multimedia Nusantara",
          type: "Universitas",
        },
        {
          id: "sch_tr",
          name: "SMA Tri Ratna",
          type: "SMA/SMK",
        },
      ])

      fireEvent.click(await screen.findByRole("button", { name: /Add Member/i }))

      await waitFor(() => {
        expect(schoolsSpy).toHaveBeenCalledTimes(1)
      })

      // Role, Phone, and Date of Birth inputs must NOT exist in Create New Member modal
      expect(screen.queryByLabelText(/Initial Role/i)).toBeNull()
      expect(screen.queryByLabelText(/Phone Number/i)).toBeNull()
      expect(screen.queryByLabelText(/Date of Birth/i)).toBeNull()

      // Master Data school options should be wired to the School selector
      const schoolTrigger = screen.getByRole("combobox", {
        name: /School \/ Institution/i,
      })
      fireEvent.keyDown(schoolTrigger, { key: "ArrowDown" })

      const umnOption = await screen.findByRole("option", {
        name: /Universitas Multimedia Nusantara \(Universitas\)/i,
      })
      fireEvent.click(umnOption)

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: "Sari Dewi" },
      })

      fireEvent.click(screen.getByRole("button", { name: /Register Member/i }))

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          name: "Sari Dewi",
          school_id: "sch_umn",
        })
      })
      expect(createSpy.mock.calls[0][0]).not.toHaveProperty("role")
      expect(createSpy.mock.calls[0][0]).not.toHaveProperty("phone")
      expect(createSpy.mock.calls[0][0]).not.toHaveProperty("date_of_birth")
    } finally {
      HTMLElement.prototype.scrollIntoView = origScrollIntoView
    }
  })

  it("loads initial 5 schools in Create New Member dropdown and fetches page 2 on scroll", async () => {
    const origScrollIntoView = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = vi.fn()

    try {
      vi.spyOn(peopleApi, "listMembers").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 1,
        stats: { total: 0, member: 0, activist: 0, organizer: 0 },
      } as any)

      const schoolsSpy = vi
        .spyOn(peopleApi, "getVerifiedSchools")
        .mockImplementation(({ page = 1 } = {}) => {
          if (page === 2) {
            return Promise.resolve({
              items: [
                { id: "sch_6", name: "Universitas Tarumanagara", type: "Universitas", status: "active" },
              ],
              total: 6,
              page: 2,
              limit: 5,
              total_pages: 2,
              has_more: false,
            })
          }
          return Promise.resolve({
            items: [
              { id: "sch_1", name: "SMA 1", type: "SMA/SMK", status: "active" },
              { id: "sch_2", name: "SMA 2", type: "SMA/SMK", status: "active" },
              { id: "sch_3", name: "SMA 3", type: "SMA/SMK", status: "active" },
              { id: "sch_4", name: "SMA 4", type: "SMA/SMK", status: "active" },
              { id: "sch_5", name: "SMA 5", type: "SMA/SMK", status: "active" },
            ],
            total: 6,
            page: 1,
            limit: 5,
            total_pages: 2,
            has_more: true,
          })
        })

      const authState: AuthState = {
        ...initialAuthState,
        status: "authenticated",
        role: "admin",
        userId: "usr_admin_1",
      }

      render(
        <AuthContext.Provider value={{ authState } as any}>
          <PeoplePage />
        </AuthContext.Provider>
      )

      fireEvent.click(await screen.findByRole("button", { name: /Add Member/i }))

      await waitFor(() => {
        expect(schoolsSpy).toHaveBeenCalledWith({
          page: 1,
          limit: 5,
          search: undefined,
        })
      })

      const trigger = await waitFor(() => {
        const el = document.getElementById("people-create-school") as HTMLButtonElement
        expect(el.disabled).toBe(false)
        return el
      })
      fireEvent.click(trigger)
      fireEvent.keyDown(trigger, { key: "ArrowDown" })

      await screen.findByRole("option", { name: /SMA 5/i })
      expect(
        screen.queryByRole("option", { name: /Universitas Tarumanagara/i })
      ).toBeNull()

      const scrollList = document.querySelector(
        '[data-slot="select-infinite-list"]'
      ) as HTMLElement
      Object.defineProperty(scrollList, "scrollHeight", { value: 260, configurable: true })
      Object.defineProperty(scrollList, "clientHeight", { value: 168, configurable: true })
      Object.defineProperty(scrollList, "scrollTop", { value: 85, configurable: true })
      fireEvent.scroll(scrollList)

      await waitFor(() => {
        expect(schoolsSpy).toHaveBeenCalledWith({
          page: 2,
          limit: 5,
          search: undefined,
        })
        expect(
          screen.getByRole("option", { name: /Universitas Tarumanagara/i })
        ).toBeDefined()
      })
    } finally {
      HTMLElement.prototype.scrollIntoView = origScrollIntoView
    }
  })

  it("shows non-blocking similar members notice and See More modal on fuzzy match, and hides completely when empty", async () => {
    const similarSpy = vi
      .spyOn(peopleApi, "findSimilarMembers")
      .mockImplementation((name: string) => {
        if (name.toLowerCase().includes("budi")) {
          const allMatches = [
            {
              id: "usr_sim_1",
              user_number: 2026110101,
              username: "budi1492",
              name: "Budi Santoso",
              role: "member" as const,
              is_claimed: false,
              school: "SMA Tri Ratna",
              similarity_score: 92,
            },
            {
              id: "usr_sim_2",
              user_number: 2026110102,
              username: "budi8831",
              name: "Budi Hartono",
              role: "activist" as const,
              is_claimed: true,
              school: "UMN",
              similarity_score: 76,
            },
            {
              id: "usr_sim_3",
              user_number: 2026110103,
              username: "santo5510",
              name: "Santoso Budi",
              role: "member" as const,
              is_claimed: true,
              school: null,
              similarity_score: 71,
            },
            {
              id: "usr_sim_4",
              user_number: 2026110104,
              username: "budi4404",
              name: "Budi Wijaya",
              role: "member" as const,
              is_claimed: false,
              school: null,
              similarity_score: 68,
            },
            {
              id: "usr_sim_5",
              user_number: 2026110105,
              username: "budi5505",
              name: "Budi Pratama",
              role: "member" as const,
              is_claimed: true,
              school: null,
              similarity_score: 65,
            },
            {
              id: "usr_sim_6",
              user_number: 2026110106,
              username: "budi6606",
              name: "Budi Overflow Hidden",
              role: "member" as const,
              is_claimed: true,
              school: null,
              similarity_score: 60,
            },
          ]
          return Promise.resolve({
            items: allMatches,
            total: allMatches.length,
          })
        }
        return Promise.resolve({ items: [], total: 0 })
      })

    renderPeoplePage({
      items: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 1,
      stats: { total: 0, member: 0, activist: 0, organizer: 0 },
    })

    fireEvent.click(await screen.findByRole("button", { name: /Add Member/i }))

    // Empty initial state: banner & See More must be completely hidden
    expect(screen.queryByText(/Similar existing members found/i)).toBeNull()
    expect(screen.queryByRole("button", { name: /See More/i })).toBeNull()

    // Type similar name -> async debounced lookup runs and displays non-blocking notice above
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Budi Santosa" },
    })

    await waitFor(() => {
      expect(similarSpy).toHaveBeenCalledWith(
        "Budi Santosa",
        5,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
      expect(screen.getByText(/Similar existing members found/i)).toBeTruthy()
    })

    // Preview + See More button rendered, and Register Member remains enabled (non-blocking)
    expect(screen.getByText("Budi Santoso")).toBeTruthy()
    const seeMoreBtn = screen.getByRole("button", { name: /See More/i })
    expect(seeMoreBtn).toBeTruthy()
    expect(
      (screen.getByRole("button", { name: /Register Member/i }) as HTMLButtonElement).disabled
    ).toBe(false)

    // Clicking See More opens Similar Members Modal listing max 5 matches without closing Create form
    fireEvent.click(seeMoreBtn)
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Similar Existing Members/i })).toBeTruthy()
    })
    expect(screen.getByText("Santoso Budi")).toBeTruthy()
    expect(screen.getByText("Budi Pratama")).toBeTruthy()
    expect(screen.queryByText("Budi Overflow Hidden")).toBeNull()

    // Closing See More modal preserves Create New Member form & typed name
    fireEvent.click(screen.getByRole("button", { name: /Close similar members/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Similar Existing Members/i })).toBeNull()
    })
    expect((screen.getByLabelText(/Full Name/i) as HTMLInputElement).value).toBe("Budi Santosa")

    // Changing to unique name hides notice & See More again
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Zyxwvu Unique" },
    })
    await waitFor(() => {
      expect(screen.queryByText(/Similar existing members found/i)).toBeNull()
      expect(screen.queryByRole("button", { name: /See More/i })).toBeNull()
    })
  })
})

describe("peopleApi.getVerifiedSchools master data unwrapping", () => {
  it("requests initial limit=5 paginated schools and unwraps legacy/array responses cleanly", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue([
      {
        id: "sch_1",
        name: "SMA Tri Ratna",
        type: "SMA/SMK",
        is_active: true,
        status: "active",
      },
    ])

    const result = await peopleApi.getVerifiedSchools({ page: 1, limit: 5 })
    expect(getSpy).toHaveBeenCalledWith(
      "/configure/schools?is_active=true&page=1&limit=5&paginated=true",
      { noCache: true }
    )
    expect(result).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 5,
        has_more: false,
        items: [
          expect.objectContaining({
            id: "sch_1",
            name: "SMA Tri Ratna",
            type: "SMA/SMK",
          }),
        ],
      })
    )
  })
})
