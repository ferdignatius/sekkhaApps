// feature/events/components/QrScannerCamera
// Live Camera QR Code Scanner with auto-detection, camera switching, audio feedback, secure context checks, and image upload fallback.

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import {
  CameraIcon,
  RefreshCwIcon,
  VideoOffIcon,
  CheckCircle2Icon,
  SparklesIcon,
  ImageIcon,
  ShieldAlertIcon,
} from "lucide-react"

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
}

// Synthesize a pleasant beep chime using Web Audio API
function playScanChime() {
  try {
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12) // E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Ignore audio context errors if blocked by browser policy
  }
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
}: QrScannerCameraProps) {
  const containerId = useRef(
    `qr-scanner-${Math.random().toString(36).substring(2, 9)}`
  ).current
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      playScanChime()

      // Reset last scanned visual after 1s
      setTimeout(() => setLastScannedText(null), 1000)

      onScanRef.current?.(decodedText)
    },
    [scanDelayMs]
  )

  // Start Camera Stream
  const startCamera = useCallback(
    async (
      cameraIdOrFacing: string | { facingMode: "environment" | "user" }
    ) => {
      const element = document.getElementById(containerId)
      if (!element || !scannerRef.current) return

      try {
        setIsInitializing(true)
        setCameraError(null)

        // If scanner is already scanning, stop it first safely
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop()
          } catch {}
        }

        const isMobileScreen =
          typeof window !== "undefined" && window.innerWidth < 640

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(
              viewfinderWidth || 300,
              viewfinderHeight || 300
            )
            const qrEdge = Math.floor(minEdge * 0.72)
            const edge = Math.max(180, Math.min(qrEdge, 300))
            return { width: edge, height: edge }
          },
          aspectRatio: isFullScreen
            ? isMobileScreen
              ? undefined
              : 16 / 9
            : 1.0,
        }

        await scannerRef.current.start(
          cameraIdOrFacing,
          config,
          (decodedText) => handleDecoded(decodedText),
          () => {
            // Frame scan without result — silent ignore
          }
        )

        setIsScanningActive(true)
        setIsInitializing(false)
      } catch (err: any) {
        console.error("Gagal memulai kamera scanner:", err)
        let msg =
          "Gagal mengakses kamera. Pastikan izin kamera sudah diberikan di browser."

        if (
          err?.name === "NotAllowedError" ||
          err?.message?.includes("Permission") ||
          err?.name === "PermissionDeniedError"
        ) {
          msg =
            "Izin kamera ditolak. Harap klik ikon gembok/pengaturan di samping URL browser Anda dan pilih 'Izinkan Kamera', lalu muat ulang halaman."
        } else if (
          err?.name === "NotFoundError" ||
          err?.name === "DevicesNotFoundError"
        ) {
          msg = "Kamera tidak ditemukan pada perangkat Anda."
        } else if (
          err?.name === "NotReadableError" ||
          err?.name === "TrackStartError"
        ) {
          msg =
            "Kamera sedang digunakan oleh aplikasi lain (misal Zoom, Meet, atau tab lain). Harap tutup aplikasi tersebut."
        } else if (
          err?.message?.includes("secure context") ||
          (typeof window !== "undefined" && !window.isSecureContext)
        ) {
          msg =
            "Browser hanya mengizinkan kamera pada localhost atau HTTPS. Jika mengakses via IP lokal (misal 192.168.x.x), browser memblokir kamera."
        }

        setCameraError(msg)
        setIsScanningActive(false)
        setIsInitializing(false)
        onErrorRef.current?.(msg)
      }
    },
    [containerId, handleDecoded]
  )

  // Initialize Html5Qrcode and start stream ONCE on mount
  useEffect(() => {
    let isMounted = true

    // Check secure context
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location.hostname !== "localhost"
    ) {
      setIsInsecureContext(true)
      setCameraError("Kamera memerlukan koneksi aman (HTTPS atau localhost).")
      setIsInitializing(false)
      return
    }

    // Give DOM a small tick to ensure #containerId is mounted
    const timer = setTimeout(async () => {
      if (!isMounted) return

      const domElement = document.getElementById(containerId)
      if (!domElement) return

      try {
        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        })
        scannerRef.current = html5QrCode

        // Try getting cameras
        try {
          const devices = await Html5Qrcode.getCameras()
          if (!isMounted) return

          if (devices && devices.length > 0) {
            setCameras(devices)
            const backCam = devices.find(
              (d) =>
                d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("rear") ||
                d.label.toLowerCase().includes("belakang") ||
                d.label.toLowerCase().includes("environment")
            )
            const chosenId = backCam ? backCam.id : devices[0]!.id
            setSelectedCameraId(chosenId)
            onCamerasDetectedRef.current?.(devices, chosenId)
            await startCamera(chosenId)
          } else {
            await startCamera({ facingMode: "environment" })
          }
        } catch {
          if (isMounted) {
            await startCamera({ facingMode: "environment" })
          }
        }
      } catch (err: any) {
        console.error("Inisialisasi scanner gagal:", err)
        if (isMounted) {
          setCameraError(err?.message || "Gagal menginisialisasi kamera.")
          setIsInitializing(false)
        }
      }
    }, 100)

    return () => {
      isMounted = false
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
  const prevExternalCameraId = useRef(externalCameraId)
  useEffect(() => {
    if (
      externalCameraId &&
      externalCameraId !== prevExternalCameraId.current &&
      externalCameraId !== selectedCameraId &&
      scannerRef.current
    ) {
      prevExternalCameraId.current = externalCameraId
      setSelectedCameraId(externalCameraId)
      startCamera(externalCameraId)
    }
  }, [externalCameraId, selectedCameraId, startCamera])

  // Switch camera when user selects from dropdown
  function handleCameraChange(newCameraId: string) {
    setSelectedCameraId(newCameraId)
    startCamera(newCameraId)
  }

  // Restart camera action
  function handleRetry() {
    if (selectedCameraId) {
      startCamera(selectedCameraId)
    } else {
      startCamera({ facingMode: "environment" })
    }
  }

  // File upload scan fallback
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !scannerRef.current) return

    try {
      setProcessingFile(true)
      setCameraError(null)

      // Stop camera if running before file scan
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop()
      }

      const decodedText = await scannerRef.current.scanFile(file, true)
      handleDecoded(decodedText)
    } catch (err: any) {
      console.warn("Gagal membaca QR dari gambar:", err)
      setCameraError(
        "Tidak dapat menemukan atau membaca QR code dari gambar yang diunggah. Pastikan gambar jelas dan tidak buram."
      )
    } finally {
      setProcessingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div
      className={`relative flex h-full max-h-full w-full max-w-full flex-col items-center justify-center overflow-hidden ${
        isFullScreen
          ? "flex-1 rounded-none border-0 bg-black p-0"
          : "rounded-2xl border border-[#e5e5e5] bg-[#0a0a0a] p-2 shadow-inner"
      }`}
    >
      {/* Camera Video Viewport Container */}
      <div
        className={`relative flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden bg-black ${
          isFullScreen
            ? "aspect-auto max-h-none flex-1 rounded-none"
            : "aspect-square max-h-[320px] rounded-xl"
        }`}
      >
        {/* Html5Qrcode target DOM element */}
        <div
          id={containerId}
          className="flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden [&_canvas]:!hidden [&_video]:!h-full [&_video]:!max-h-full [&_video]:!w-full [&_video]:!max-w-full [&_video]:!object-cover [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full [&>div]:!overflow-hidden [&>div]:!border-none [&>div]:!shadow-none"
        />

        {/* Loading Spinner */}
        {isInitializing && !cameraError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]/90 text-white backdrop-blur-xs">
            <RefreshCwIcon className="size-8 animate-spin text-amber-400" />
            <p className="text-caption font-medium">
              Menghubungkan ke kamera...
            </p>
          </div>
        )}

        {/* Insecure Context Warning */}
        {isInsecureContext && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-[#0a0a0a] p-6 text-center text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
              <ShieldAlertIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-caption-bold text-amber-300">
                Kamera Diblokir (Non-HTTPS)
              </p>
              <p className="text-caption max-w-xs leading-relaxed text-slate-300">
                Browser hanya mengizinkan kamera pada <code>localhost</code>{" "}
                atau <code>https://</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-caption-bold flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#e8b94a] px-3.5 py-2 font-bold text-[#0a0a0a] shadow-sm transition-all hover:bg-amber-400"
            >
              <ImageIcon className="size-4" />
              <span>Unggah Foto QR Code</span>
            </button>
          </div>
        )}

        {/* Camera Permission / Device Error */}
        {!isInsecureContext && cameraError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-[#0a0a0a] p-5 text-center text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/20 text-rose-400">
              <VideoOffIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-caption-bold text-rose-300">
                Kamera Belum Terbuka
              </p>
              <p className="max-w-xs text-[11px] leading-relaxed text-slate-300">
                {cameraError}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="text-caption flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 font-semibold text-white shadow-xs transition-all hover:bg-white/25"
              >
                <RefreshCwIcon className="size-3.5" />
                <span>Coba Lagi</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-caption flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#e8b94a] px-3 py-1.5 font-bold text-[#0a0a0a] shadow-xs transition-all hover:bg-amber-400"
              >
                <ImageIcon className="size-3.5" />
                <span>Pilih Foto QR</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing File Loader */}
        {processingFile && (
          <div className="absolute inset-0 z-25 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]/90 text-white backdrop-blur-xs">
            <RefreshCwIcon className="size-7 animate-spin text-amber-400" />
            <p className="text-caption font-medium">
              Membaca QR dari gambar...
            </p>
          </div>
        )}

        {/* Live Visual Overlay (Target Frame & Animated Laser QRIS style) */}
        {!isInitializing && !cameraError && isScanningActive && !isPaused && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
            {/* Viewfinder Target Box */}
            <div
              className={`relative ${isFullScreen ? "xs:size-60 size-52 max-h-[70vw] max-w-[70vw] sm:size-72" : "max-size-[220px] size-[65%]"} aspect-square rounded-3xl border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]`}
            >
              {/* Golden Corner Accents */}
              <div className="absolute -top-1.5 -left-1.5 size-6 rounded-tl-xl border-t-4 border-l-4 border-amber-300" />
              <div className="absolute -top-1.5 -right-1.5 size-6 rounded-tr-xl border-t-4 border-r-4 border-amber-300" />
              <div className="absolute -bottom-1.5 -left-1.5 size-6 rounded-bl-xl border-b-4 border-l-4 border-amber-300" />
              <div className="absolute -right-1.5 -bottom-1.5 size-6 rounded-br-xl border-r-4 border-b-4 border-amber-300" />

              {/* Animated Laser Scan Line */}
              <div className="absolute right-1 left-1 h-0.5 animate-bounce bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24]" />

              {/* Center Watermark Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center text-white opacity-25">
                <SparklesIcon className="size-6" />
              </div>
            </div>

            {/* Hint Tag under Viewfinder */}
            <div className="mt-4">
              <span className="text-caption rounded-full border border-white/15 bg-black/80 px-4 py-1.5 font-medium text-white/95 shadow-md backdrop-blur-md">
                Arahkan QR ke dalam kotak
              </span>
            </div>
          </div>
        )}

        {/* Scan Success Pulse Overlay */}
        {lastScannedText && (
          <div className="absolute inset-0 z-30 flex animate-in flex-col items-center justify-center gap-2 bg-emerald-950/85 text-emerald-300 backdrop-blur-xs duration-200 fade-in zoom-in">
            <CheckCircle2Icon className="size-14 animate-bounce text-emerald-400" />
            <p className="text-title-sm font-bold text-white">
              QR Berhasil Terdeteksi!
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
                <span>Kamera:</span>
              </label>
              <select
                id="camera-select"
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="flex-1 truncate rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-amber-400"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">Scanner Aktif</span>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-white"
            title="Scan dari Foto / Screenshot QR"
          >
            <ImageIcon className="size-3.5 text-amber-400" />
            <span>Upload QR</span>
          </button>
        </div>
      )}
    </div>
  )
}
