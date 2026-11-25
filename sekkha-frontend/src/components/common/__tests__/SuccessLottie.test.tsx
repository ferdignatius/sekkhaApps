import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, waitFor, fireEvent, act } from "@testing-library/react"
import {
  SuccessLottie,
  SuccessCelebrationModal,
  SUCCESS_LOTTIE_ASSET_PATH,
} from "../SuccessLottie"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("SuccessLottie & SuccessCelebrationModal", () => {
  it("mounts animated SVG from /assets/success.json", async () => {
    const successJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/assets/success.json"), "utf-8")
    )

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successJson),
    } as Response)

    render(<SuccessLottie className="size-20" />)

    const container = screen.getByTestId("success-lottie")
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(SUCCESS_LOTTIE_ASSET_PATH)
      expect(container.querySelector("svg")).not.toBeNull()
    })
  })

  it("calls onComplete immediately on Continue click and auto-completes after autoCloseMs", () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()

    render(
      <SuccessCelebrationModal
        open={true}
        title="Welcome to Sekkha!"
        description="Your profile is ready."
        actionLabel="Go to Dashboard"
        autoCloseMs={1800}
        onComplete={onComplete}
      />
    )

    expect(screen.getByText("Welcome to Sekkha!")).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)

    cleanup()
    const onManualComplete = vi.fn()
    render(
      <SuccessCelebrationModal
        open={true}
        title="Done!"
        actionLabel="Continue"
        onComplete={onManualComplete}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    expect(onManualComplete).toHaveBeenCalledTimes(1)
  })
})
