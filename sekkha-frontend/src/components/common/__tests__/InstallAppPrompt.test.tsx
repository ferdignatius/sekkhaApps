import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react"
import { InstallAppCard, InstallAppMenuItem } from "../InstallAppPrompt"
import { __resetPwaInstallStoreForTest } from "@/hooks/usePwaInstall"

describe("InstallAppCard (PWA Add to Home Screen)", () => {
  beforeEach(() => {
    __resetPwaInstallStoreForTest({ deferredPrompt: null, installed: false })
  })

  afterEach(() => {
    cleanup()
    __resetPwaInstallStoreForTest({ deferredPrompt: null, installed: false })
  })

  it("triggers native beforeinstallprompt when available and updates to App Installed on accept", async () => {
    const promptSpy = vi.fn().mockResolvedValue(undefined)
    const fakeEvent: any = {
      platforms: ["web"],
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
      prompt: promptSpy,
    }
    __resetPwaInstallStoreForTest({
      deferredPrompt: fakeEvent,
      installed: false,
    })

    render(<InstallAppCard />)

    const installBtn = screen.getByRole("button", { name: /Install This App/i })
    fireEvent.click(installBtn)

    await waitFor(() => {
      expect(promptSpy).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /App Installed/i })).toBeDefined()
    })
  })

  it("opens Add to Home Screen instructions modal when native install prompt is unavailable", async () => {
    __resetPwaInstallStoreForTest({ deferredPrompt: null, installed: false })

    render(<InstallAppCard />)

    const installBtn = screen.getByRole("button", { name: /Install This App/i })
    fireEvent.click(installBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Install Sekkha on Your Home Screen/i)
      ).toBeDefined()
    })
    expect(screen.getByText(/Add to Home screen/i)).toBeDefined()
  })

  it("delegates manual guide opening cleanly from InstallAppMenuItem and shows iOS instructions on iPhone userAgent", async () => {
    const origUa = navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    })

    const onSelectDone = vi.fn()
    const onOpenGuide = vi.fn()

    try {
      render(
        <InstallAppMenuItem
          onSelectDone={onSelectDone}
          onOpenGuide={onOpenGuide}
        />
      )

      fireEvent.click(screen.getByRole("button", { name: /Install This App/i }))

      await waitFor(() => {
        expect(onSelectDone).toHaveBeenCalledTimes(1)
        expect(onOpenGuide).toHaveBeenCalledTimes(1)
      })

      cleanup()
      render(<InstallAppCard />)
      fireEvent.click(screen.getByRole("button", { name: /Install This App/i }))
      await waitFor(() => {
        expect(screen.getByText(/Steps for iPhone \/ iPad \(Safari\)/i)).toBeDefined()
      })
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        value: origUa,
        configurable: true,
      })
    }
  })
})
