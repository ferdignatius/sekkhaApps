// feature/events/components/QrScannerCamera
// Live Camera QR Code Scanner with auto-detection, camera switching, audio feedback, and fallback handling.

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import {
  CameraIcon,
  RefreshCwIcon,
  VideoOffIcon,
  CheckCircle2Icon,
  SparklesIcon,
} from "lucide-react"

interface QrScannerCameraProps {
  onScan: (decodedText: string) => void
  onError?: (errorMessage: string) => void
  isPaused?: boolean
  scanDelayMs?: number
}

// Synthesize a pleasant beep chime using Web Audio API
function playScanChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
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
}: QrScannerCameraProps) {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).substring(2, 9)}`).current
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const [isInitializing, setIsInitializing] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanningActive, setIsScanningActive] = useState(false)
  const [lastScannedText, setLastScannedText] = useState<string | null>(null)
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

      onScan(decodedText)
    },
    [onScan, scanDelayMs]
  )

  // Start Camera Stream
  const startCamera = useCallback(
    async (cameraIdOrFacing: string | { facingMode: "environment" | "user" }) => {
      if (!scannerRef.current) return

      try {
        setIsInitializing(true)
        setCameraError(null)

        // If scanner is already scanning, stop it first
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const qrEdge = Math.max(180, Math.floor(minEdge * 0.72))
            return { width: qrEdge, height: qrEdge }
          },
          aspectRatio: 1.0,
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
        let msg = "Gagal mengakses kamera. Pastikan izin kamera sudah diberikan di browser."
        if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
          msg = "Izin akses kamera ditolak. Harap izinkan akses kamera di pengaturan browser Anda."
        } else if (err?.name === "NotFoundError" || err?.message?.includes("NotFound")) {
          msg = "Kamera tidak ditemukan pada perangkat Anda."
        }
        setCameraError(msg)
        setIsScanningActive(false)
        setIsInitializing(false)
        if (onError) onError(msg)
      }
    },
    [handleDecoded, onError]
  )

  // Initialize Html5Qrcode and get camera list
  useEffect(() => {
    let isMounted = true
    const html5QrCode = new Html5Qrcode(containerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    })
    scannerRef.current = html5QrCode

    async function init() {
      try {
        setIsInitializing(true)
        const devices = await Html5Qrcode.getCameras()
        if (!isMounted) return

        if (devices && devices.length > 0) {
          setCameras(devices)
          // Prefer back camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          )
          const chosenId = backCam ? backCam.id : devices[0]!.id
          setSelectedCameraId(chosenId)
          await startCamera(chosenId)
        } else {
          // Fallback to environment facing mode
          await startCamera({ facingMode: "environment" })
        }
      } catch (err: any) {
        console.warn("Gagal mendeteksi daftar kamera, mencoba facingMode environment:", err)
        if (isMounted) {
          await startCamera({ facingMode: "environment" })
        }
      }
    }

    init()

    return () => {
      isMounted = false
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

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-sekkha-hairline bg-slate-950 p-2 shadow-inner">
      {/* Camera Video Viewport Container */}
      <div className="relative w-full aspect-square max-h-[320px] overflow-hidden rounded-xl bg-black flex items-center justify-center">
        {/* Html5Qrcode target DOM element */}
        <div id={containerId} className="w-full h-full object-cover [&_video]:object-cover [&_video]:rounded-xl" />

        {/* Loading Spinner */}
        {isInitializing && !cameraError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-2 backdrop-blur-xs">
            <RefreshCwIcon className="size-7 animate-spin text-sekkha-brand-blue" />
            <p className="text-caption font-medium">Menghubungkan ke kamera...</p>
          </div>
        )}

        {/* Camera Permission / Device Error */}
        {cameraError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <VideoOffIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-caption-bold text-rose-300">Akses Kamera Gagal</p>
              <p className="text-micro text-slate-400 max-w-xs">{cameraError}</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-3.5 py-2 text-micro-bold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              <RefreshCwIcon className="size-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Live Visual Overlay (Target Frame & Animated Laser) */}
        {!isInitializing && !cameraError && isScanningActive && !isPaused && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {/* Viewfinder Target Box */}
            <div className="relative size-[65%] max-size-[220px] rounded-2xl border-2 border-sekkha-brand-blue/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 size-4 border-t-3 border-l-3 border-white rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 size-4 border-t-3 border-r-3 border-white rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 size-4 border-b-3 border-l-3 border-white rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 size-4 border-b-3 border-r-3 border-white rounded-br-sm" />

              {/* Animated Laser Scan Line */}
              <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-bounce" />

              {/* Center Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 text-white">
                <SparklesIcon className="size-5" />
              </div>
            </div>

            {/* Bottom Status Tip */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="rounded-full bg-black/60 px-3 py-1 text-micro font-medium text-white/90 backdrop-blur-xs">
                Arahkan QR ke dalam kotak
              </span>
            </div>
          </div>
        )}

        {/* Scan Success Pulse Overlay */}
        {lastScannedText && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-emerald-950/80 text-emerald-300 gap-2 backdrop-blur-xs animate-in fade-in zoom-in duration-200">
            <CheckCircle2Icon className="size-12 text-emerald-400 animate-bounce" />
            <p className="text-caption-bold text-white">QR Berhasil Terdeteksi!</p>
          </div>
        )}
      </div>

      {/* Camera Controls Footer */}
      {cameras.length > 1 && (
        <div className="mt-2 flex w-full items-center justify-between gap-2 px-1 text-white">
          <label htmlFor="camera-select" className="flex items-center gap-1 text-micro font-semibold text-slate-400">
            <CameraIcon className="size-3.5" />
            <span>Kamera:</span>
          </label>
          <select
            id="camera-select"
            value={selectedCameraId}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-micro text-slate-200 outline-none focus:border-sekkha-brand-blue"
          >
            {cameras.map((cam, idx) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Kamera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
