import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { RequestSchoolModal } from "../RequestSchoolModal"
import { api } from "@/lib/api"
import * as pagination from "@/lib/pagination"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("RequestSchoolModal", () => {
  it("submits school name and selected Education Level to /configure/school-requests", async () => {
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn()
    }
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      data: {
        id: "sch_req_1",
        name: "SMA Maitreya",
        type: "SMA/SMK",
        status: "pending",
      },
    } as any)
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <RequestSchoolModal
        open={true}
        onOpenChange={onOpenChange}
        initialName="SMA Maitreya"
        onCreated={onCreated}
      />
    )

    const levelSelect = screen.getByRole("combobox")
    fireEvent.click(levelSelect)
    const uniOption = await screen.findByRole("option", {
      name: /University \/ College/i,
    })
    fireEvent.click(uniOption)

    fireEvent.click(screen.getByRole("button", { name: /Submit Request/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith("/configure/school-requests", {
        name: "SMA Maitreya",
        type: "Universitas",
      })
    })
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sch_req_1",
        name: "SMA Maitreya",
      })
    )
  })

  it("shows similar existing schools while typing and lets user select one without creating duplicate", async () => {
    vi.spyOn(pagination, "fetchSchoolsPaginated").mockResolvedValue({
      items: [
        {
          id: "sch_existing_1",
          name: "Universitas Multimedia Nusantara",
          type: "Universitas",
          status: "active",
        },
      ],
      total: 1,
      page: 1,
      limit: 5,
      total_pages: 1,
      has_more: false,
    })
    const postSpy = vi.spyOn(api, "post")
    const onSelectExisting = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <RequestSchoolModal
        open={true}
        onOpenChange={onOpenChange}
        initialName="Universitas Multimedia"
        onCreated={vi.fn()}
        onSelectExisting={onSelectExisting}
      />
    )

    const existingBtn = await screen.findByRole("button", {
      name: /Universitas Multimedia Nusantara/i,
    })
    fireEvent.click(existingBtn)

    expect(onSelectExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sch_existing_1",
        name: "Universitas Multimedia Nusantara",
      })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(postSpy).not.toHaveBeenCalled()
  })
})
