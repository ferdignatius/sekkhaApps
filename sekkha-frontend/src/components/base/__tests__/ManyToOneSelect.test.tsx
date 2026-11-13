import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import { useState } from "react"
import { ManyToOneSelect, M2OSelect } from "../ManyToOneSelect"
import type { ManyToOneSelectOption } from "../ManyToOneSelect"

const sampleOptions: ManyToOneSelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "durian", label: "Durian" },
  { value: "elderberry", label: "Elderberry" },
]

beforeEach(() => {
  if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ManyToOneSelect (M2OSelect)", () => {
  it("renders standard dropdown trigger with label, placeholder, and combobox role", () => {
    render(
      <ManyToOneSelect
        label="Favorite Fruit"
        placeholder="Choose a fruit..."
        options={sampleOptions}
      />
    )

    expect(screen.getByText("Favorite Fruit")).toBeDefined()
    const trigger = screen.getByRole("combobox")
    expect(trigger).toBeDefined()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(trigger.textContent).toContain("Choose a fruit...")
  })

  it("renders selected option label on trigger when value is provided", () => {
    render(
      <ManyToOneSelect
        value="banana"
        placeholder="Choose a fruit..."
        options={sampleOptions}
      />
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger.textContent).toContain("Banana")
  })

  it("renders error state when error prop is set", () => {
    render(
      <ManyToOneSelect error="Selection is required" options={sampleOptions} />
    )

    expect(screen.getByText("Selection is required")).toBeDefined()
    const trigger = screen.getByRole("combobox")
    expect(trigger.className).toContain("border-[#ef4444]")
  })

  it("opens dropdown and filters items via client-side search and onSearchChange", () => {
    const handleSearchChange = vi.fn()

    render(
      <ManyToOneSelect
        options={sampleOptions}
        onSearchChange={handleSearchChange}
      />
    )

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")

    const searchInput = screen.getByPlaceholderText("Search...")
    expect(searchInput).toBeDefined()

    const listbox = screen.getByRole("listbox")
    expect(listbox.getAttribute("data-slot")).toBe("select-infinite-list")

    // All options visible initially
    expect(screen.getAllByRole("option")).toHaveLength(sampleOptions.length)

    // Type in search query
    fireEvent.change(searchInput, { target: { value: "ban" } })
    expect(handleSearchChange).toHaveBeenCalledWith("ban")

    // Client filtering matches "Banana"
    const filteredOptions = screen.getAllByRole("option")
    expect(filteredOptions).toHaveLength(1)
    expect(filteredOptions[0].textContent).toContain("Banana")

    // Clear search using clear button
    const clearSearchBtn = screen.getByLabelText("Clear search")
    fireEvent.click(clearSearchBtn)
    expect(screen.getAllByRole("option")).toHaveLength(sampleOptions.length)
  })

  it("navigates options via keyboard (ArrowDown, ArrowUp, Enter, Escape)", () => {
    const handleValueChange = vi.fn()

    render(
      <ManyToOneSelect
        options={sampleOptions}
        onValueChange={handleValueChange}
      />
    )

    const trigger = screen.getByRole("combobox")

    // ArrowDown opens closed dropdown
    fireEvent.keyDown(trigger, { key: "ArrowDown" })
    expect(trigger.getAttribute("aria-expanded")).toBe("true")

    const options = screen.getAllByRole("option")
    expect(options[0].className).toContain("bg-[#faf5e8]") // First item highlighted

    // ArrowDown moves highlight to second item
    fireEvent.keyDown(trigger, { key: "ArrowDown" })
    expect(options[1].className).toContain("bg-[#faf5e8]")

    // ArrowUp moves highlight back to first item
    fireEvent.keyDown(trigger, { key: "ArrowUp" })
    expect(options[0].className).toContain("bg-[#faf5e8]")

    // Enter selects highlighted item and closes dropdown
    fireEvent.keyDown(trigger, { key: "Enter" })
    expect(handleValueChange).toHaveBeenCalledWith("apple", sampleOptions[0])
    expect(trigger.getAttribute("aria-expanded")).toBe("false")

    // Reopen and test Escape key to close
    fireEvent.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    fireEvent.keyDown(trigger, { key: "Escape" })
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  it("triggers infinite scroll onLoadMore when scrolling list container near bottom", async () => {
    const handleLoadMore = vi.fn()

    render(
      <ManyToOneSelect
        options={sampleOptions}
        hasMore={true}
        totalCount={10}
        onLoadMore={handleLoadMore}
      />
    )

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const scrollList = document.querySelector(
      '[data-slot="select-infinite-list"]'
    ) as HTMLElement
    expect(scrollList).not.toBeNull()

    Object.defineProperty(scrollList, "scrollHeight", {
      value: 300,
      configurable: true,
    })
    Object.defineProperty(scrollList, "clientHeight", {
      value: 150,
      configurable: true,
    })
    Object.defineProperty(scrollList, "scrollTop", {
      value: 130,
      configurable: true,
    })

    fireEvent.scroll(scrollList)

    await waitFor(() => {
      expect(handleLoadMore).toHaveBeenCalled()
    })
  })

  it("selects an item upon clicking option and updates uncontrolled value", () => {
    function UncontrolledHarness() {
      return (
        <ManyToOneSelect options={sampleOptions} placeholder="Select fruit" />
      )
    }

    render(<UncontrolledHarness />)

    const trigger = screen.getByRole("combobox")
    expect(trigger.textContent).toContain("Select fruit")

    fireEvent.click(trigger)
    const cherryOption = screen.getByRole("option", { name: /Cherry/i })
    fireEvent.click(cherryOption)

    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(trigger.textContent).toContain("Cherry")
  })

  it("selects an item and calls onChange and onValueChange in controlled mode", () => {
    const handleChange = vi.fn()
    const handleValueChange = vi.fn()

    function ControlledHarness() {
      const [val, setVal] = useState("apple")
      return (
        <ManyToOneSelect
          value={val}
          onChange={(v, opt) => {
            handleChange(v, opt)
            setVal(v)
          }}
          onValueChange={handleValueChange}
          options={sampleOptions}
        />
      )
    }

    render(<ControlledHarness />)

    const trigger = screen.getByRole("combobox")
    expect(trigger.textContent).toContain("Apple")

    fireEvent.click(trigger)
    const durianOption = screen.getByRole("option", { name: /Durian/i })
    fireEvent.click(durianOption)

    expect(handleValueChange).toHaveBeenCalledWith("durian", sampleOptions[3])
    expect(handleChange).toHaveBeenCalledWith("durian", sampleOptions[3])
    expect(trigger.textContent).toContain("Durian")
  })

  it("works identically when using M2OSelect alias", () => {
    expect(M2OSelect).toBe(ManyToOneSelect)

    const handleValueChange = vi.fn()
    render(
      <M2OSelect
        label="Alias Test"
        placeholder="Pick one"
        options={sampleOptions}
        onValueChange={handleValueChange}
      />
    )

    expect(screen.getByText("Alias Test")).toBeDefined()
    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)
    const banana = screen.getByRole("option", { name: /Banana/i })
    fireEvent.click(banana)

    expect(handleValueChange).toHaveBeenCalledWith("banana", sampleOptions[1])
  })
})
