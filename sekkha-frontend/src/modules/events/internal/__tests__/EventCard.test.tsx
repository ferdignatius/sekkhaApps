import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { EventCard } from "../components/EventCard"
import type { EventListItem } from "../types"

afterEach(cleanup)

describe("EventCard Business Component (FE-16)", () => {
  const sampleEvent: EventListItem = {
    id: "evt-001",
    title: "Kebaktian Minggu Pagi",
    description: "Kebaktian rutin pemuda-pemudi vihara.",
    event_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    location: "Dhammasala Utama",
    tag: "meditation",
    event_type: "routine",
    status: "scheduled",
  }

  it("renders event title, location, and category tag", () => {
    const handleClick = vi.fn()
    render(<EventCard event={sampleEvent} onClick={handleClick} />)

    expect(screen.getByText("Kebaktian Minggu Pagi")).toBeTruthy()
    expect(screen.getByText("Dhammasala Utama")).toBeTruthy()
    expect(screen.getByText("Meditation")).toBeTruthy()
  })

  it("invokes onClick callback when the card is clicked", () => {
    const handleClick = vi.fn()
    render(<EventCard event={sampleEvent} onClick={handleClick} />)

    const cardButton = screen.getByRole("button")
    fireEvent.click(cardButton)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("renders Closed badge when status is closed", () => {
    const closedEvent: EventListItem = {
      ...sampleEvent,
      status: "closed",
    }
    render(<EventCard event={closedEvent} onClick={vi.fn()} />)

    expect(screen.getByText("Closed")).toBeTruthy()
  })

  it("renders Cancelled badge when status is cancelled", () => {
    const cancelledEvent: EventListItem = {
      ...sampleEvent,
      status: "cancelled",
    }
    render(<EventCard event={cancelledEvent} onClick={vi.fn()} />)

    expect(screen.getByText("Cancelled")).toBeTruthy()
  })

  it("renders Today indicator when event date is today", () => {
    const todayEvent: EventListItem = {
      ...sampleEvent,
      event_date: new Date().toISOString(),
    }
    render(<EventCard event={todayEvent} onClick={vi.fn()} />)

    expect(screen.getByText("Today")).toBeTruthy()
  })

  it("handles event_type as an object without crashing (API compatibility)", () => {
    const objectTypeEvent: EventListItem = {
      id: "evt-002",
      title: "Workshop Mindfulness",
      location: "Ruang Diskusi",
      event_date: new Date(Date.now() + 86400000).toISOString(),
      status: "scheduled",
      event_type: {
        id: "type-1",
        code: "workshop",
        label: "Workshop",
        color: "#10b981",
      },
    }
    render(<EventCard event={objectTypeEvent} onClick={vi.fn()} />)

    expect(screen.getByText("Workshop Mindfulness")).toBeTruthy()
    expect(screen.getByText("Workshop")).toBeTruthy()
  })
})
