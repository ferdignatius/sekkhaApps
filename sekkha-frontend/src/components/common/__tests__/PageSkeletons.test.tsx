import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { EventsSkeleton, HomeSkeleton } from "../PageSkeletons"

describe("PageSkeletons", () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, "", "/")
  })

  it("renders EventDetailSkeleton when EventsSkeleton detects ?eventId= in URL", () => {
    window.history.replaceState({}, "", "/events?eventId=cmwoyjgi60005mg01lh7z5osc")
    render(<EventsSkeleton />)

    expect(screen.getByTestId("event-detail-loading-skeleton")).toBeTruthy()
  })

  it("renders Events calendar skeleton when URL has no ?eventId=", () => {
    window.history.replaceState({}, "", "/events")
    render(<EventsSkeleton />)

    expect(screen.queryByTestId("event-detail-loading-skeleton")).toBeNull()
    expect(screen.getByLabelText("Loading events...")).toBeTruthy()
  })

  it("renders HomeSkeleton with warm Sunrise layout without dark glass header", () => {
    render(<HomeSkeleton />)
    expect(screen.getByLabelText("Loading home...")).toBeTruthy()
  })
})
