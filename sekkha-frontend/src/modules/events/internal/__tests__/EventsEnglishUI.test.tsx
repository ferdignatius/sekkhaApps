import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { EventCard } from "../components/EventCard"
import type { EventListItem } from "../types"

describe("Events Module English UI Compliance", () => {
  const baseEvent: EventListItem = {
    id: "evt-test-1",
    title: "Sunday Meditation",
    description: "Weekly youth session",
    event_date: new Date(Date.now() + 86400000).toISOString(),
    location: "Main Hall",
    tag: "meditation",
    event_type: "routine",
    status: "scheduled",
  }

  it("renders scheduled status in English", () => {
    const { unmount } = render(<EventCard event={{ ...baseEvent, status: "scheduled" }} onClick={() => {}} />)
    expect(screen.getByText("Scheduled")).toBeTruthy()
    expect(screen.getByText("Details")).toBeTruthy()
    unmount()
  })

  it("renders active status in English as Live Attendance", () => {
    const { unmount } = render(<EventCard event={{ ...baseEvent, status: "active" }} onClick={() => {}} />)
    expect(screen.getByText("Live Attendance")).toBeTruthy()
    unmount()
  })

  it("renders closed status in English as Closed", () => {
    const { unmount } = render(<EventCard event={{ ...baseEvent, status: "closed" }} onClick={() => {}} />)
    expect(screen.getByText("Closed")).toBeTruthy()
    unmount()
  })

  it("renders cancel status in English as Cancelled", () => {
    const { unmount } = render(<EventCard event={{ ...baseEvent, status: "cancel" }} onClick={() => {}} />)
    expect(screen.getByText("Cancelled")).toBeTruthy()
    unmount()
  })
})
