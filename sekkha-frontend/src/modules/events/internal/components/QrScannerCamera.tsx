// feature/events/components/QrScannerCamera
// Live Camera QR Code Scanner with auto-detection, camera switching, audio feedback, secure context checks, and image upload fallback.

import { useEffect, useRef, useState, useCallback } from "react"
import type { MutableRefObject } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import {
  CameraIcon,
  RefreshCwIcon,
  VideoOffIcon,
  CheckCircle2Icon,
  ImageIcon,
  ShieldAlertIcon,
  UserPlusIcon,
} from "lucide-react"

type CameraTarget = string | { facingMode: "environment" | "user" }

function isVirtualOrIrCamera(label: string): boolean {
  return /virtual|obs|infrared|ir camera|snap camera|manycam|splitcam|droidcam/i.test(
    label
  )
}

function isRearCamera(label: string): boolean {
  return /back|rear|belakang|environment/i.test(label)
}

function sortPreferredCameras(
  devices: Array<{ id: string; label: string }>
): Array<{ id: string; label: string }> {
  return [...devices].sort((a, b) => {
    const aVirtual = isVirtualOrIrCamera(a.label) ? 1 : 0
    const bVirtual = isVirtualOrIrCamera(b.label) ? 1 : 0
    if (aVirtual !== bVirtual) return aVirtual - bVirtual
    const aRear = isRearCamera(a.label) ? 0 : 1
    const bRear = isRearCamera(b.label) ? 0 : 1
    return aRear - bRear
  })
}

async function enumerateVideoInputs(): Promise<
  Array<{ id: string; label: string }>
> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return []
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === "videoinput" && Boolean(d.deviceId))
      .map((d, idx) => ({
        id: d.deviceId,
        label: d.label || `Camera ${idx + 1}`,
      }))
  } catch {
    return []
  }
}

function formatCameraError(err: unknown): string {
  const errObj =
    typeof err === "object" && err !== null
      ? (err as { name?: string; message?: string })
      : null
  const rawErr =
    typeof err === "string"
      ? err
      : `${errObj?.name ?? ""} ${errObj?.message ?? ""}`.trim()

  if (
    /NotAllowedError|PermissionDeniedError|Permission/i.test(rawErr)
  ) {
    return "Camera permission was denied. Please click the padlock or site settings icon in your browser URL bar and allow camera access, then reload."
  }
  if (/NotFoundError|DevicesNotFoundError/i.test(rawErr)) {
    return "No camera found on your device."
  }
  if (
    /NotReadableError|TrackStartError|Could not start video source/i.test(
      rawErr
    )
  ) {
    return "Camera is currently being used by another application or tab (e.g., Zoom, Google Meet), or the selected video device could not be opened."
  }
  if (
    /secure context/i.test(rawErr) ||
    (typeof window !== "undefined" && !window.isSecureContext)
  ) {
    return "Browsers only allow camera streaming on localhost or HTTPS secure origins."
  }
  return "Failed to access camera. Please ensure camera permission is granted in your browser."
}

interface QrScannerCameraProps {
  onScan: (decodedText: string) => void
  onError?: (errorMessage: string) => void
  isPaused?: boolean
  scanDelayMs?: number
  isFullScreen?: boolean
  hideControls?: boolean
  onCamerasDetected?: (
    cameras: Array<{ id: string; label: string }>,
    selectedId: string
  ) => void
  externalCameraId?: string
  onSwitchToManual?: () => void
  actionsRef?: MutableRefObject<{ openGallery: () => void } | null>
}

export function QrScannerCamera({
  onScan,
  onError,
  isPaused = false,
  scanDelayMs = 1200,
  isFullScreen = false,
  hideControls = false,
  onCamerasDetected,
  externalCameraId,
  onSwitchToManual,
  actionsRef,
}: QrScannerCameraProps) {
  const containerId = useRef(
    `qr-scanner-${Math.random().toString(36).substring(2, 9)}`
  ).current
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(true)
  const isStartingRef = useRef(false)
  const prevExternalCameraId = useRef(externalCameraId)

  useEffect(() => {
    if (!actionsRef) return
    actionsRef.current = {
      openGallery: () => fileInputRef.current?.click(),
    }
    return () => {
      actionsRef.current = null
    }
  }, [actionsRef])

  // Stabilize callbacks using refs so they never trigger re-render loops
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  const onCamerasDetectedRef = useRef(onCamerasDetected)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    onCamerasDetectedRef.current = onCamerasDetected
  }, [onCamerasDetected])

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const [isInitializing, setIsInitializing] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isInsecureContext, setIsInsecureContext] = useState(false)
  const [isScanningActive, setIsScanningActive] = useState(false)
  const [lastScannedText, setLastScannedText] = useState<string | null>(null)
  const [processingFile, setProcessingFile] = useState(false)
  const lastScanTimestamp = useRef<number>(0)

  // Scan handler with debounce
  const handleDecoded = useCallback(
    (decodedText: string) => {
      const now = Date.now()
      if (now - lastScanTimestamp.current < scanDelayMs) {
        return // Ignore rapid consecutive scans
      }
      lastScanTimestamp.current = now
      setLastScannedText(decodedText)

      // Reset last scanned visual after 1s
      setTimeout(() => setLastScannedText(null), 1000)

      onScanRef.current?.(decodedText)
    },
    [scanDelayMs]
  )

  // Start Camera Stream with sequential fallback targets & unmount safety
  const startCamera = useCallback(
    async (
      primaryTarget: CameraTarget,
      fallbackTargets: CameraTarget[] = [],
      discoverDevicesOnFail = false
    ) => {
      const element = document.getElementById(containerId)
      if (!element || !scannerRef.current || isStartingRef.current) return

      isStartingRef.current = true
      try {
        setIsInitializing(true)
        setCameraError(null)

        // If scanner is already scanning, stop it first and give driver a moment to release
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop()
            await new Promise((resolve) => setTimeout(resolve, 200))
          } catch {}
        }

        // Clean config without aspectRatio/qrbox constraints so html5-qrcode
        // never triggers track.applyConstraints() leaks or distorts scan region
        const scanConfig = {
          fps: 15,
          disableFlip: false,
        }

        const attempts: CameraTarget[] = [primaryTarget, ...fallbackTargets]
        let lastErr: unknown = null
        let startedTarget: CameraTarget | null = null

        const tryTargets = async (targets: CameraTarget[]) => {
          for (let i = 0; i < targets.length; i++) {
            if (!isMountedRef.current || !scannerRef.current) return
            const target = targets[i]!
            try {
              await scannerRef.current.start(
                target,
                scanConfig,
                (decodedText) => handleDecoded(decodedText),
                () => {
                  // Frame scan without result — silent ignore
                }
              )
              startedTarget = target
              return
            } catch (attemptErr) {
              lastErr = attemptErr
              if (i < targets.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 200))
              }
            }
          }
        }

        await tryTargets(attempts)

        // Fallback: enumerate videoinputs (without opening an extra getUserMedia stream)
        if (
          startedTarget === null &&
          discoverDevicesOnFail &&
          isMountedRef.current
        ) {
          const discovered = sortPreferredCameras(await enumerateVideoInputs())
          if (discovered.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 200))
            await tryTargets(discovered.map((d) => d.id))
          }
        }

        // If component unmounted while getUserMedia was resolving, release camera immediately
        if (!isMountedRef.current) {
          if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop().catch(() => {})
          }
          try {
            scannerRef.current?.clear()
          } catch {}
          return
        }

        if (startedTarget !== null) {
          const detected = sortPreferredCameras(await enumerateVideoInputs())
          if (!isMountedRef.current) return
          if (detected.length > 0) {
            setCameras(detected)
            const chosenId =
              typeof startedTarget === "string"
                ? startedTarget
                : detected[0]!.id
            prevExternalCameraId.current = chosenId
            setSelectedCameraId(chosenId)
            onCamerasDetectedRef.current?.(detected, chosenId)
          } else if (typeof startedTarget === "string") {
            prevExternalCameraId.current = startedTarget
            setSelectedCameraId(startedTarget)
          }
          setIsScanningActive(true)
          setIsInitializing(false)
          return
        }

        const msg = formatCameraError(lastErr)
        setCameraError(msg)
        setIsScanningActive(false)
        setIsInitializing(false)
        onErrorRef.current?.(msg)
      } finally {
        isStartingRef.current = false
      }
    },
    [containerId, handleDecoded]
  )

  // Initialize Html5Qrcode and start stream ONCE on mount (single getUserMedia call)
  useEffect(() => {
    isMountedRef.current = true

    // Check secure context
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
    ) {
      setIsInsecureContext(true)
      setCameraError(
        "Camera streaming requires a secure origin (HTTPS or localhost)."
      )
      setIsInitializing(false)
      return () => {
        isMountedRef.current = false
      }
    }

    // Give DOM a small tick to ensure #containerId is mounted
    const timer = setTimeout(async () => {
      if (!isMountedRef.current) return

      const domElement = document.getElementById(containerId)
      if (!domElement) return

      try {
        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        })
        scannerRef.current = html5QrCode

        await startCamera(
          { facingMode: "environment" },
          [{ facingMode: "user" }],
          true
        )
      } catch (err: unknown) {
        if (isMountedRef.current) {
          setCameraError(formatCameraError(err))
          setIsInitializing(false)
        }
      }
    }, 100)

    return () => {
      isMountedRef.current = false
      clearTimeout(timer)
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {})
        } else {
          try {
            scannerRef.current.clear()
          } catch {}
        }
      }
    }
  }, [containerId, startCamera])

  // Sync external camera change only when user explicitly switches camera
  useEffect(() => {
    if (
      externalCameraId &&
      externalCameraId !== prevExternalCameraId.current &&
      externalCameraId !== selectedCameraId &&
      scannerRef.current
    ) {
      prevExternalCameraId.current = externalCameraId
      setSelectedCameraId(externalCameraId)
      void startCamera(externalCameraId)
    }
  }, [externalCameraId, selectedCameraId, startCamera])

  // Switch camera when user selects from dropdown
  function handleCameraChange(newCameraId: string) {
    prevExternalCameraId.current = newCameraId
    setSelectedCameraId(newCameraId)
    void startCamera(newCameraId)
  }

  // Restart camera action
  function handleRetry() {
    if (selectedCameraId) {
      const otherIds = cameras
        .filter((c) => c.id !== selectedCameraId)
        .map((c) => c.id)
      void startCamera(
        selectedCameraId,
        [...otherIds, { facingMode: "environment" }, { facingMode: "user" }],
        true
      )
    } else {
      void startCamera(
        { facingMode: "environment" },
        [{ facingMode: "user" }],
        true
      )
    }
  }

  // File upload scan fallback
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !scannerRef.current) return

    const wasScanning = scannerRef.current.isScanning
    try {
      setProcessingFile(true)
      setCameraError(null)

      // Stop camera if running before file scan
      if (wasScanning) {
        await scannerRef.current.stop()
      }

      const decodedText = await scannerRef.current.scanFile(file, false)
      handleDecoded(decodedText)
    } catch (err: any) {
      console.warn("Failed to read QR from image:", err)
      setCameraError(
        "Could not detect a valid QR code in the uploaded image. Please ensure the image is clear and focused."
      )
    } finally {
      setProcessingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (wasScanning && isMountedRef.current) {
        void startCamera(
          selectedCameraId || { facingMode: "environment" },
          [{ facingMode: "user" }],
          true
        )
      }
    }
  }

  return (
    <div
      className={`flex flex-col items-center justify-center overflow-hidden ${
        isFullScreen
          ? "absolute inset-0 h-full w-full rounded-none border-0 bg-black p-0"
          : "relative h-full max-h-full w-full max-w-full rounded-2xl border border-[#e5e5e5] bg-[#102828] p-2 shadow-inner"
      }`}
    >
      {/* Camera Video Viewport Container */}
      <div
        className={`relative flex items-center justify-center overflow-hidden ${
          isFullScreen
            ? "h-full w-full flex-1 rounded-none bg-[#f5f0e0]"
            : "aspect-square h-full max-h-[320px] w-full max-w-full rounded-xl bg-[#f5f0e0]"
        }`}
      >
        {/* Fixed full-bleed wrapper protects against html5-qrcode setting style.position='relative' on #containerId */}
        <div
          className={
            isFullScreen
              ? "absolute inset-0 h-full w-full overflow-hidden"
              : "relative h-full w-full overflow-hidden"
          }
        >
          {/* Html5Qrcode target DOM element (fill container proportionally while keeping video clientWidth/clientHeight 1:1 with native ratio) */}
          <div
            id={containerId}
            className="flex h-full w-full items-center justify-center overflow-hidden [&_canvas]:!hidden [&_video]:!h-auto [&_video]:!min-h-full [&_video]:!w-auto [&_video]:!min-w-full [&_video]:!max-w-none [&_video]:!shrink-0"
          />
        </div>

        {/* Loading Spinner */}
        {isInitializing && !cameraError && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#fffaf0]/95 text-[#0a0a0a] backdrop-blur-xs"
          >
            <RefreshCwIcon className="size-8 animate-spin text-[#e8b94a]" />
            <p className="text-caption font-medium text-[#6a6a6a]">
              Connecting to camera...
            </p>
          </div>
        )}

        {/* Insecure Context Warning */}
        {isInsecureContext && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-[#fffaf0] p-6 text-center text-[#0a0a0a]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e8b94a]/40 bg-[#e8b94a]/15 text-[#9a6e13]">
              <ShieldAlertIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-caption-bold text-[#0a0a0a]">
                Camera Blocked (Non-HTTPS)
              </p>
              <p className="text-caption max-w-xs leading-relaxed text-[#6a6a6a]">
                Browser only permits camera access on <code>localhost</code> or{" "}
                <code>https://</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-caption-bold flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-3.5 py-2 font-bold text-white shadow-sm transition-all hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf0] focus-visible:outline-none"
            >
              <ImageIcon className="size-4" />
              <span>Upload QR Code Image</span>
            </button>
          </div>
        )}

        {/* Camera Permission / Device Error */}
        {!isInsecureContext && cameraError && (
          <div
            role="alert"
            aria-live="assertive"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-[#fffaf0] p-5 text-center text-[#0a0a0a]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600">
              <VideoOffIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-caption-bold text-rose-700">
                Camera Unavailable
              </p>
              <p className="max-w-xs text-[11px] leading-relaxed text-[#6a6a6a]">
                {cameraError}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="text-caption flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1.5 font-semibold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#ebe6d6] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:outline-none"
              >
                <RefreshCwIcon className="size-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-caption flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-3 py-1.5 font-bold text-white shadow-xs transition-all hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf0] focus-visible:outline-none"
              >
                <ImageIcon className="size-3.5" />
                <span>Select QR Image</span>
              </button>

              {onSwitchToManual && (
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="text-caption flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[12px] border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white shadow-xs transition-all hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#e8b94a] focus-visible:outline-none"
                >
                  <UserPlusIcon className="size-3.5" />
                  <span>Manual Entry</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Processing File Loader */}
        {processingFile && (
          <div className="absolute inset-0 z-25 flex flex-col items-center justify-center gap-2 bg-[#102828]/95 text-white backdrop-blur-xs">
            <RefreshCwIcon className="size-7 animate-spin text-amber-400" />
            <p className="text-caption font-medium">
              Scanning QR from image...
            </p>
          </div>
        )}

        {/* Live Visual Overlay (Full-Screen Bright Camera Feed, Corner Guides, Laser Sweep & Bottom Action Row) */}
        {!isInitializing && !cameraError && isScanningActive && !isPaused && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
            {/* Top Instruction Pill */}
            <p className="mb-4 rounded-full bg-black/45 px-3.5 py-1 text-[11px] font-medium tracking-wide text-white/95 shadow-sm backdrop-blur-sm">
              Point camera anywhere at member&apos;s QR code
            </p>

            {/* Full-screen Subtle Corner Guides (no dark mask restricting view) */}
            <div
              className={`relative ${
                isFullScreen
                  ? "xs:size-64 size-60 max-h-[68vw] max-w-[68vw] sm:size-72"
                  : "max-size-[220px] size-[65%]"
              } aspect-square rounded-2xl`}
            >
              {/* Crisp L-Shaped Corner Brackets */}
              <div className="absolute -top-0.5 -left-0.5 size-8 rounded-tl-2xl border-t-[3px] border-l-[3px] border-amber-300/90 drop-shadow" />
              <div className="absolute -top-0.5 -right-0.5 size-8 rounded-tr-2xl border-t-[3px] border-r-[3px] border-amber-300/90 drop-shadow" />
              <div className="absolute -bottom-0.5 -left-0.5 size-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-amber-300/90 drop-shadow" />
              <div className="absolute -right-0.5 -bottom-0.5 size-8 rounded-br-2xl border-r-[3px] border-b-[3px] border-amber-300/90 drop-shadow" />

              {/* Smooth Sweeping Laser Scan Line */}
              <div className="animate-qr-sweep absolute right-2 left-2 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24]" />
            </div>

            {/* Compact Gallery button only when inline controls aren't hoisted to parent menu */}
            {!hideControls && (
              <div className="pointer-events-auto mt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-[#102828]/85 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-lg backdrop-blur-md transition-colors hover:bg-[#1a3a3a]"
                >
                  <ImageIcon className="size-3.5" />
                  <span>Upload QR Image</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scan Success Pulse Overlay */}
        {lastScannedText && (
          <div className="absolute inset-0 z-30 flex animate-in flex-col items-center justify-center gap-2 bg-emerald-950/85 text-emerald-300 backdrop-blur-xs duration-200 fade-in zoom-in">
            <CheckCircle2Icon className="size-14 animate-bounce text-emerald-400" />
            <p className="text-title-sm font-bold text-white">
              QR Code Detected!
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Standard Camera Controls Footer (Hidden when hideControls is true) */}
      {!hideControls && (
        <div className="mt-2 flex w-full items-center justify-between gap-2 px-1 text-white">
          {cameras.length > 1 ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <label
                htmlFor="camera-select"
                className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400"
              >
                <CameraIcon className="size-3.5" />
                <span>Camera:</span>
              </label>
              <select
                id="camera-select"
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="flex-1 truncate rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-amber-400"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">Scanner Active</span>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-white"
            title="Scan from photo or screenshot"
          >
            <ImageIcon className="size-3.5 text-amber-400" />
            <span>Upload QR</span>
          </button>
        </div>
      )}
    </div>
  )
}
